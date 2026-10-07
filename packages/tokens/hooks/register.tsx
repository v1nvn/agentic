/**
 * The tokens mod. /tokens-usage opens the account report as a pane — one
 * bin/report.mjs --json exec, drawn as the CLI's own ink-tagged lines from
 * src/format.ts. /tokens-top draws the live session — engine-pushed measures,
 * streaming chunks, the agent roster — redrawn as they arrive: no exec, no
 * polling, one clock tick aging the rate ring while the pane is open.
 */

import { atom, read, update } from 'claude-code';

import type { ScanResult } from '../src/aggregate.js';
import type { Line } from '../src/text.js';
import type {
  TopFlow,
  TopMeasure,
  TopNotices,
  TopRunning,
  TopState,
} from '../src/top.js';

import { reportLines } from '../src/format.js';
import { emptyTop, topLines } from '../src/top.js';

import type {
  Elements,
  EngineInterface,
  On,
  ToolCallResult,
} from 'claude-code';

const PANE = 'tokens-usage';
const REFRESH_MS = 5 * 60 * 1000;
const ACCENT = 'cyan';

const TOP = 'tokens-top';
const TICK_MS = 500;
const RING_MAX = 120;
const AGENT_RING_MAX = 24;
const EST_CHARS_PER_TOKEN = 4;

const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | ScanResult,
);
const top = atom(
  { plugin: 'tokens', key: 'top' } as const,
  null as null | TopState,
);

let accOut = 0;
let accThink = 0;
const accAgent = new Map<string, number>();
const agentRings = new Map<string, number[]>();
const spawnAt = new Map<string, number>();
let lastTickAt = 0;
let inSum = 0;
let readSum = 0;
let writeSum = 0;

function est(text: string): number {
  return Math.ceil(text.length / EST_CHARS_PER_TOKEN);
}

function withTop(
  s: null | TopState,
  patch: (t: TopState) => TopState,
): TopState {
  return patch(s ?? emptyTop());
}

function withFlow(
  s: null | TopState,
  patch: (f: TopFlow) => TopFlow,
): TopState {
  return withTop(s, t => ({ ...t, flow: patch(t.flow) }));
}

function withRunning(
  s: null | TopState,
  patch: (r: TopRunning) => TopRunning,
): TopState {
  return withTop(s, t => ({ ...t, running: patch(t.running) }));
}

function withNotices(
  s: null | TopState,
  patch: (n: TopNotices) => TopNotices,
): TopState {
  return withTop(s, t => ({ ...t, notices: patch(t.notices) }));
}

function callLabel(e: { tool: string }): string {
  const rec = e as Record<string, unknown>;
  for (const key of [
    'command',
    'file_path',
    'pattern',
    'url',
    'query',
    'path',
    'description',
  ]) {
    const v = rec[key];
    if (typeof v === 'string' && v !== '') {
      return v;
    }
  }
  return '';
}

async function scanUsage(
  $: EngineInterface,
): Promise<{ call: ToolCallResult; scan: null | ScanResult }> {
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/bin/report.mjs usage --json`,
  });
  const scan = parsedScan(call);
  if (scan !== null) {
    await update($, usage, () => scan);
  }
  return { call, scan };
}

function parsedScan(call: ToolCallResult): null | ScanResult {
  if (call.deny !== undefined || call.isError === true) {
    return null;
  }
  const result = call.result as null | { stdout?: unknown };
  try {
    const parsed = JSON.parse(
      typeof result?.stdout === 'string' ? result.stdout : '',
    ) as ScanResult;
    return Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

async function refreshIfOpen($: EngineInterface): Promise<void> {
  const open = await $.ui.panes();
  if (open.some(p => p.id === PANE)) {
    await scanUsage($);
  }
}

/** Ages the rate ring: one sample of the accumulators, only while the pane shows. */
async function topTick($: EngineInterface): Promise<void> {
  const open = await $.ui.panes();
  if (!open.some(p => p.id === TOP)) {
    return;
  }
  const now = await $.clock.now();
  const dt = lastTickAt === 0 ? 0 : (now - lastTickAt) / 1000;
  lastTickAt = now;
  const outSample = accOut;
  const thinkSample = accThink;
  accOut = 0;
  accThink = 0;

  const roster = await $.agent.list();
  const live = new Set(roster.map(a => a.id));
  for (const id of [...spawnAt.keys()]) {
    if (!live.has(id)) {
      spawnAt.delete(id);
      agentRings.delete(id);
    }
  }
  const agents = roster.map(a => {
    const n = accAgent.get(a.id) ?? 0;
    const ring = [...(agentRings.get(a.id) ?? []), n].slice(-AGENT_RING_MAX);
    agentRings.set(a.id, ring);
    return { id: a.id, ring, rate: dt > 0 ? n / dt : 0 };
  });
  for (const id of [...accAgent.keys()]) {
    accAgent.set(id, 0);
  }

  await update($, top, s =>
    withTop(s, t => ({
      ...t,
      spawns: [...spawnAt.entries()].map(([id, at]) => ({ id, at })),
      flow: {
        ...t.flow,
        outRing: [...t.flow.outRing, outSample].slice(-RING_MAX),
        thinkRing: [...t.flow.thinkRing, thinkSample].slice(-RING_MAX),
        outRate: dt > 0 ? outSample / dt : 0,
        thinkRate: dt > 0 ? thinkSample / dt : 0,
        agents,
      },
    })),
  );
}

function draw(
  t: Pick<Elements['terminal'], 'Box' | 'Text'>,
  lines: readonly Line[],
): ReturnType<Elements['terminal']['Box']> {
  const { Box, Text } = t;
  return (
    <Box
      borderColor={ACCENT}
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      {lines.map((line, i) => (
        <Text key={`l${i}`} wrap="truncate-end">
          {line.map((seg, j) => (
            <Text
              bold={seg.ink === 'bold'}
              dimColor={seg.ink === 'dim'}
              key={`s${j}`}
            >
              {seg.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens-usage',
      description:
        'Token usage — per-model 24h mix and 7-day dailies, as a pane',
    });
    await $.command.register({
      name: 'tokens-top',
      description:
        'This session live — context, flow, limits, agents, as a pane',
    });
    $.clock.every(REFRESH_MS, () => void refreshIfOpen($));
    $.clock.every(TICK_MS, () => void topTick($));
    return next(e);
  });

  on('command.run', { command: 'tokens-usage' }, async $ => {
    const { call, scan } = await scanUsage($);
    if (scan === null) {
      $.ui.log(lineOf(call));
      return {};
    }
    const lines = reportLines(scan, { now: new Date(scan.now) });
    await $.ui.open({ id: PANE, title: 'Token usage', rows: lines.length + 2 });
    return {};
  });

  on('command.run', { command: 'tokens-top' }, async $ => {
    await $.ui.open({ id: TOP, title: 'Session' });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, usage);
    if (!s) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>(no usage report)</Text>;
    }
    return draw($.ui.resolve(e), reportLines(s, { now: new Date(s.now) }));
  });

  on('ui.render', { component: 'Pane', requestId: TOP }, async ($, e) => {
    const [state, model, version, cwd, turns, surfaces, roster] =
      await Promise.all([
        read($, top),
        $.session.model(),
        $.session.version(),
        $.session.cwd(),
        $.session.turns(),
        $.session.surfaces(),
        $.agent.list(),
      ]);
    const now = await $.clock.now();
    const lines = topLines(
      state,
      {
        model,
        version: version.version,
        cwd,
        turns,
        surfaces: [...surfaces],
        agents: roster.map(a => ({
          id: a.id,
          type: a.type,
          status: a.status,
          name: a.name ?? null,
          description: a.description,
        })),
      },
      { now },
    );
    return draw($.ui.resolve(e), lines);
  });

  on('session.measure', async ($, e, next) => {
    const u = await $.session.usage({ breakdown: 'full' });
    const b = u.context.breakdown ?? null;
    const mcp = new Map<string, number>();
    for (const t of b?.mcpTools ?? []) {
      mcp.set(t.serverName, (mcp.get(t.serverName) ?? 0) + t.tokens);
    }
    const measure: TopMeasure = {
      at: await $.clock.now(),
      model: b?.model ?? null,
      startedAt: u.startedAt,
      tokens: u.context.tokens ?? null,
      window: u.context.window,
      percent: u.context.percent ?? null,
      compactAt: b?.autoCompactThreshold ?? null,
      costUsd: u.cost?.usd ?? null,
      rateLimits: u.rateLimits.map(r => ({
        kind: r.kind,
        percentUsed: r.percentUsed,
        resetsAt: r.resetsAt ? Date.parse(r.resetsAt) : null,
      })),
      categories: (b?.categories ?? []).map(c => ({
        name: c.name,
        tokens: c.tokens,
        kind: c.kind,
      })),
      mcp: [...mcp.entries()]
        .map(([server, tokens]) => ({ server, tokens }))
        .sort((x, y) => y.tokens - x.tokens),
      memory: (b?.memoryFiles ?? [])
        .map(f => ({ path: f.path, tokens: f.tokens }))
        .sort((x, y) => y.tokens - x.tokens),
    };
    await update($, top, s => ({ ...(s ?? emptyTop()), measure }));
    return next(e);
  });

  on('turn.step', async function* ($, e, next) {
    const started = await $.clock.now();
    let firstChunkMs: null | number = null;
    for await (const chunk of next(e)) {
      if (chunk.kind === 'text' || chunk.kind === 'thinking') {
        const n = est(chunk.text);
        if (firstChunkMs === null) {
          firstChunkMs = (await $.clock.now()) - started;
        }
        if (chunk.kind === 'text') {
          accOut += n;
        } else {
          accThink += n;
        }
        if (e.agentId !== undefined) {
          accAgent.set(e.agentId, (accAgent.get(e.agentId) ?? 0) + n);
        }
      }
      if (chunk.kind === 'stop' && chunk.usage) {
        const u = chunk.usage;
        inSum += u.input_tokens;
        readSum += u.cache_read_input_tokens;
        writeSum += u.cache_creation_input_tokens;
        const total = inSum + readSum + writeSum;
        const hit = total > 0 ? (readSum / total) * 100 : null;
        await update($, top, s =>
          withFlow(s, f => ({
            ...f,
            hit,
            firstChunkMs,
            usage: {
              input: u.input_tokens,
              output: u.output_tokens,
              cacheRead: u.cache_read_input_tokens,
              cacheWrite: u.cache_creation_input_tokens,
            },
          })),
        );
      }
      yield chunk;
    }
  });

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e);
    await update($, top, s =>
      withFlow(s, f => ({ ...f, turnMs: e.durationMs, turnEnd: e.reason })),
    );
    return ran;
  });

  on('tool.call', async ($, e, next) => {
    const call = { tool: e.tool, label: callLabel(e), at: await $.clock.now() };
    await update($, top, s =>
      withRunning(s, r => ({ ...r, calls: [...r.calls, call] })),
    );
    const ran = await next(e);
    await update($, top, s =>
      withRunning(s, r => ({ ...r, calls: r.calls.filter(c => c !== call) })),
    );
    return ran;
  });

  on('process.spawn', async function* ($, e, next) {
    const child = { argv: e.argv.join(' '), at: await $.clock.now() };
    await update($, top, s =>
      withRunning(s, r => ({ ...r, children: [...r.children, child] })),
    );
    try {
      for await (const chunk of next(e)) {
        yield chunk;
      }
    } finally {
      await update($, top, s =>
        withRunning(s, r => ({
          ...r,
          children: r.children.filter(c => c !== child),
        })),
      );
    }
  });

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e);
    if (ran.agentId !== undefined) {
      spawnAt.set(ran.agentId, await $.clock.now());
    }
    return ran;
  });

  on('session.receive', async ($, e, next) => {
    const at = await $.clock.now();
    await update($, top, s =>
      withNotices(s, n => ({
        ...n,
        arrival: {
          source: e.event?.source ?? 'session',
          kind: e.origin.kind,
          at,
        },
      })),
    );
    return next(e);
  });

  on('session.compact', async ($, e, next) => {
    const ran = await next(e);
    if (ran != null && !('skip' in ran)) {
      const at = await $.clock.now();
      await update($, top, s =>
        withNotices(s, n => ({
          ...n,
          compact: {
            before: ran.tokensBefore ?? null,
            after: ran.tokensAfter ?? null,
            at,
          },
        })),
      );
    }
    return ran;
  });
}

function lineOf(call: ToolCallResult): string {
  if (call.deny !== undefined) {
    return call.deny;
  }
  if (call.isError === true) {
    return call.text ?? 'query failed';
  }
  const result = call.result as null | { stderr?: unknown; stdout?: unknown };
  const stdout = typeof result?.stdout === 'string' ? result.stdout.trim() : '';
  if (stdout !== '') {
    return stdout;
  }
  const stderr = typeof result?.stderr === 'string' ? result.stderr.trim() : '';
  return stderr !== '' ? stderr : 'query failed';
}
