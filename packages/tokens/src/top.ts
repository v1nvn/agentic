/**
 * The live-session pane layout: `topLines` lays /tokens-top out once as
 * ink-tagged segments, fed only by what the engine pushed — measures,
 * streaming chunks, the agent roster. Every value is a current reading; the
 * one rolling buffer is the rate ring, as wide as its sparkline and no more.
 */

import type { Line } from './text.js';

import {
  barField,
  bold,
  dim,
  dotMeter,
  fmtTokens,
  pad2,
  plain,
  sparkField,
} from './text.js';

export const TOP_WIDTH = 52;

export interface TopRateLimit {
  kind: string;
  percentUsed: number;
  resetsAt: null | number;
}

export interface TopCategory {
  kind: string;
  name: string;
  tokens: number;
}

export interface TopMeasure {
  at: number;
  categories: TopCategory[];
  compactAt: null | number;
  costUsd: null | number;
  mcp: { server: string; tokens: number }[];
  memory: { path: string; tokens: number }[];
  model: null | string;
  percent: null | number;
  rateLimits: TopRateLimit[];
  startedAt: null | number;
  tokens: null | number;
  window: number;
}

export interface TopUsage {
  cacheRead: number;
  cacheWrite: number;
  input: number;
  output: number;
}

export interface TopFlow {
  agents: { id: string; rate: number; ring: number[] }[];
  firstChunkMs: null | number;
  hit: null | number;
  outRate: number;
  outRing: number[];
  thinkRate: number;
  thinkRing: number[];
  turnEnd: null | string;
  turnMs: null | number;
  usage: null | TopUsage;
}

export interface TopRunning {
  calls: { at: number; label: string; tool: string }[];
  children: { argv: string; at: number }[];
}

export interface TopNotices {
  arrival: null | { at: number; kind: string; source: string };
  compact: null | { after: null | number; at: number; before: null | number };
}

export interface TopState {
  flow: TopFlow;
  measure: null | TopMeasure;
  notices: TopNotices;
  running: TopRunning;
  spawns: { at: number; id: string }[];
}

export interface TopSession {
  agents: {
    description: string;
    id: string;
    name: null | string;
    status: string;
    type: string;
  }[];
  cwd: string;
  model: null | string;
  surfaces: string[];
  turns: null | number;
  version: null | string;
}

export function emptyTop(): TopState {
  return {
    measure: null,
    flow: {
      outRing: [],
      thinkRing: [],
      outRate: 0,
      thinkRate: 0,
      hit: null,
      usage: null,
      firstChunkMs: null,
      turnMs: null,
      turnEnd: null,
      agents: [],
    },
    running: { calls: [], children: [] },
    spawns: [],
    notices: { arrival: null, compact: null },
  };
}

/** '42s' · '6m' · '1h52m' · '2d4h'. */
export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) {
    return `${s}s`;
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return `${m}m`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return `${h}h${pad2(m % 60)}m`;
  }
  return `${Math.floor(h / 24)}d${h % 24}h`;
}

function fmtUsd(usd: number): string {
  return usd >= 100 ? `$${Math.round(usd)}` : `$${usd.toFixed(2)}`;
}

/** '/Users/x/git/agentic' → '/Users/…/git/agentic', kept under `max`. */
function shortCwd(cwd: string, max: number): string {
  if (cwd.length <= max) {
    return cwd;
  }
  const parts = cwd.split('/');
  const tail = parts.slice(-2).join('/');
  return `${parts[0]}/…/${tail}`.length <= max
    ? `${parts[0]}/…/${tail}`
    : `…/${tail}`;
}

function cut(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Joins items with ' · ' into rows of `width`, last row keeps the rest. */
function wrapJoin(items: string[], width: number): string[] {
  const rows: string[] = [];
  let row = '';
  for (const item of items) {
    const next = row === '' ? item : `${row} · ${item}`;
    if (next.length > width && row !== '') {
      rows.push(row);
      row = item;
    } else {
      row = next;
    }
  }
  if (row !== '') {
    rows.push(row);
  }
  return rows;
}

function windowLabel(kind: string): string {
  if (kind === 'five_hour') {
    return '5h';
  }
  if (kind === 'seven_day') {
    return 'week';
  }
  return kind;
}

export function topLines(
  state: null | TopState,
  session: TopSession,
  { now }: { now: number },
): Line[] {
  if (!state) {
    return [[dim(' (waiting for the first measure)')]];
  }
  const out: Line[] = [];
  const elapsed =
    state.measure?.startedAt != null ? now - state.measure.startedAt : null;

  const head = [
    ' session',
    session.model ?? '…',
    session.version ?? '',
    elapsed != null ? fmtDur(elapsed) : '',
  ].filter(Boolean);
  out.push([bold(head.join(' · '))]);
  const sub = [
    shortCwd(session.cwd, 30),
    session.surfaces.join('+') || '…',
    session.turns != null ? `${session.turns} prompts` : null,
    state.measure?.costUsd != null ? fmtUsd(state.measure.costUsd) : null,
  ].filter(Boolean);
  out.push([dim(' ' + sub.join(' · '))]);

  const { flow } = state;
  out.push([]);
  out.push([
    plain(' flow   out      '),
    { text: sparkField(flow.outRing, 17), ink: 'dim' },
    plain(`  ${Math.round(flow.outRate)} tok/s`),
  ]);
  out.push([
    plain('        thinking '),
    { text: sparkField(flow.thinkRing, 17), ink: 'dim' },
    plain(`  ${Math.round(flow.thinkRate)} tok/s`),
  ]);
  if (flow.hit != null) {
    out.push([
      plain(`        cache hit ${String(Math.round(flow.hit))}% `),
      { text: dotMeter(flow.hit, 12), ink: 'dim' },
    ]);
  }
  if (flow.usage) {
    out.push([
      plain(
        ` last   ${fmtTokens(flow.usage.input)} in · ${fmtTokens(flow.usage.output)} out · ${fmtTokens(flow.usage.cacheRead)} read`,
      ),
    ]);
  } else {
    out.push([dim(' last   (no response yet)')]);
  }
  const tail = [
    flow.firstChunkMs != null
      ? `first chunk ${fmtDur(flow.firstChunkMs)}`
      : null,
    flow.turnMs != null ? `turn ${fmtDur(flow.turnMs)}` : null,
    flow.turnEnd,
  ].filter(Boolean);
  if (tail.length > 0) {
    out.push([dim('        ' + tail.join(' · '))]);
  }

  const m = state.measure;
  if (m) {
    out.push([]);
    const ctx = [
      m.tokens != null
        ? `${fmtTokens(m.tokens)} / ${fmtTokens(m.window)}`
        : `${fmtTokens(m.window)} window`,
      m.percent != null ? `${Math.round(m.percent)}%` : null,
      m.compactAt != null ? `compact at ${fmtTokens(m.compactAt)}` : null,
    ].filter(Boolean);
    out.push([plain(' context '), bold(ctx.join('  '))]);
    if (m.percent != null) {
      out.push([
        plain('  '),
        { text: dotMeter(m.percent, TOP_WIDTH - 4), ink: 'bold' },
      ]);
    }
    const catItems = m.categories
      .filter(c => c.kind === 'used' || c.kind === 'free')
      .filter(c => c.tokens > 0)
      .map(c => `${c.name.toLowerCase()} ${fmtTokens(c.tokens)}`);
    for (const row of wrapJoin(catItems, TOP_WIDTH - 3)) {
      out.push([dim(`   ${row}`)]);
    }
    if (m.mcp.length > 0) {
      const servers = m.mcp.map(x => `${x.server} ${fmtTokens(x.tokens)}`);
      for (const row of wrapJoin(servers, TOP_WIDTH - 8)) {
        out.push([plain(' mcp    '), dim(row)]);
      }
    }
    if (m.memory.length > 0) {
      const files = m.memory.map(
        x => `${x.path.split('/').pop()} ${fmtTokens(x.tokens)}`,
      );
      for (const row of wrapJoin(files, TOP_WIDTH - 8)) {
        out.push([plain(' memory '), dim(row)]);
      }
    }

    if (m.rateLimits.length > 0) {
      out.push([]);
      for (const r of m.rateLimits) {
        const resets =
          r.resetsAt != null ? `  resets ${fmtDur(r.resetsAt - now)}` : '';
        out.push([
          plain(` ${windowLabel(r.kind)} `.padEnd(7)),
          plain(`${String(Math.round(r.percentUsed)).padStart(3)}% `),
          { text: barField(r.percentUsed, 100, 11), ink: 'dim' },
          dim(resets),
        ]);
      }
    }
  }

  const { running } = state;
  const agentRows = session.agents;
  if (
    running.calls.length + running.children.length > 0 ||
    agentRows.length > 0
  ) {
    out.push([]);
    for (const [i, c] of running.calls.entries()) {
      const left = i === 0 ? ' running ' : '   ';
      out.push([
        plain(left),
        bold(c.tool),
        plain(c.label !== '' ? ` · ${cut(c.label, 28)}` : ''),
        dim(` · ${fmtDur(now - c.at)}`),
      ]);
    }
    for (const c of running.children) {
      out.push([
        dim('   child'),
        dim(` ${cut(c.argv, 30)} · ${fmtDur(now - c.at)}`),
      ]);
    }
    if (agentRows.length > 0) {
      const nRunning = agentRows.filter(a => a.status === 'running').length;
      out.push([
        plain(' agents '),
        bold(`${nRunning} running`),
        plain(
          agentRows.length > nRunning
            ? ` · ${agentRows.length - nRunning} idle`
            : '',
        ),
      ]);
      const rates = new Map(flow.agents.map(a => [a.id, a]));
      for (const a of agentRows.slice(0, 6)) {
        const name = cut(a.name ?? a.type, 12).padEnd(12);
        const born = spawnAge(state, a.id, now);
        const bits = [
          a.status,
          born != null ? fmtDur(born) : null,
          a.description !== '' ? cut(a.description, 24) : null,
        ].filter(Boolean);
        out.push([plain(`   ${name}`), dim(` ${bits.join(' · ')}`)]);
        const rate = rates.get(a.id);
        if (rate && a.status === 'running') {
          out.push([
            dim('     └ '),
            { text: sparkField(rate.ring, 5), ink: 'dim' },
            dim(`  ${Math.round(rate.rate)} tok/s`),
          ]);
        }
      }
    }
  }

  const { notices } = state;
  if (notices.arrival || notices.compact) {
    out.push([]);
    if (notices.compact) {
      const c = notices.compact;
      const sizes =
        c.before != null && c.after != null
          ? `${fmtTokens(c.before)} → ${fmtTokens(c.after)}`
          : 'ran';
      out.push([dim(` compacted ${sizes} · ${fmtDur(now - c.at)} ago`)]);
    }
    if (notices.arrival) {
      const a = notices.arrival;
      out.push([
        dim(` arrival ${a.source} · ${a.kind} · ${fmtDur(now - a.at)} ago`),
      ]);
    }
  }

  return out;
}

function spawnAge(state: TopState, id: string, now: number): null | number {
  const born = state.spawns.find(s => s.id === id);
  return born != null ? now - born.at : null;
}
