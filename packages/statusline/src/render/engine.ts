import {
  line,
  type Line,
  type Segment,
  textOf,
  toSgr,
} from '@v1nvn/agentic-core/draw';

import { readGit } from './git.ts';
import {
  DEFAULT_LAYOUT,
  type FitStep,
  FULL_STEPS,
  ITEMS,
  L1_STEPS,
  L2_STEPS,
  RUNG_ORDERS,
  validatePick,
} from './items.ts';
import { parseLayout } from './layout.ts';
import { parseRow } from './payload.ts';
import {
  renderSegment,
  type SegmentInput,
  type Separators,
  styleSeparators,
} from './segments.ts';

export interface RenderInput {
  readonly columns?: number;
  readonly home: string;
  readonly layout?: string;
  readonly noColor?: boolean;
  readonly now: number;
  readonly payload: string;
  readonly picks?: Readonly<Record<string, string>>;
}

type Mode = 'full' | 'l1' | 'l2';

const RUNG_ITEMS = Object.keys(RUNG_ORDERS);

// The bash vlen counts bytes minus UTF-8 continuation bytes — one per
// codepoint — then adds one more per ⚡, which renders two cells wide.
export function vlen(text: string): number {
  let n = Array.from(text).length;
  for (const ch of text) {
    if (ch === '⚡') {
      n += 1;
    }
  }
  return n;
}

// The `[...]` suffix a fit step strips from the model name — shared by both
// engines so the two ports keep the same cut.
export function stripModelSuffix(name: string): string {
  const at = name.lastIndexOf('[');
  const cut = at === -1 ? name : name.slice(0, at);
  return cut.endsWith(' ') ? cut.slice(0, -1) : cut;
}

function resolvePicks(
  picks: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const spec of ITEMS) {
    resolved[spec.item] = validatePick(spec.item, picks?.[spec.item] ?? '');
  }
  return resolved;
}

export function renderStatusline(input: RenderInput): string {
  const row = parseRow(input.payload);
  const git = readGit(row.dir, { home: input.home });
  const picks = resolvePicks(input.picks);
  const clusters = parseLayout(
    input.layout ?? DEFAULT_LAYOUT,
    new Set(ITEMS.map(spec => spec.item)),
  );
  const wrapAt = clusters.length > 2 ? 2 : 1;

  let width = input.columns;
  if (width === undefined || !Number.isInteger(width) || width < 0) {
    width = 200;
  }
  if (width < 20) {
    width = 20;
  }
  const avail = width - 3;

  let model = row.model;
  const initialRungs = RUNG_ITEMS.map(item => [item, picks[item]] as const);

  function segmentInput(): SegmentInput {
    return { git, home: input.home, model, now: input.now, row };
  }

  function compose(mode: Mode): Line {
    const from = mode === 'l2' ? wrapAt : 0;
    const to = mode === 'l1' ? wrapAt : clusters.length;
    const { join, sep }: Separators = styleSeparators(picks.style);
    const segs: Segment[] = [];
    let first = true;
    for (let ci = from; ci < to; ci++) {
      const cseg: Segment[] = [];
      let cf = true;
      for (const item of clusters[ci]) {
        const out = renderSegment(item, picks[item], segmentInput());
        if (out.length === 0) {
          continue;
        }
        if (cf) {
          cseg.push(...out);
          cf = false;
        } else {
          cseg.push(...join, ...out);
        }
      }
      if (cseg.length === 0) {
        continue;
      }
      if (first) {
        segs.push(...cseg);
        first = false;
      } else {
        segs.push(...sep, ...cseg);
      }
    }
    return line(...segs);
  }

  function fits(row: Line): boolean {
    return vlen(textOf(row)) <= avail;
  }

  function demote(item: string, target: string): void {
    const order = RUNG_ORDERS[item];
    if (order === undefined) {
      return;
    }
    const at = order.indexOf(picks[item]);
    if (order.slice(at + 1).includes(target)) {
      picks[item] = target;
    }
  }

  function resetRungs(): void {
    model = row.model;
    for (const [item, pick] of initialRungs) {
      picks[item] = pick;
    }
  }

  function applyStep(step: FitStep): void {
    if (step[0] === 'model' && step[1] === 'strip') {
      model = stripModelSuffix(model);
    } else {
      demote(step[0], step[1]);
    }
  }

  function fit(mode: Mode, steps: readonly FitStep[]): Line {
    let out = compose(mode);
    if (fits(out)) {
      return out;
    }
    for (const step of steps) {
      applyStep(step);
      out = compose(mode);
      if (fits(out)) {
        return out;
      }
    }
    return out;
  }

  function emit(row: Line): string {
    const text = input.noColor === true ? textOf(row) : toSgr(row);
    return `${text}\n`;
  }

  const full = fit('full', FULL_STEPS);
  if (fits(full)) {
    return emit(full);
  }
  resetRungs();
  const l1 = fit('l1', L1_STEPS);
  const l2 = fit('l2', L2_STEPS);
  return emit(l1) + emit(l2);
}
