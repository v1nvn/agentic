/**
 * The tokens mod. /tokens-usage opens the account report as a pane — one
 * src/index.ts usage --json exec through the exec/accept/parse door, the
 * CLI's finished ink-tagged lines accepted and rendered as they came, and
 * re-scanned on its refresh tick while the pane stays open. /tokens-top
 * draws the live session — engine-pushed measures, chunks, the agent roster
 * — no exec, one aging tick.
 */

import { atom, read, update } from 'claude-code';

import type { Line } from '../src/text.ts';
import type {
  TopFlow,
  TopMeasure,
  TopNotices,
  TopRunning,
  TopState,
} from '../src/top.ts';

import { emptyTop, topLines } from '../src/top.ts';
import {
  acceptJson,
  ageAgents,
  type AgentCell,
  cellAt,
  type CommandSpec,
  type Door,
  paneRows,
  type PaneSpec,
  showsPane,
} from './support.ts';

import type { Elements, EngineInterface, On } from 'claude-code';

const USAGE: PaneSpec = {
  empty: '(no usage report)',
  frame: true,
  id: 'tokens-usage',
  refreshMs: 5 * 60 * 1000,
  title: 'Token usage',
};

const TOP: PaneSpec = { frame: false, id: 'tokens-top', title: 'Session' };

const TICK_MS = 500;
const RING_MAX = 16;
const AGENT_RING_MAX = 5;
const EST_CHARS_PER_TOKEN = 4;
const ACCENT = 'cyan';

const COMMANDS = [
  {
    description: 'Token usage — per-model 24h mix and 7-day dailies, as a pane',
    name: USAGE.id,
  },
  {
    description: 'This session live — context, flow, limits, agents, as a pane',
    name: TOP.id,
  },
] as const satisfies readonly CommandSpec[];

const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | { lines: Line[] },
);
const top = atom(
  { plugin: 'tokens', key: 'top' } as const,
  null as null | TopState,
);

let accOut = 0;
let accThink = 0;
const agentCells = new Map<string, AgentCell>();
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

function parsedLines(parsed: unknown): null | { lines: Line[] } {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { lines } = parsed as { lines?: unknown };
  if (!Array.isArray(lines)) {
    return null;
  }
  return lines.every(
    l =>
      Array.isArray(l) &&
      l.every(
        s =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as { text?: unknown }).text === 'string',
      ),
  )
    ? { lines: lines as Line[] }
    : null;
}

async function scanUsage($: EngineInterface): Promise<Door<{ lines: Line[] }>> {
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/src/index.ts usage --json`,
  });
  const got = acceptJson(call, 'query failed', parsedLines);
  if (got.ok) {
    await update($, usage, () => got.value);
  }
  return got;
}

async function rescanWhileOpen($: EngineInterface): Promise<void> {
  if (showsPane(await $.ui.panes(), USAGE)) {
    await scanUsage($);
  }
}

/** Ages the rate rings: one sample of the accumulators, only while the pane shows. */
async function topTick($: EngineInterface): Promise<void> {
  if (!showsPane(await $.ui.panes(), TOP)) {
    return;
  }
  const roster = await $.agent.list();
  const now = await $.clock.now();
  const dt = lastTickAt === 0 ? 0 : (now - lastTickAt) / 1000;
  lastTickAt = now;
  const agents = ageAgents(agentCells, roster, dt, AGENT_RING_MAX);
  const outSample = accOut;
  const thinkSample = accThink;
  accOut = 0;
  accThink = 0;

  await update($, top, s =>
    withTop(s, t => ({
      ...t,
      spawns: agents.flatMap(a =>
        a.spawnAt === null ? [] : [{ at: a.spawnAt, id: a.id }],
      ),
      flow: {
        ...t.flow,
        outRing: [...t.flow.outRing, outSample].slice(-RING_MAX),
        thinkRing: [...t.flow.thinkRing, thinkSample].slice(-RING_MAX),
        outRate: dt > 0 ? outSample / dt : 0,
        thinkRate: dt > 0 ? thinkSample / dt : 0,
        agents: agents.map(a => ({
          id: a.id,
          rate: a.rate,
          ring: [...a.ring],
        })),
      },
    })),
  );
}

function draw(
  t: Pick<Elements['terminal'], 'Box' | 'Text'>,
  lines: readonly Line[],
  pane: PaneSpec,
): ReturnType<Elements['terminal']['Box']> {
  const { Box, Text } = t;
  function isColor(ink: Line[number]['ink']): boolean {
    return ink === 'green' || ink === 'magenta';
  }
  return (
    <Box
      borderColor={pane.frame ? ACCENT : undefined}
      borderStyle={pane.frame ? 'round' : undefined}
      flexDirection="column"
      paddingX={pane.frame ? 1 : 0}
    >
      {lines.map((line, i) => (
        <Text key={`l${i}`} wrap="truncate-end">
          {line.map((seg, j) => (
            <Text
              bold={seg.ink === 'bold'}
              color={isColor(seg.ink) ? seg.ink : undefined}
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

async function usageRun($: EngineInterface): Promise<Record<string, never>> {
  const got = await scanUsage($);
  if (!got.ok) {
    $.ui.log(got.line);
    return {};
  }
  const saved = await read($, usage);
  await $.ui.open({
    id: USAGE.id,
    rows: paneRows(saved?.lines.length ?? 0, USAGE),
    title: USAGE.title,
  });
  return {};
}

async function topRun($: EngineInterface): Promise<Record<string, never>> {
  await $.ui.open({ id: TOP.id, title: TOP.title });
  return {};
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) {
      await $.command.register(command);
    }
    const refreshMs = USAGE.refreshMs;
    if (refreshMs !== undefined) {
      $.clock.every(refreshMs, () => void rescanWhileOpen($));
    }
    $.clock.every(TICK_MS, () => void topTick($));
    return next(e);
  });

  on('command.run', { command: USAGE.id }, usageRun);
  on('command.run', { command: TOP.id }, topRun);

  on('ui.render', { component: 'Pane', requestId: USAGE.id }, async ($, e) => {
    const saved = await read($, usage);
    if (!saved) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>{USAGE.empty}</Text>;
    }
    return draw($.ui.resolve(e), saved.lines, USAGE);
  });

  on('ui.render', { component: 'Pane', requestId: TOP.id }, async ($, e) => {
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
    return draw($.ui.resolve(e), lines, TOP);
  });

  on('session.measure', async ($, e, next) => {
    const u = await $.session.usage({ breakdown: 'full' });
    const b = u.context.breakdown ?? null;
    const mcp = new Map<string, number>();
    for (const t of b?.mcpTools ?? []) {
      mcp.set(t.serverName, (mcp.get(t.serverName) ?? 0) + t.tokens);
    }
    const measure: TopMeasure = {
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
          cellAt(agentCells, e.agentId).acc += n;
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
    const id = e.tool_use_id ?? `call:${e.tool}:${String(await $.clock.now())}`;
    const row = {
      id,
      tool: e.tool,
      label: callLabel(e),
      at: await $.clock.now(),
    };
    await update($, top, s =>
      withRunning(s, r => ({ ...r, calls: [...r.calls, row] })),
    );
    const ran = await next(e);
    await update($, top, s =>
      withRunning(s, r => ({ ...r, calls: r.calls.filter(c => c.id !== id) })),
    );
    return ran;
  });

  on('process.spawn', async function* ($, e, next) {
    const id = `child:${e.argv.join(' ')}:${String(await $.clock.now())}`;
    const row = { id, argv: e.argv.join(' '), at: await $.clock.now() };
    await update($, top, s =>
      withRunning(s, r => ({ ...r, children: [...r.children, row] })),
    );
    try {
      for await (const chunk of next(e)) {
        yield chunk;
      }
    } finally {
      await update($, top, s =>
        withRunning(s, r => ({
          ...r,
          children: r.children.filter(c => c.id !== id),
        })),
      );
    }
  });

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e);
    if (ran.agentId !== undefined) {
      cellAt(agentCells, ran.agentId).spawnAt = await $.clock.now();
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
