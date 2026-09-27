import { fmtK, fmtM } from './awk.js';
import { stripSgr } from './engine.js';
import { ITEMS } from './items.js';
import { styleSeparators } from './segments.js';

// The agent panel, ported exact from the bash subagent renderer it replaced —
// a second renderer by ruling: its vlen counts codepoints (jq `length`), not
// the main engine's bytes, and its fit ladder is its own. Never unify them.

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';

const MS_THRESHOLD = 200_000_000_000;

export interface PanelInput {
  readonly noColor?: boolean;
  readonly now: number;
  readonly payload: string;
  readonly picks?: Readonly<Record<string, string>>;
}

interface TaskFields {
  readonly ctx: string;
  readonly desc: string;
  readonly effort: string;
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly name: string;
  readonly start: string;
  readonly tokens: string;
}

interface RowFormats {
  readonly ctx: string;
  readonly dur: string;
  readonly tickTok: string;
  readonly tokens: string;
}

interface FitState {
  barb: number;
  descd: number;
  durd: number;
  modeld: number;
  statd: number;
}

const STEPS: readonly (readonly [keyof FitState, number])[] = [
  ['descd', 1],
  ['durd', 1],
  ['statd', 1],
  ['barb', 6],
  ['modeld', 1],
  ['barb', 4],
  ['barb', 0],
  ['modeld', 2],
  ['statd', 2],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function warn(message: string): void {
  process.stderr.write(`${message}\n`);
}

// jq's `//`: only null, false, and a missing member fall through.
function field(
  source: Record<string, unknown>,
  key: string,
  fallback: unknown,
): unknown {
  const value = source[key];
  return value === undefined || value === null || value === false
    ? fallback
    : value;
}

// jq's `tostring` on the row fields: scalars as text, containers as JSON.
function jqText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

// Every field crosses jq's @tsv before the bash field split: backslash, tab,
// newline, and carriage return survive as their two-character escapes.
function tsvText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function cell(value: unknown): string {
  return tsvText(jqText(value));
}

// jq's truncation: a description longer than 24 codepoints keeps its first 23
// plus an ellipsis.
function truncateDesc(desc: string): string {
  const chars = Array.from(desc);
  return chars.length > 24 ? `${chars.slice(0, 23).join('')}…` : desc;
}

function intValue(text: string): null | number {
  return /^-?\d+$/.test(text) ? Number(text) : null;
}

function stylePick(
  picks: Readonly<Record<string, string>> | undefined,
): string {
  const spec = ITEMS.find(candidate => candidate.item === 'style');
  if (spec === undefined) {
    return 'plain';
  }
  const wanted = picks?.style ?? '';
  const alt = wanted === '' ? spec.default : wanted;
  if (!spec.alternatives.includes(alt)) {
    warn(
      `statusline: style=${alt} is not available, using style=${spec.default}`,
    );
    return spec.default;
  }
  return alt;
}

// Width rides the payload's own columns field: jq's `// 200` default, then
// the bash string rule (non-digit -> 200), the floor 20, minus one.
function availColumns(tick: unknown): number {
  const value = isRecord(tick) ? field(tick, 'columns', 200) : 200;
  const text = jqText(value);
  const columns = /^\d+$/.test(text) ? Number(text) : 200;
  return Math.max(columns, 20) - 1;
}

function extractFields(task: Record<string, unknown>): TaskFields {
  return {
    ctx: cell(field(task, 'contextWindowSize', 0)),
    desc: cell(truncateDesc(jqText(field(task, 'description', '')))),
    effort: cell(field(task, 'effort', '')),
    id: cell(field(task, 'id', '')),
    label: cell(field(task, 'label', '')),
    model: cell(field(task, 'model', '')),
    name: cell(field(task, 'name', '')),
    start: cell(field(task, 'startTime', 0)),
    tokens: cell(field(task, 'tokenCount', 0)),
  };
}

function makeBar(pct: number, width: number): string {
  let f = Math.trunc((pct * width) / 100);
  if (f > width) {
    f = width;
  }
  let bar = '';
  for (let i = 0; i < width; i++) {
    bar += i < f ? '█' : '░';
  }
  return bar;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// The startTime heuristic: milliseconds above the threshold become seconds
// (truncated), and only a start at or before now yields a duration.
function duration(startText: string, now: number): string {
  const start = intValue(startText);
  if (start === null || start <= 0) {
    return '';
  }
  const seconds = start > MS_THRESHOLD ? Math.trunc(start / 1000) : start;
  const elapsed = Math.trunc(now) - seconds;
  if (elapsed < 0) {
    return '';
  }
  return `${Math.trunc(elapsed / 60)}m${pad2(Math.trunc(elapsed % 60))}s`;
}

function rowFormats(fields: TaskFields, now: number): RowFormats {
  const tokens = intValue(fields.tokens) ?? 0;
  const ctx = intValue(fields.ctx) ?? 0;
  let ctxText = fields.ctx;
  if (ctx >= 1_000_000) {
    ctxText = fmtM(ctx);
  } else if (ctx >= 1000) {
    ctxText = fmtK(ctx, 0);
  }
  return {
    ctx: ctxText,
    dur: duration(fields.start, now),
    tickTok: tokens >= 1000 ? fmtK(tokens, 0) : String(tokens),
    tokens: tokens >= 1000 ? fmtK(tokens, 1) : String(tokens),
  };
}

function renderRow(
  fields: TaskFields,
  formats: RowFormats,
  state: FitState,
  sep: string,
): string {
  let s = fields.label === '' ? fields.name : fields.label;
  if (fields.desc !== '' && fields.desc !== fields.label && state.descd === 0) {
    s += ` ${fields.desc}`;
  }
  if (fields.model !== '') {
    let name = fields.model;
    if (state.modeld >= 1) {
      const at = name.lastIndexOf('[');
      if (at !== -1) {
        name = name.slice(0, at);
      }
      if (name.endsWith(' ')) {
        name = name.slice(0, -1);
      }
    }
    const effort = state.modeld >= 2 ? '' : fields.effort;
    if (effort !== '') {
      name += ` ${effort}`;
    }
    s += `${sep}${CYAN}${name}${RESET}`;
  }
  const ctx = intValue(fields.ctx);
  if (ctx !== null && ctx > 0) {
    const tokens = intValue(fields.tokens) ?? 0;
    const pct = Math.trunc((tokens * 100) / ctx);
    const barColor = pct >= 90 ? RED : pct >= 70 ? YELLOW : GREEN;
    if (state.barb > 0) {
      s += `${sep}${barColor}${makeBar(pct, state.barb)}${RESET} ${pct}%`;
    } else {
      s += `${sep}${barColor}${pct}%${RESET}`;
    }
    const stats =
      state.statd === 1
        ? formats.tickTok
        : state.statd === 2
          ? ''
          : `${formats.tokens}/${formats.ctx}`;
    if (stats !== '') {
      s += ` ${stats}`;
    }
  }
  if (formats.dur !== '' && state.durd === 0) {
    s += `${sep}${formats.dur}`;
  }
  return s;
}

// The panel's own vlen: codepoints of the SGR-stripped row.
function vlen(text: string): number {
  return Array.from(stripSgr(text)).length;
}

function fitRow(
  fields: TaskFields,
  formats: RowFormats,
  sep: string,
  avail: number,
): string {
  const state: FitState = { barb: 10, descd: 0, durd: 0, modeld: 0, statd: 0 };
  let out = renderRow(fields, formats, state, sep);
  if (vlen(out) <= avail) {
    return out;
  }
  for (const [key, value] of STEPS) {
    state[key] = value;
    out = renderRow(fields, formats, state, sep);
    if (vlen(out) <= avail) {
      return out;
    }
  }
  return out;
}

function emitLine(id: string, content: string): string {
  return `{"id":${JSON.stringify(id)},"content":${JSON.stringify(content)}}`;
}

export function renderPanel(input: PanelInput): string {
  const tick: unknown = JSON.parse(input.payload);
  const avail = availColumns(tick);
  const sep = styleSeparators(stylePick(input.picks)).sep;
  const tasks = isRecord(tick) && Array.isArray(tick.tasks) ? tick.tasks : [];
  let out = '';
  for (const task of tasks) {
    if (!isRecord(task)) {
      continue;
    }
    const fields = extractFields(task);
    if (fields.id === '') {
      continue;
    }
    const formats = rowFormats(fields, input.now);
    const row = fitRow(fields, formats, sep, avail);
    const content = input.noColor === true ? stripSgr(row) : row;
    out += `${emitLine(fields.id, content)}\n`;
  }
  return out;
}
