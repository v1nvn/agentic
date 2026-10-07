#!/usr/bin/env node
// Time tree and violation candidates for a finished Claude Code session.
//
// Usage: node analyze.mjs <session.jsonl>
//
// Prints markdown. Timestamp deltas are the measure: generation time is the gap
// before an assistant message (thinking is encrypted); parallel tools overlap.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const SUITE =
  /(?:cargo\s+test\s+--workspace|make\s+test[\w-]*|cargo\s+test\s+[^|]*--workspace)/;
const SLEEP = /\bsleep\s+(\d+)/;
const TOLLED = new Set(['attachment', 'meta', 'queue']);

const ts = s => new Date(s).getTime();
const mins = ms => ms / 60000;
const fmt = ms =>
  ms >= 60000 ? `${mins(ms).toFixed(1)}m` : `${(ms / 1000).toFixed(0)}s`;
const hhmm = ms => new Date(ms).toISOString().slice(11, 16);

function load(path) {
  const events = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      const e = JSON.parse(line);
      if (e.timestamp) events.push(e);
    } catch {
      // partial line from a live session — skip it
    }
  }
  return events.sort((a, b) => ts(a.timestamp) - ts(b.timestamp));
}

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

function main(transcript) {
  const ev = load(transcript);
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

  let gen = 0;
  for (const [i, e] of ev.entries()) {
    if (i > 0 && ['tool_use', 'asst_text'].includes(kind(e))) {
      gen += ts(e.timestamp) - ts(ev[i - 1].timestamp);
    }
  }

  // Background spawns complete at their task notification; everything else
  // pairs tool_use with tool_result in its own transcript.
  const spawns = new Map();
  const pending = new Map();
  const fgTools = new Map();
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
      } else {
        pending.set(b.id, t);
      }
    }
    if (kind(e) === 'tool_result') {
      for (const b of blocks(e)) {
        if (b?.tool_use_id && pending.has(b.tool_use_id)) {
          fgTools.set(
            'tools',
            (fgTools.get('tools') ?? 0) + (t - pending.get(b.tool_use_id)),
          );
          pending.delete(b.tool_use_id);
        }
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

  const workers = [];
  const dir = join(
    dirname(transcript),
    basename(transcript).replace(/\.jsonl$/, ''),
    'subagents',
  );
  for (const name of readdirSync(dir)
    .filter(n => n.endsWith('.meta.json'))
    .sort()) {
    const meta = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    const wev = load(join(dir, name.replace(/\.meta\.json$/, '.jsonl')));
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
    const bashPending = new Map();
    const usage = { input: 0, cacheRead: 0, cacheCreate: 0, output: 0 };
    const bash = [];
    let turns = 0;
    for (const e of wev) {
      const t = ts(e.timestamp);
      if (e.type === 'assistant') {
        turns++;
        usage.input += e.message?.usage?.input_tokens ?? 0;
        usage.cacheRead += e.message?.usage?.cache_read_input_tokens ?? 0;
        usage.cacheCreate += e.message?.usage?.cache_creation_input_tokens ?? 0;
        usage.output += e.message?.usage?.output_tokens ?? 0;
      }
      for (const b of blocks(e)) {
        if (b?.type === 'tool_use' && b.name === 'Bash') {
          bashPending.set(b.id, { t, cmd: String(b.input?.command ?? '') });
        }
      }
      if (kind(e) === 'tool_result') {
        for (const b of blocks(e)) {
          const p = bashPending.get(b?.tool_use_id);
          if (p) {
            bash.push({ start: p.t, dur: t - p.t, cmd: p.cmd });
            bashPending.delete(b.tool_use_id);
          }
        }
      }
    }
    workers.push({
      desc: meta.description ?? '?',
      model: meta.model ?? '?',
      start: w0,
      end: w1,
      wall: w1 - w0,
      gen: wgen,
      turns,
      gaps,
      bash,
      usage,
    });
  }

  console.log('# postmortem\n');
  console.log(
    `session ${basename(transcript)}  wall ${fmt(wall)}  owner wait ${fmt(ownerWait)}  orchestrator gen ${fmt(gen)}  foreground tools ${fmt(fgTools.get('tools') ?? 0)}\n`,
  );

  console.log('## workers\n');
  console.log(
    '| start-end | wall | gen | tools | model | turns | median gap | out tok | worker |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const w of [...workers].sort((a, b) => a.start - b.start)) {
    console.log(
      `| ${hhmm(w.start)}-${hhmm(w.end)} | ${fmt(w.wall)} | ${fmt(w.gen)} | ${fmt(w.wall - w.gen)} | ${w.model} | ${w.turns} | ${(median(w.gaps) / 1000).toFixed(1)}s | ${(w.usage.output / 1000).toFixed(1)}k | ${w.desc} |`,
    );
  }

  console.log('\n## background spans\n');
  console.log('| start-end | duration | overlapped by workers | what |');
  console.log('|---|---|---|---|');
  for (const s of [...bg].sort((a, b) => a.start - b.start)) {
    const overlap = workers.reduce(
      (acc, w) =>
        acc + Math.max(0, Math.min(s.end, w.end) - Math.max(s.start, w.start)),
      0,
    );
    console.log(
      `| ${hhmm(s.start)}-${hhmm(s.end)} | ${fmt(s.end - s.start)} | ${fmt(overlap)} | ${s.label} |`,
    );
  }

  console.log('\n## worker Bash time by category\n');
  const cats = new Map();
  for (const w of workers) {
    for (const b of w.bash) {
      const c = b.cmd.toLowerCase();
      const k = SLEEP.test(b.cmd)
        ? 'sleep (waiting)'
        : SUITE.test(b.cmd)
          ? 'full suite'
          : /cargo\s+test\b/.test(c)
            ? 'scoped cargo test'
            : /cargo\s+(check|build)/.test(c)
              ? 'cargo check/build'
              : /cargo\s+lint|clippy/.test(c)
                ? 'cargo lint'
                : /cargo\s+fmt|cargo-sort|forbid|cargo\s+doc/.test(c)
                  ? 'fmt/sort/forbid/doc'
                  : 'other';
      const row = cats.get(k) ?? { n: 0, ms: 0 };
      cats.set(k, { n: row.n + 1, ms: row.ms + b.dur });
    }
  }
  console.log('| category | calls | time |');
  console.log('|---|---|---|');
  for (const [k, v] of [...cats.entries()].sort((a, b) => b[1].ms - a[1].ms)) {
    console.log(`| ${k} | ${v.n} | ${fmt(v.ms)} |`);
  }

  console.log('\n## violation candidates\n');
  let flagged = false;
  const norm = cmd => {
    const base = cmd.trim().replace(/^\s*cd\s+[^;]+;\s*/, '');
    const seg = base.split(';').find(s => SUITE.test(s)) ?? base;
    return seg.split('|')[0].trim();
  };
  for (const w of workers) {
    const suites = w.bash.filter(b => SUITE.test(b.cmd));
    for (const b of w.bash) {
      const m = b.cmd.match(SLEEP);
      if (m && Number(m[1]) >= 5) {
        flagged = true;
        console.log(
          `- sleep poll: ${w.desc} slept ${m[1]}s at ${hhmm(b.start)} — ${b.cmd.slice(0, 80)}`,
        );
      }
    }
    if (/review/i.test(w.desc) && suites.length) {
      flagged = true;
      console.log(
        `- reviewer ran a suite: ${w.desc} — ${suites.length} run(s), ${fmt(suites.reduce((a, b) => a + b.dur, 0))}`,
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
      const [first, second] = runs;
      if (second && second.start - first.start < 300000) {
        flagged = true;
        console.log(
          `- re-run to re-shape: ${w.desc} re-ran \`${key.slice(0, 60)}\` ${((second.start - first.start) / 1000).toFixed(0)}s after a green run at ${hhmm(first.start)}`,
        );
      }
    }
    for (const b of suites.filter(s => s.dur >= 60000)) {
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
      flagged = true;
      console.log(
        `- serialized tail: ${mins(gap).toFixed(0)}m idle ${hhmm(ts(prev.timestamp))}-${hhmm(ts(e.timestamp))} while only \`${covered[0].label.slice(0, 60)}\` ran`,
      );
    }
  }

  if (!flagged) console.log('(none)');
  console.log(
    '\nmeasure limits: thinking is encrypted (generation = gap before an assistant message); parallel tools overlap; owner wait folds attachments before a human message.',
  );
}

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node analyze.mjs <session.jsonl>');
  process.exit(1);
}
main(file);
