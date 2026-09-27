import { readGit } from './git.js';
import {
  DEFAULT_LAYOUT,
  type FitStep,
  FULL_STEPS,
  ITEMS,
  L1_STEPS,
  L2_STEPS,
  RUNG_ORDERS,
} from './items.js';
import { parseClusters } from './layout.js';
import { parseRow } from './payload.js';
import {
  renderSegment,
  type SegmentInput,
  styleSeparators,
} from './segments.js';

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

export function stripSgr(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

// The bash vlen counts bytes minus UTF-8 continuation bytes — one per
// codepoint — then adds one more per ⚡, which renders two cells wide.
export function vlen(text: string): number {
  const plain = stripSgr(text);
  let n = Array.from(plain).length;
  for (const ch of plain) {
    if (ch === '⚡') {
      n += 1;
    }
  }
  return n;
}

export function warn(message: string): void {
  process.stderr.write(`${message}\n`);
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
    const pick = picks?.[spec.item] ?? spec.default;
    if (spec.alternatives.includes(pick)) {
      resolved[spec.item] = pick;
    } else {
      warn(
        `statusline: ${spec.item}=${pick} is not available, using ${spec.item}=${spec.default}`,
      );
      resolved[spec.item] = spec.default;
    }
  }
  return resolved;
}

// The writer's grammar parser, degraded for paint: malformed grammar renders
// nothing (configure never writes one), unknown item names warn and skip.
function parseLayout(
  layout: string,
  known: ReadonlySet<string>,
): readonly (readonly string[])[] {
  let parsed: readonly string[][];
  try {
    parsed = parseClusters(layout);
  } catch (e) {
    warn(`statusline: ${(e as Error).message}`);
    return [];
  }
  const clusters: (readonly string[])[] = [];
  for (const words of parsed) {
    const kept = words.filter(word => {
      if (known.has(word)) {
        return true;
      }
      warn(`statusline: layout item '${word}' is not available, skipped`);
      return false;
    });
    if (kept.length > 0) {
      clusters.push(kept);
    }
  }
  return clusters;
}

export function renderStatusline(input: RenderInput): string {
  const row = parseRow(input.payload);
  const git = readGit(row.dir, { home: input.home });
  const picks = resolvePicks(input.picks);
  const { join, sep } = styleSeparators(picks.style);
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

  function compose(mode: Mode): string {
    const from = mode === 'l2' ? wrapAt : 0;
    const to = mode === 'l1' ? wrapAt : clusters.length;
    let line = '';
    let first = true;
    for (let ci = from; ci < to; ci++) {
      let cseg = '';
      let cf = true;
      for (const item of clusters[ci]) {
        const out = renderSegment(item, picks[item], segmentInput());
        if (out === '') {
          continue;
        }
        if (cf) {
          cseg = out;
          cf = false;
        } else {
          cseg += join + out;
        }
      }
      if (cseg === '') {
        continue;
      }
      if (first) {
        line = cseg;
        first = false;
      } else {
        line += sep + cseg;
      }
    }
    return line;
  }

  function fits(line: string): boolean {
    return vlen(line) <= avail;
  }

  function demote(item: string, target: string): void {
    const order = RUNG_ORDERS[item];
    if (order === undefined) {
      return;
    }
    const at = order.indexOf(picks[item]);
    if (at === -1) {
      return;
    }
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

  function fit(mode: Mode, steps: readonly FitStep[]): string {
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

  function emit(line: string): string {
    const text = input.noColor === true ? stripSgr(line) : line;
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
