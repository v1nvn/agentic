#!/usr/bin/env node
// Time tree, token ledger, cost and violation candidates for a finished Claude
// Code session.
//
// Usage: node analyze.mjs <session.jsonl> <gate-pattern>
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const SLEEP = /\bsleep\b/;
const CACHE_TTL = 300000;
const EDITS = new Set(['Edit', 'Write', 'NotebookEdit']);
const TOLLED = new Set(['attachment', 'meta', 'queue']);
const ORCHESTRATOR = 'orchestrator';
const BASH_TIMEOUT = 120000;
const STALL_SLACK = 60000;
const RULE = {
  foregroundSuite:
    'run: the orchestrator starts every long-running command in the background',
  stalled: 'builder: pass the Bash `timeout` the gate ceiling sets',
  reviewerSuite: 'reviewer: never run a build or a test suite',
  sleepPoll: 'builder: never poll with `sleep`',
  reshape: 'builder: never re-run a suite to re-shape its output',
  coldResume: 'run: a worker idle five minutes without a hold is never resumed',
  serializedTail: 'a lever, not a rule: other work could have run beside it',
};

const ts = s => new Date(s).getTime();
const mins = ms => ms / 60000;
const fmt = ms =>
  ms >= 60000 ? `${mins(ms).toFixed(1)}m` : `${(ms / 1000).toFixed(0)}s`;
const hhmm = ms => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const tok = t =>
  t >= 1e6 ? `${(t / 1e6).toFixed(1)}M` : `${(t / 1e3).toFixed(1)}k`;
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');

function spanUnion(spans) {
  let covered = -Infinity;
  let total = 0;
  for (const [s, e] of [...spans].sort((a, b) => a[0] - b[0])) {
    if (e <= covered) continue;
    total += e - Math.max(s, covered);
    covered = e;
  }
  return total;
}

function records(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // partial line from a live session — skip it
    }
  }
  return out;
}

const timeline = recs =>
  recs
    .filter(e => e.timestamp)
    .sort((a, b) => ts(a.timestamp) - ts(b.timestamp));
const load = path => timeline(records(path));

function blocks(e) {
  const c = e?.message?.content;
  return Array.isArray(c) ? c : [];
}

function kind(e) {
  if (e.type === 'user') {
    if (blocks(e).some(b => b?.type === 'tool_result')) return 'tool_result';
    if (e?.origin?.kind === 'human') return 'human';
    return 'user_other';
  }
  if (e.type === 'assistant') {
    return blocks(e).some(b => b?.type === 'tool_use')
      ? 'tool_use'
      : 'asst_text';
  }
  if (['attachment', 'system', 'queue-operation'].includes(e.type)) {
    return e.type === 'queue-operation' ? 'queue' : e.type;
  }
  return 'meta';
}

function bgNotification(e) {
  if (e.type === 'queue-operation' && e.operation === 'enqueue')
    return String(e.content ?? '');
  if (kind(e) === 'user_other' && typeof e.message?.content === 'string') {
    return e.message.content.includes('tool-use-id>')
      ? e.message.content
      : null;
  }
  return null;
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// One model call streams as several assistant records sharing a message.id;
// the record carrying cache_read_input_tokens holds the billed usage.
function ledger(events) {
  const calls = new Map();
  for (const e of events) {
    const id = e.type === 'assistant' && e.message?.id;
    if (!id) continue;
    const u = e.message.usage;
    const prev = calls.get(id);
    const billed = u && 'cache_read_input_tokens' in u;
    if (!prev || (billed && (!prev.billed || (u.input_tokens ?? 0) > 0)))
      calls.set(id, { u: u ?? {}, billed });
  }
  const sum = {
    calls: calls.size,
    input: 0,
    cacheRead: 0,
    cacheCreate: 0,
    output: 0,
  };
  const ctx = [];
  const reads = [];
  for (const { u } of calls.values()) {
    reads.push(u.cache_read_input_tokens ?? 0);
    sum.input += u.input_tokens ?? 0;
    sum.cacheRead += u.cache_read_input_tokens ?? 0;
    sum.cacheCreate += u.cache_creation_input_tokens ?? 0;
    sum.output += u.output_tokens ?? 0;
    ctx.push(
      (u.input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0),
    );
  }
  return {
    ...sum,
    firstCtx: ctx[0] ?? 0,
    maxCtx: Math.max(0, ...ctx),
    standing: sum.cacheRead - (reads[0] ?? 0),
  };
}

function toolRuns(events) {
  const pending = new Map();
  const runs = [];
  for (const e of events) {
    const t = ts(e.timestamp);
    for (const b of blocks(e)) {
      if (b?.type === 'tool_use') pending.set(b.id, { t, b });
    }
    if (kind(e) !== 'tool_result') continue;
    for (const b of blocks(e)) {
      const p = pending.get(b?.tool_use_id);
      if (!p) continue;
      runs.push({
        start: p.t,
        dur: t - p.t,
        name: p.b.name,
        input: p.b.input ?? {},
      });
      pending.delete(b.tool_use_id);
    }
  }
  return runs;
}

const bashOf = runs =>
  runs
    .filter(r => r.name === 'Bash')
    .map(r => ({
      start: r.start,
      dur: r.dur,
      cmd: String(r.input.command ?? ''),
      bg: Boolean(r.input.run_in_background),
    }));

// The harness moves a foreground Bash call past its timeout to the background,
// so a result arriving well after that timeout is a stalled host, not work.
const stalled = runs =>
  runs.filter(
    r =>
      r.name === 'Bash' &&
      !r.input.run_in_background &&
      r.dur > (r.input.timeout ?? BASH_TIMEOUT) + STALL_SLACK,
  );

function main(transcript, suiteSrc) {
  const SUITE = new RegExp(suiteSrc);
  const recs = records(transcript);
  const ev = timeline(recs);
  if (!ev.length) throw new Error(`no timestamped events in ${transcript}`);
  const end = ts(ev.at(-1).timestamp);
  const wall = end - ts(ev[0].timestamp);

  // Owner wait: the gap before a human message, folding the attachment and
  // queue events that sit directly before it.
  let ownerWait = 0;
  for (const [i, e] of ev.entries()) {
    if (kind(e) !== 'human') continue;
    let j = i - 1;
    while (j >= 0 && TOLLED.has(kind(ev[j]))) j--;
    if (j >= 0) ownerWait += ts(e.timestamp) - ts(ev[j].timestamp);
  }

  // Background spawns complete at their task notification, not their tool_result.
  const spawns = new Map();
  const completions = new Map();
  for (const e of ev) {
    const t = ts(e.timestamp);
    for (const b of blocks(e)) {
      if (b?.type !== 'tool_use') continue;
      if (b.name === 'Agent') {
        spawns.set(b.id, { t, label: `agent: ${b.input?.description ?? '?'}` });
      } else if (b.name === 'Bash' && b.input?.run_in_background) {
        spawns.set(b.id, {
          t,
          label: `bg-bash: ${String(b.input?.command ?? '').slice(0, 70)}`,
        });
      }
    }
    const note = bgNotification(e);
    if (note) {
      const m = note.match(/tool-use-id>\s*([A-Za-z0-9_-]+)/);
      if (m && spawns.has(m[1]) && !completions.has(m[1]))
        completions.set(m[1], t);
    }
  }
  const bg = [...spawns.entries()].map(([id, s]) => ({
    start: s.t,
    end: completions.get(id) ?? end,
    label: s.label,
  }));
  const orchRuns = toolRuns(ev);
  const questions = orchRuns.filter(r => r.name === 'AskUserQuestion');
  ownerWait += questions.reduce((a, r) => a + r.dur, 0);
  const fgTools = orchRuns
    .filter(
      r =>
        !(
          r.name === 'Agent' ||
          r.name === 'AskUserQuestion' ||
          (r.name === 'Bash' && r.input.run_in_background)
        ),
    )
    .reduce((a, r) => a + r.dur, 0);

  // A gap before an assistant message that background work fully covered is
  // orchestrator wait, not generation.
  let gen = 0;
  let wait = 0;
  for (const [i, e] of ev.entries()) {
    if (i === 0 || !['tool_use', 'asst_text'].includes(kind(e))) continue;
    const prev = ts(ev[i - 1].timestamp);
    const cur = ts(e.timestamp);
    const clips = bg
      .map(s => [Math.max(prev, s.start), Math.min(cur, s.end)])
      .filter(([s, e2]) => e2 > s);
    if (clips.length && spanUnion(clips) === cur - prev) wait += cur - prev;
    else gen += cur - prev;
  }

  const workers = [];
  const dir = join(
    dirname(transcript),
    basename(transcript).replace(/\.jsonl$/, ''),
    'subagents',
  );
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)
      .filter(n => n.endsWith('.meta.json'))
      .sort()) {
      const wpath = join(dir, name.replace(/\.meta\.json$/, '.jsonl'));
      if (!existsSync(wpath)) continue;
      const meta = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      const wev = load(wpath);
      if (!wev.length) continue;
      const w0 = ts(wev[0].timestamp);
      const w1 = ts(wev.at(-1).timestamp);
      let wgen = 0;
      const gaps = [];
      for (const [i, e] of wev.entries()) {
        if (i > 0 && ['tool_use', 'asst_text'].includes(kind(e))) {
          const g = ts(e.timestamp) - ts(wev[i - 1].timestamp);
          wgen += g;
          gaps.push(g);
        }
      }
      const runs = toolRuns(wev);
      const resumes = [];
      for (const [i, e] of wev.entries()) {
        if (i === 0 || !['user_other', 'human'].includes(kind(e))) continue;
        const idle = ts(e.timestamp) - ts(wev[i - 1].timestamp);
        if (idle >= CACHE_TTL) resumes.push({ at: ts(e.timestamp), idle });
      }
      workers.push({
        desc: meta.description ?? '?',
        type: meta.agentType ?? '?',
        model:
          wev.findLast(e => e.message?.model)?.message.model ??
          meta.model ??
          '?',
        effort: wev.findLast(e => e.effort)?.effort ?? meta.effort ?? '?',
        start: w0,
        end: w1,
        wall: w1 - w0,
        gen: wgen,
        gaps,
        runs,
        bash: bashOf(runs),
        resumes,
        usage: ledger(wev),
        firstEdit: Math.min(
          ...runs.filter(r => EDITS.has(r.name)).map(r => r.start - w0),
        ),
      });
    }
  }

  const stalls = [
    ...stalled(orchRuns).map(r => ({ who: ORCHESTRATOR, r })),
    ...workers.flatMap(w => stalled(w.runs).map(r => ({ who: w.desc, r }))),
  ];
  const stallTime = spanUnion(
    stalls.map(({ r }) => [r.start, r.start + r.dur]),
  );

  console.log('# postmortem\n');
  console.log(
    `session ${basename(transcript)}  wall ${fmt(wall)}  owner wait ${fmt(ownerWait)}  stalls ${fmt(stallTime)}  orchestrator gen ${fmt(gen)}  orchestrator wait ${fmt(wait)}  foreground tools ${fmt(fgTools)}\n`,
  );

  console.log('## workers\n');
  console.log(
    '| start-end | wall | to first edit | gen | tools | type | model | effort | calls | median gap | worker |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  const byStart = [...workers].sort((a, b) => a.start - b.start);
  for (const w of byStart) {
    console.log(
      `| ${hhmm(w.start)}-${hhmm(w.end)} | ${fmt(w.wall)} | ${Number.isFinite(w.firstEdit) ? fmt(w.firstEdit) : '-'} | ${fmt(w.gen)} | ${fmt(w.wall - w.gen)} | ${w.type} | ${w.model} | ${w.effort} | ${w.usage.calls} | ${(median(w.gaps) / 1000).toFixed(1)}s | ${w.desc} |`,
    );
  }

  console.log('\n## token ledger\n');
  console.log(
    '| agent | calls | input | cache rd | cache cr | out | 1st ctx | max ctx | hit |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|');
  const rows = [{ desc: ORCHESTRATOR, usage: ledger(ev) }, ...byStart];
  const total = {
    calls: 0,
    input: 0,
    cacheRead: 0,
    cacheCreate: 0,
    output: 0,
    standing: 0,
  };
  for (const { desc, usage: u } of rows) {
    for (const k of Object.keys(total)) total[k] += u[k];
    console.log(
      `| ${desc} | ${u.calls} | ${tok(u.input)} | ${tok(u.cacheRead)} | ${tok(u.cacheCreate)} | ${tok(u.output)} | ${tok(u.firstCtx)} | ${tok(u.maxCtx)} | ${pct(u.cacheRead, u.cacheRead + u.input + u.cacheCreate)} |`,
    );
  }
  const ingested = total.input + total.cacheRead + total.cacheCreate;
  console.log(
    `| total | ${total.calls} | ${tok(total.input)} | ${tok(total.cacheRead)} | ${tok(total.cacheCreate)} | ${tok(total.output)} | | | ${pct(total.cacheRead, ingested)} |`,
  );
  console.log(
    `\nread : write ${Math.round(ingested / Math.max(1, total.output))}:1  standing context (cache reads after each agent's first call) ${pct(total.standing, ingested)} of ingested`,
  );

  console.log('\n## cost\n');
  const cost = recs.findLast(e => e.type === 'cost-state');
  if (cost) {
    console.log(
      `$${cost.totalCostUSD.toFixed(2)} total (harness cost-state; counts retries the transcripts do not)\n`,
    );
    console.log('| model | input | cache rd | cache cr | out | cost |');
    console.log('|---|---|---|---|---|---|');
    for (const [m, u] of Object.entries(cost.modelUsage ?? {})) {
      console.log(
        `| ${m} | ${tok(u.inputTokens)} | ${tok(u.cacheReadInputTokens)} | ${tok(u.cacheCreationInputTokens)} | ${tok(u.outputTokens)} | $${u.costUSD.toFixed(2)} |`,
      );
    }
  } else {
    console.log('no cost-state record — the session has not exited');
  }

  console.log('\n## Bash time by category\n');
  const cats = new Map();
  for (const { who, bash } of [
    { who: ORCHESTRATOR, bash: bashOf(orchRuns) },
    ...workers.map(w => ({ who: 'workers', bash: w.bash })),
  ]) {
    for (const b of bash) {
      const k = `${who}: ${
        SLEEP.test(b.cmd)
          ? 'sleep (waiting)'
          : SUITE.test(b.cmd)
            ? 'suite'
            : 'other'
      }`;
      const row = cats.get(k) ?? { n: 0, ms: 0 };
      cats.set(k, { n: row.n + 1, ms: row.ms + b.dur });
    }
  }
  console.log('| category | calls | time |');
  console.log('|---|---|---|');
  for (const [k, v] of [...cats.entries()].sort((a, b) => b[1].ms - a[1].ms)) {
    console.log(`| ${k} | ${v.n} | ${fmt(v.ms)} |`);
  }

  console.log('\n## files read by two or more agents\n');
  const readers = new Map();
  for (const { desc, runs } of [
    { desc: ORCHESTRATOR, runs: orchRuns },
    ...workers,
  ]) {
    for (const r of runs.filter(x => x.name === 'Read')) {
      const row = readers.get(r.input.file_path) ?? { who: new Set(), n: 0 };
      row.who.add(desc);
      row.n++;
      readers.set(r.input.file_path, row);
    }
  }
  const shared = [...readers.entries()]
    .filter(([, v]) => v.who.size >= 2)
    .sort((a, b) => b[1].who.size - a[1].who.size)
    .slice(0, 15);
  console.log('| agents | reads | file |');
  console.log('|---|---|---|');
  for (const [file, v] of shared)
    console.log(`| ${v.who.size} | ${v.n} | ${file} |`);

  console.log('\n## violation candidates\n');
  let flagged = false;
  const flag = (text, rule) => {
    flagged = true;
    console.log(`- ${text}  [${RULE[rule]}]`);
  };
  const norm = cmd => {
    const base = cmd.trim().replace(/^\s*cd\s+[^;]+;\s*/, '');
    const seg = base.split(';').find(s => SUITE.test(s)) ?? base;
    return seg.split('|')[0].trim();
  };
  const orchSuites = bashOf(orchRuns).filter(b => !b.bg && SUITE.test(b.cmd));
  if (orchSuites.length) {
    flag(
      `orchestrator ran a suite in the foreground: ${orchSuites.length} run(s), ${fmt(orchSuites.reduce((a, b) => a + b.dur, 0))}`,
      'foregroundSuite',
    );
  }
  for (const { who, r } of stalls) {
    flag(
      `stalled tool result: ${who} — \`${String(r.input.command).slice(0, 60)}\` returned after ${fmt(r.dur)} at ${hhmm(r.start)}; counted in stalls, not work`,
      'stalled',
    );
  }
  for (const w of workers) {
    const suites = w.bash.filter(b => SUITE.test(b.cmd));
    const sleeps = w.bash
      .filter(b => SLEEP.test(b.cmd))
      .sort((a, b) => a.start - b.start);
    if (sleeps.length >= 2 || sleeps.some(b => b.dur >= CACHE_TTL)) {
      flag(
        `sleep poll: ${w.desc} slept ${sleeps.length} times, ${fmt(sleeps.reduce((a, b) => a + b.dur, 0))} total — first at ${hhmm(sleeps[0].start)}: ${sleeps[0].cmd.slice(0, 60)}`,
        'sleepPoll',
      );
    }
    if (/review/i.test(`${w.type} ${w.desc}`) && suites.length) {
      flag(
        `suite run by a reviewer: ${w.desc} — ${suites.length} run(s), ${fmt(suites.reduce((a, b) => a + b.dur, 0))}`,
        'reviewerSuite',
      );
    }
    for (const { at, idle } of w.resumes) {
      flag(
        `cold resume: ${w.desc} continued at ${hhmm(at)} after ${fmt(idle)} idle`,
        'coldResume',
      );
    }
    const clusters = new Map();
    for (const b of suites) {
      const key = norm(b.cmd);
      clusters.set(
        key,
        [...(clusters.get(key) ?? []), b].sort((x, y) => x.start - y.start),
      );
    }
    for (const [key, runs] of clusters) {
      for (let i = 1; i < runs.length; i++) {
        if (runs[i].start - runs[i - 1].start >= 300000) continue;
        flag(
          `re-run to re-shape: ${w.desc} re-ran \`${key.slice(0, 60)}\` ${((runs[i].start - runs[i - 1].start) / 1000).toFixed(0)}s after a green run at ${hhmm(runs[i - 1].start)}`,
          'reshape',
        );
      }
    }
    for (const b of suites.filter(s => s.dur >= 60000)) {
      flagged = true;
      console.log(
        `  suite firing: ${hhmm(b.start)} ${fmt(b.dur)} ${w.desc} — ${b.cmd.slice(0, 80)}`,
      );
    }
  }

  // A serialized tail: a main-thread gap covered by exactly one background
  // span while no worker runs.
  const substantive = ev.filter(e => !TOLLED.has(kind(e)));
  for (const [i, e] of substantive.entries()) {
    if (i === 0) continue;
    const prev = substantive[i - 1];
    const gap = ts(e.timestamp) - ts(prev.timestamp);
    if (gap < 300000 || kind(e) === 'human') continue;
    const covered = bg.filter(
      s => s.start <= ts(prev.timestamp) && s.end >= ts(e.timestamp),
    );
    const busy = workers.some(
      w => w.end > ts(prev.timestamp) && w.start < ts(e.timestamp),
    );
    if (covered.length === 1 && !busy) {
      flag(
        `serialized tail: ${mins(gap).toFixed(0)}m idle ${hhmm(ts(prev.timestamp))}-${hhmm(ts(e.timestamp))} while only \`${covered[0].label.slice(0, 60)}\` ran`,
        'serializedTail',
      );
    }
  }

  if (!flagged) console.log('(none)');
  console.log(
    '\nmeasure limits: thinking is encrypted (generation = gap before an assistant message); parallel tools overlap; owner wait folds attachments before a human message and counts owner questions; a foreground Bash result past its timeout counts as a stall; a gap background work fully covered counts as orchestrator wait, partial coverage stays in gen; transcript token sums run below cost-state, which counts retries.',
  );
}

const [file, suiteSrc] = process.argv.slice(2);
if (!file || !suiteSrc) {
  console.error('usage: node analyze.mjs <session.jsonl> <gate-pattern>');
  process.exit(1);
}
main(file, suiteSrc);
