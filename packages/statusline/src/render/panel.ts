import {
  line,
  type Line,
  plain,
  type Segment,
  textOf,
  toSgr,
} from '@v1nvn/agentic-core/draw';

import type { TaskFacts } from './facts.js';
import type { GitFacts } from './git.js';
import type { FitStep } from './items.js';
import type { Row } from './payload.js';

import { stripModelSuffix, warn } from './engine.js';
import {
  DEFAULT_LAYOUT,
  DEFAULT_PICKS,
  RUNG_ORDERS,
  specFor,
} from './items.js';
import { isRecord, jqText, orElse, tsvEscape } from './jq.js';
import { renderSegment, type Separators, styleSeparators } from './segments.js';

// The agent panel, ported from the bash subagent renderer it replaced — a
// second renderer by ruling: its vlen counts codepoints (jq `length`), not
// the main engine's bytes, and its fit ladder is its own. Never unify them.
// The row speaks the theme's grammar: the theme's layout filtered to what a
// task carries, every form from the shared segment registry.

const MS_THRESHOLD = 200_000_000_000;

// The items a task has data for; the layout decides which of them render.
const TASK_ITEMS = [
  'state',
  'model',
  'effort',
  'bar',
  'tokens',
  'duration',
] as const;

const PANEL_STEPS: readonly FitStep[] = [
  ['desc', 'drop'],
  ['duration', 'none'],
  ['tokens', 'compact'],
  ['bar', 'flat'],
  ['bar', 'flat6'],
  ['model', 'strip'],
  ['bar', 'flat4'],
  ['state', 'none'],
  ['effort', 'hidden'],
  ['tokens', 'none'],
  ['bar', 'percent'],
  ['bar', 'none'],
];

export interface PanelInput {
  readonly facts?: Readonly<Record<string, TaskFacts>>;
  readonly layout?: string;
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
  readonly status: string;
  readonly tokens: string;
}

interface FitState {
  desc: boolean;
  model: string;
  readonly working: Record<string, string>;
}

function field(
  source: Record<string, unknown>,
  key: string,
  fallback: unknown,
): unknown {
  return orElse(source[key], fallback);
}

function cell(value: unknown): string {
  return tsvEscape(jqText(value));
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

// Width rides the payload's own columns field: jq's `// 200` default, then
// the bash string rule (non-digit -> 200), the floor 20, minus one.
function availColumns(tick: unknown): number {
  const value = isRecord(tick) ? field(tick, 'columns', 200) : 200;
  const text = jqText(value);
  const columns = /^\d+$/.test(text) ? Number(text) : 200;
  return Math.max(columns, 20) - 1;
}

// The transcript facts are the run's truth — an empty effort on a facts
// entry is a model that runs no effort, not a fall-through to the launch's
// ask; the ask paints only until the first reply lands.
function extractFields(
  task: Record<string, unknown>,
  facts: Readonly<Record<string, TaskFacts>> | undefined,
): TaskFields {
  const id = cell(field(task, 'id', ''));
  const read = facts?.[id];
  return {
    ctx: cell(field(task, 'contextWindowSize', 0)),
    desc: cell(truncateDesc(jqText(field(task, 'description', '')))),
    effort: cell(
      read === undefined ? jqText(field(task, 'effort', '')) : read.effort,
    ),
    id,
    label: cell(field(task, 'label', '')),
    model: cell(field(task, 'model', '')),
    name: cell(field(task, 'name', '')),
    start: cell(field(task, 'startTime', 0)),
    status: cell(field(task, 'status', '')),
    tokens: cell(orElse(read?.tokens, field(task, 'tokenCount', 0))),
  };
}

// The startTime heuristic: milliseconds above the threshold become seconds
// (truncated), and only a start at or before now yields a duration.
function durationMs(startText: string, now: number): number {
  const start = intValue(startText);
  if (start === null || start <= 0) {
    return 0;
  }
  const seconds = start > MS_THRESHOLD ? Math.trunc(start / 1000) : start;
  const elapsed = Math.trunc(now) - seconds;
  return elapsed < 0 ? 0 : elapsed * 1000;
}

// The stylePick rule for every honored item: an unnamed item takes its
// default; a named alt off the item's list warns and falls to the default.
function altFor(
  item: string,
  picks: Readonly<Record<string, string>> | undefined,
): string {
  const spec = specFor(item);
  const fallback = DEFAULT_PICKS[item] ?? 'none';
  if (spec === undefined) {
    return fallback;
  }
  const wanted = picks?.[item] ?? '';
  const alt = wanted === '' ? fallback : wanted;
  if (!spec.alternatives.includes(alt)) {
    warn(
      `statusline: ${item}=${alt} is not available, using ${item}=${fallback}`,
    );
    return fallback;
  }
  return alt;
}

// The task carries none of the main row's git, cache or cost facts; the task
// items read none of those fields, so the row holds only their values.
function makeInput(fields: TaskFields, now: number, model: string) {
  const ctx = intValue(fields.ctx) ?? 0;
  const tokens = intValue(fields.tokens) ?? 0;
  const row = {
    agent: fields.status.toUpperCase(),
    ctxSize: ctx,
    durationMs: durationMs(fields.start, now),
    effort: fields.effort,
    model,
    pct: ctx > 0 ? Math.trunc((tokens * 100) / ctx) : 0,
    styleName: '',
    think: false,
    tokens,
    vim: '',
    wt: '',
  } as unknown as Row;
  return {
    git: {} as GitFacts,
    home: '',
    model,
    now,
    row,
  };
}

// A group's items the task speaks, in the layout's own order.
function layoutGroups(layout: string): string[][] {
  return (
    layout.match(/\{[^}]*\}|\S+/g)?.map(group =>
      group
        .replace(/[{}]/g, '')
        .split(/\s+/)
        .filter(item => (TASK_ITEMS as readonly string[]).includes(item)),
    ) ?? []
  );
}

function trimLine(row: Line): Line {
  const segs = row.map(seg => ({ ...seg }));
  if (segs.length === 0) {
    return line();
  }
  const lead = segs[0];
  const tail = segs[segs.length - 1];
  lead.text = lead.text.trimStart();
  tail.text = tail.text.trimEnd();
  return line(...segs);
}

function renderRow(
  fields: TaskFields,
  state: FitState,
  now: number,
  layout: string,
  separators: Separators,
): Line {
  const name = fields.label === '' ? fields.name : fields.label;
  const withDesc = fields.desc !== '' && fields.desc !== name && !state.desc;
  const head = withDesc ? `${name} ${fields.desc}` : name;
  const { join, sep } = separators;
  const segs: Segment[] = [plain(head)];
  const input = makeInput(fields, now, state.model);
  const ctx = intValue(fields.ctx) ?? 0;
  for (const items of layoutGroups(layout)) {
    const group: Segment[] = [];
    let first = true;
    for (const item of items) {
      if (ctx <= 0 && (item === 'bar' || item === 'tokens')) {
        continue;
      }
      const out = trimLine(renderSegment(item, state.working[item], input));
      if (textOf(out) === '') {
        continue;
      }
      if (first) {
        group.push(...out);
        first = false;
      } else {
        group.push(...join, ...out);
      }
    }
    if (group.length > 0) {
      segs.push(...sep, ...group);
    }
  }
  return line(...segs);
}

// The panel's own vlen: codepoints of the row's plain text.
function vlen(row: Line): number {
  return Array.from(textOf(row)).length;
}

function demote(state: FitState, item: string, target: string): void {
  const order = RUNG_ORDERS[item];
  if (order === undefined) {
    return;
  }
  // An off-rung alt (gauge) sits before the first rung, so it demotes too.
  const at = order.indexOf(state.working[item]);
  if (order.slice(at + 1).includes(target)) {
    state.working[item] = target;
  }
}

function applyStep(state: FitState, step: FitStep): void {
  if (step[0] === 'desc' && step[1] === 'drop') {
    state.desc = true;
  } else if (step[0] === 'model' && step[1] === 'strip') {
    state.model = stripModelSuffix(state.model);
  } else {
    demote(state, step[0], step[1]);
  }
}

function fitRow(
  fields: TaskFields,
  working: Record<string, string>,
  now: number,
  layout: string,
  separators: Separators,
  avail: number,
): Line {
  const state: FitState = { desc: false, model: fields.model, working };
  let out = renderRow(fields, state, now, layout, separators);
  if (vlen(out) <= avail) {
    return out;
  }
  for (const step of PANEL_STEPS) {
    applyStep(state, step);
    out = renderRow(fields, state, now, layout, separators);
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
  const layout = input.layout ?? DEFAULT_LAYOUT;
  const separators = styleSeparators(altFor('style', input.picks));
  const working: Record<string, string> = {};
  for (const item of TASK_ITEMS) {
    working[item] = altFor(item, input.picks);
  }
  const tasks = isRecord(tick) && Array.isArray(tick.tasks) ? tick.tasks : [];
  let out = '';
  for (const task of tasks) {
    if (!isRecord(task)) {
      continue;
    }
    const fields = extractFields(task, input.facts);
    if (fields.id === '') {
      continue;
    }
    const row = fitRow(fields, working, input.now, layout, separators, avail);
    const content = input.noColor === true ? textOf(row) : toSgr(row);
    out += `${emitLine(fields.id, content)}\n`;
  }
  return out;
}
