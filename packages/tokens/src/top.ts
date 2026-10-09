/**
 * The live-session pane layout: `topLines` lays /tokens-top out once as
 * ink-tagged segments, fed only by what the engine pushed — measures,
 * streaming chunks, the agent roster. Every value is a current reading; the
 * one rolling buffer is the rate ring, as wide as its sparkline and no more.
 */

import type { Line } from './text.js';
import type { Segment } from './text.js';

import {
  barField,
  bold,
  dim,
  fmtTokens,
  meterSegs,
  pad2,
  plain,
  sparkField,
} from './text.js';

function magenta(text: string): Segment {
  return { text: ' ' + text, ink: 'magenta' };
}

export const TOP_WIDTH = 52;
const LABEL = 9;
const SPARK = 16;

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
  categories: TopCategory[];
  compactAt: null | number;
  costUsd: null | number;
  mcp: { server: string; tokens: number }[];
  memory: { path: string; tokens: number }[];
  percent: null | number;
  rateLimits: TopRateLimit[];
  startedAt: null | number;
  tokens: null | number;
  window: number;
}

export interface TopUsage {
  cacheRead: number;
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
  calls: { at: number; id: string; label: string; tool: string }[];
  children: { argv: string; at: number; id: string }[];
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

function shortCat(name: string): string {
  const short: Record<string, string> = {
    'free space': 'free',
    'mcp tools': 'mcp',
    'memory files': 'memory',
    'system prompt': 'system',
  };
  return short[name.toLowerCase()] ?? cut(name.toLowerCase(), 12);
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
    session.model ?? '…',
    session.version ?? '',
    elapsed != null ? fmtDur(elapsed) : '',
  ].filter(Boolean);
  out.push([bold(' ' + head.join(' · '))]);
  const sub = [
    shortCwd(session.cwd, 30),
    session.surfaces.join('+') || '…',
    session.turns != null ? `${session.turns} prompts` : null,
    state.measure?.costUsd != null ? fmtUsd(state.measure.costUsd) : null,
  ].filter(Boolean);
  out.push([dim(' ' + sub.join(' · '))]);

  function section(name: string): void {
    out.push([]);
    out.push([
      dim(` ${name} ${'─'.repeat(Math.max(4, TOP_WIDTH - name.length - 3))}`),
    ]);
  }
  function row(label: string, rest: Line): void {
    out.push([plain(` ${label} `.padEnd(LABEL)), ...rest]);
  }
  function under(rest: Line): void {
    out.push([plain(' '.repeat(LABEL)), ...rest]);
  }

  const { flow } = state;
  section('flow');
  row('out', [
    { text: sparkField(flow.outRing, SPARK), ink: 'green' },
    magenta(`${String(Math.round(flow.outRate)).padStart(3)} tok/s`),
  ]);
  row('thinking', [
    { text: sparkField(flow.thinkRing, SPARK), ink: 'green' },
    magenta(`${String(Math.round(flow.thinkRate)).padStart(3)} tok/s`),
  ]);
  if (flow.hit != null) {
    row('cache', [
      plain(`${String(Math.round(flow.hit)).padStart(3)}%  `),
      ...meterSegs(flow.hit, 12),
    ]);
  }
  if (flow.usage) {
    row('last', [
      plain(
        `${fmtTokens(flow.usage.input)} in · ${fmtTokens(flow.usage.output)} out · ${fmtTokens(flow.usage.cacheRead)} read`,
      ),
    ]);
  } else {
    row('last', [dim('(no response yet)')]);
  }
  const tail = [
    flow.firstChunkMs != null
      ? `first chunk ${fmtDur(flow.firstChunkMs)}`
      : null,
    flow.turnMs != null ? `turn ${fmtDur(flow.turnMs)}` : null,
    flow.turnEnd,
  ].filter(Boolean);
  if (tail.length > 0) {
    under([dim(tail.join(' · '))]);
  }

  const m = state.measure;
  if (m) {
    section('context');
    const ctx = [
      m.tokens != null
        ? `${fmtTokens(m.tokens)} / ${fmtTokens(m.window)}`
        : `${fmtTokens(m.window)} window`,
      m.percent != null ? `${Math.round(m.percent)}%` : null,
      m.compactAt != null ? `compact at ${fmtTokens(m.compactAt)}` : null,
    ].filter(Boolean);
    out.push([bold(' ' + ctx.join('  ·  '))]);
    if (m.percent != null) {
      out.push([plain('  '), ...meterSegs(m.percent, TOP_WIDTH - 4)]);
    }
    const catItems = m.categories
      .filter(c => c.kind === 'used' || c.kind === 'free')
      .filter(c => c.tokens > 0)
      .map(c => `${shortCat(c.name)} ${fmtTokens(c.tokens)}`);
    for (const r of wrapJoin(catItems, TOP_WIDTH - 3)) {
      out.push([dim(`  ${r}`)]);
    }
    if (m.mcp.length > 0) {
      const servers = m.mcp.map(x => `${x.server} ${fmtTokens(x.tokens)}`);
      wrapJoin(servers, TOP_WIDTH - LABEL - 1).forEach((r, i) => {
        if (i === 0) {
          row('mcp', [dim(r)]);
        } else {
          under([dim(r)]);
        }
      });
    }
    if (m.memory.length > 0) {
      const files = m.memory.map(
        x => `${x.path.split('/').pop()} ${fmtTokens(x.tokens)}`,
      );
      wrapJoin(files, TOP_WIDTH - LABEL - 1).forEach((r, i) => {
        if (i === 0) {
          row('memory', [dim(r)]);
        } else {
          under([dim(r)]);
        }
      });
    }

    if (m.rateLimits.length > 0) {
      section('limits');
      for (const r of m.rateLimits) {
        const resets =
          r.resetsAt != null ? `  resets ${fmtDur(r.resetsAt - now)}` : '';
        row(windowLabel(r.kind), [
          plain(`${String(Math.round(r.percentUsed)).padStart(3)}%  `),
          { text: barField(r.percentUsed, 100, 11), ink: 'green' },
          dim(resets),
        ]);
      }
    }
  }

  const { running } = state;
  const agentRows = session.agents;
  if (running.calls.length + running.children.length > 0) {
    section('running');
    for (const c of running.calls) {
      row(
        cut(c.tool, LABEL - 2),
        [
          plain(c.label !== '' ? cut(c.label, 30) : ''),
          dim(` · ${fmtDur(now - c.at)}`),
        ].filter(seg => seg.text !== ''),
      );
    }
    for (const c of running.children) {
      row('child', [dim(`${cut(c.argv, 30)} · ${fmtDur(now - c.at)}`)]);
    }
  }
  if (agentRows.length > 0) {
    section('agents');
    const nRunning = agentRows.filter(a => a.status === 'running').length;
    out.push([
      plain(` ${nRunning} running`),
      plain(
        agentRows.length > nRunning
          ? ` · ${agentRows.length - nRunning} idle`
          : '',
      ),
    ]);
    const rates = new Map(flow.agents.map(a => [a.id, a]));
    for (const a of agentRows.slice(0, 6)) {
      const name = cut(a.name ?? a.type, 12).padEnd(12);
      const age = spawnAge(state, a.id, now);
      const bits = [
        a.status,
        age != null ? fmtDur(age) : null,
        a.description !== '' ? cut(a.description, 24) : null,
      ].filter(Boolean);
      out.push([plain(` ${name}`), dim(` ${bits.join(' · ')}`)]);
      const rate = rates.get(a.id);
      if (rate && a.status === 'running') {
        under([
          dim('└ '),
          { text: sparkField(rate.ring, 5), ink: 'green' },
          magenta(`${Math.round(rate.rate)} tok/s`),
        ]);
      }
    }
  }

  const { notices } = state;
  if (notices.arrival || notices.compact) {
    if (notices.compact) {
      const c = notices.compact;
      const sizes =
        c.before != null && c.after != null
          ? `${fmtTokens(c.before)} → ${fmtTokens(c.after)}`
          : 'ran';
      section('compacted');
      out.push([dim(` ${sizes} · ${fmtDur(now - c.at)} ago`)]);
    }
    if (notices.arrival) {
      const a = notices.arrival;
      section('arrival');
      out.push([dim(` ${a.source} · ${a.kind} · ${fmtDur(now - a.at)} ago`)]);
    }
  }

  return out;
}

function spawnAge(state: TopState, id: string, now: number): null | number {
  const born = state.spawns.find(s => s.id === id);
  return born != null ? now - born.at : null;
}
