import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The panel door implemented in src/render/panel.ts — a second renderer by
// ruling: its own vlen (jq codepoint semantics) and its own fit ladder, never
// unified with the main engine. The row speaks the theme's grammar: the theme's
// layout filtered to the six task items (state, model, effort, bar, tokens,
// duration), forms from the shared segment registry, the task's label and
// description leading.
//   renderPanel({ layout?, payload, now, picks?, noColor? }): string
// payload is the tick JSON text exactly as the key's stdin; the panel owns the
// parse — width comes from the payload's own `columns` field (absent -> 200,
// non-numeric -> 200, floor 20, available = columns - 1), rows from tasks[]
// (a task without id renders no line). picks map item -> alternative (the task
// items and style are consumed), noColor is NO_COLOR. The return is the emitted
// stdout: one jq -c JSON line per identified task, '\n'-joined with a trailing
// '\n'. Every golden pins now = DEFAULT_NOW; unlike the engine corpus there
// are no oracle cases — each panel golden is exact stdout. REGEN_GOLDENS=1
// rewrites the .ans files instead of comparing.
import { renderPanel } from '../src/render/panel.js';
import { THEMES, THEME_NAMES } from '../src/themes.js';
import {
  DEFAULT_LAYOUT,
  DEFAULT_PICKS,
  specFor,
} from '../src/render/items.js';
import { DEFAULT_NOW, GOLDENS_DIR, golden, loadTick } from './runtime.js';

type Loose = Record<string, unknown>;

export interface PanelCase {
  readonly name: string;
  readonly columns?: number | 'junk' | 'absent';
  readonly noColor?: boolean;
  readonly picks?: Readonly<Record<string, string>>;
  readonly mutate?: (tick: Loose) => void;
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
export const PANEL_CORPUS: readonly PanelCase[] = [
  { name: 'multi-default' },
  { name: 'multi-cols-80', columns: 80 },
  { name: 'multi-cols-60', columns: 60 }, // explore desc dropped 59 ==
  { name: 'multi-cols-52', columns: 52 }, // explore duration none 51 ==
  { name: 'multi-cols-45', columns: 45 }, // explore tokens compact 44 ==
  { name: 'multi-cols-41', columns: 41 }, // explore bar flat6 40 ==
  { name: 'multi-cols-36', columns: 36 }, // explore model stripped 35 ==
  { name: 'multi-cols-34', columns: 34 }, // explore bar flat4 33 ==
  { name: 'multi-cols-29', columns: 29 }, // explore effort hidden 28 ==
  { name: 'multi-cols-24', columns: 24 }, // explore tokens none 23 ==
  { name: 'multi-cols-23', columns: 23 }, // explore bar percent 22 ==
  { name: 'multi-cols-17', columns: 17 }, // explore bar none 16 ==
  { name: 'multi-cols-20', columns: 20 }, // the floor: avail 19, every row fits bare
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
    if (process.env.REGEN_GOLDENS === '1') {
      writeFileSync(join(GOLDENS_DIR, `${c.name}.ans`), out);
      return;
    }
    expect(Buffer.from(out, 'utf8'), c.name).toEqual(golden(c.name));
  });
});

// The panel twin of the engine corpus's "every registered alternative has a
// segment renderer": every theme that picks differently for a task item or
// filters the layout differently must move the row, and every registered
// alternative of a task item must move it — a pick the panel silently
// ignores cannot exist while these hold.
const TASK_ITEMS = [
  'state',
  'model',
  'effort',
  'bar',
  'tokens',
  'duration',
] as const;

function paintPanel(
  layout: string,
  picks: Readonly<Record<string, string>>,
): string {
  return renderPanel({
    layout,
    now: Number(DEFAULT_NOW),
    payload: JSON.stringify(loadTick(), null, 2),
    picks,
  });
}

describe('the theme reaches the panel', () => {
  it.each([...THEME_NAMES])(
    '%s changes the row wherever its task picks differ',
    name => {
      const { layout, variants } = THEMES[name];
      const themed = paintPanel(layout, variants);
      const bare = paintPanel(DEFAULT_LAYOUT, {});
      const picksDiffer = TASK_ITEMS.some(
        item =>
          variants[item] !== undefined &&
          variants[item] !== DEFAULT_PICKS[item],
      );
      const layoutDiffers =
        layout.replace(/[^a-z-]/g, '') !==
        DEFAULT_LAYOUT.replace(/[^a-z-]/g, '');
      expect(themed === bare).toBe(!picksDiffer && !layoutDiffers);
    },
  );

  it.each([...TASK_ITEMS])('%s: every alternative moves the row', item => {
    const spec = specFor(item);
    if (spec === undefined) {
      throw new Error(`no spec for ${item}`);
    }
    const bare = paintPanel(DEFAULT_LAYOUT, {});
    for (const alt of spec.alternatives) {
      if (alt === spec.default) {
        continue;
      }
      expect(
        paintPanel(DEFAULT_LAYOUT, { [item]: alt }),
        `${item}=${alt}`,
      ).not.toBe(bare);
    }
  });
});
