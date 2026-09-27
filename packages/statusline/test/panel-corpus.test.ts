import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// The panel door implemented in src/render/panel.ts (r2: the port of
// plugins/statusline/runtime/subagent.sh, exact — its own vlen with jq
// codepoint semantics, its own fit ladder, make_bar, fmt_k, the 24-char
// description truncation, the ms-vs-s startTime heuristic — never unified
// with the main engine):
//   renderPanel({ payload, now, picks?, noColor? }): string
// payload is the tick JSON text exactly as subagent.sh's stdin; the panel
// owns the parse — width comes from the payload's own `columns` field
// (absent -> 200, non-numeric -> 200, floor 20, available = columns - 1),
// rows from tasks[] (a task without id renders no line). picks map
// item -> alternative (only style is consumed), noColor is NO_COLOR. The
// return is the emitted stdout: one jq -c JSON line per identified task,
// '\n'-joined with a trailing '\n'. Every golden pins now = DEFAULT_NOW;
// unlike the engine corpus there are no oracle cases — each panel golden
// is exact stdout.
import { renderPanel } from '../src/render/panel.js';
import { DEFAULT_NOW, golden } from './runtime.js';

const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
const GOLDENS_DIR = fileURLToPath(new URL('./goldens', import.meta.url));

type Loose = Record<string, unknown>;

export interface PanelCase {
  readonly name: string;
  readonly columns?: number | 'junk' | 'absent';
  readonly noColor?: boolean;
  readonly picks?: Readonly<Record<string, string>>;
  readonly mutate?: (tick: Loose) => void;
}

function loadTick(): Loose {
  return JSON.parse(
    readFileSync(join(TICKS_DIR, 'multi.json'), 'utf8'),
  ) as Loose;
}

function row(tick: Loose, id: string): Loose {
  const task = (tick.tasks as Loose[]).find(t => t.id === id);
  if (!task) {
    throw new Error(`tick row not found: ${id}`);
  }
  return task;
}

// Widths sit on measured rung boundaries of the bash ladder (AVAIL =
// columns - 1): each pinned row's visible length equals AVAIL exactly at
// the widths marked `==`.
const PANEL_CORPUS: readonly PanelCase[] = [
  { name: 'multi-default' },
  { name: 'multi-cols-80', columns: 80 },
  { name: 'multi-cols-56', columns: 56 }, // explore DURD 55 ==
  { name: 'multi-cols-45', columns: 45 }, // explore BARB=6 44 ==
  { name: 'multi-cols-33', columns: 33 }, // explore BARB=0 32 ==, tests MODELD=1 32 ==
  { name: 'multi-cols-28', columns: 28 }, // explore MODELD=2 27 ==, tests BARB=4 27 ==
  { name: 'multi-cols-21', columns: 21 }, // tests 20 ==
  { name: 'multi-cols-20', columns: 20 }, // fork floor 19 ==, explore overflows
  { name: 'multi-cols-5', columns: 5 }, // below-floor clamp; bytes equal cols-20
  { name: 'multi-cols-40', columns: 40 },
  { name: 'multi-cols-junk', columns: 'junk' }, // non-numeric -> 200
  { name: 'multi-nocols', columns: 'absent' }, // field missing -> 200
  { name: 'multi-style-dots', picks: { style: 'dots' } },
  { name: 'multi-style-dim', picks: { style: 'dim' } },
  { name: 'multi-style-bare', picks: { style: 'bare' } },
  { name: 'multi-nocolor', noColor: true },
  {
    // description length 24 stays whole; 25 truncates to 23 + "…"
    name: 'multi-desc-edge',
    mutate: tick => {
      row(tick, 'row-explore').description = 'Reading unit two pattern';
      row(tick, 'row-tests').description = 'Golden capture for rows!!';
    },
  },
  {
    // sub-1000 tokens skip fmt_k; pct 999*100/180000 truncates to 0
    name: 'multi-tokens-999',
    mutate: tick => {
      row(tick, 'row-tests').tokenCount = 999;
    },
  },
  {
    // token tie: fmt_k(1250, 1) rounds 1.25 to even "1.2k", not "1.3k"
    name: 'multi-tokens-1250',
    mutate: tick => {
      row(tick, 'row-tests').tokenCount = 1250;
    },
  },
  {
    // row is 16 codepoints / 17 UTF-16 units / 19 bytes at AVAIL 16 — only
    // codepoint vlen keeps the description
    name: 'multi-emoji',
    columns: 17,
    mutate: tick => {
      row(tick, 'row-idle').description = 'Ship 🚀 soon';
    },
  },
  {
    // pct 120: make_bar clamps full, the label prints the raw percent
    name: 'multi-over100',
    mutate: tick => {
      row(tick, 'row-fork').tokenCount = 1200000;
    },
  },
];

function renderCase(c: PanelCase): string {
  const tick = loadTick();
  c.mutate?.(tick);
  if (c.columns === 'absent') {
    delete tick.columns;
  } else if (c.columns === 'junk') {
    tick.columns = 'wide';
  } else if (c.columns !== undefined) {
    tick.columns = c.columns;
  }
  return renderPanel({
    payload: JSON.stringify(tick, null, 2),
    now: Number(DEFAULT_NOW),
    ...(c.picks === undefined ? {} : { picks: c.picks }),
    ...(c.noColor === undefined ? {} : { noColor: c.noColor }),
  });
}

describe('the src/render panel door', () => {
  it('covers every panel golden in test/goldens', () => {
    const onDisk = readdirSync(GOLDENS_DIR)
      .filter(file => file.endsWith('.ans'))
      .filter(file => file.startsWith('multi-'))
      .map(file => file.slice(0, -'.ans'.length))
      .sort();
    const covered = PANEL_CORPUS.map(c => c.name).sort();
    expect(covered).toEqual(onDisk);
  });
});

describe('the panel golden corpus through the engine', () => {
  it.each(PANEL_CORPUS)('$name renders byte-identical', c => {
    const out = renderCase(c);
    expect(Buffer.from(out, 'utf8'), c.name).toEqual(golden(c.name));
  });
});
