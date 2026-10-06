import { rmSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { BUNDLED_RENDERER } from '../src/configure.js';
import { DEFAULT_LAYOUT, ITEMS } from '../src/render/index.js';
import { renderPanel } from '../src/render/panel.js';
import { resolvePaint } from '../src/render/theme.js';
import * as themes from '../src/themes.js';
import {
  createDemoHome,
  DEFAULT_NOW,
  loadPayload,
  renderAt,
  runRenderer,
  tickStdin,
  type DemoHome,
} from './runtime.js';

// One theme's content pinned verbatim as the independent oracle; the rest
// are pinned by rule — what each theme IS derives from the registry, so the
// tests check the rule, never a second hand-copied table.
const QUIET_LAYOUT = '{model cwd}';

const QUIET_VARIANTS: Readonly<Record<string, string>> = {
  cwd: 'tail',
  model: 'zen',
  style: 'bare',
};

// Custom seeds bare: `none` where the registry offers it, effort's absence
// word `hidden`, and a minimal pick for the three items with no absence word.
const NAMED_MINIMA: Readonly<Partial<Record<string, string>>> = {
  cwd: 'base',
  model: 'zen',
  style: 'bare',
};

const CUSTOM_SEED: Readonly<Record<string, string>> = Object.fromEntries(
  ITEMS.map(({ alternatives, item }) => [
    item,
    alternatives.includes('none')
      ? 'none'
      : item === 'effort'
        ? 'hidden'
        : (NAMED_MINIMA[item] as string),
  ]),
);

const THEME_NAMES = themes.THEME_NAMES;
const THEMES = themes.THEMES;

describe('themes: surface', () => {
  it('exports only THEME_NAMES and THEMES; the record is keyed by exactly the five themes', () => {
    expect(Object.keys(themes)).toEqual(['THEME_NAMES', 'THEMES']);
    expect([...themes.THEME_NAMES]).toEqual([...THEME_NAMES]);
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES]);
  });

  it.each([...THEME_NAMES])(
    '%s is data only — layout, variants, summary',
    name => {
      expect(Object.keys(THEMES[name]).sort()).toEqual([
        'layout',
        'summary',
        'variants',
      ]);
    },
  );
});

describe('themes: layouts', () => {
  it('quiet verbatim; the other four are the registry default layout', () => {
    expect(THEMES.quiet.layout).toBe(QUIET_LAYOUT);
    for (const name of ['classic', 'custom', 'lean', 'rich'] as const) {
      expect(THEMES[name].layout, name).toBe(DEFAULT_LAYOUT);
    }
  });
});

describe('themes: variant picks', () => {
  it('quiet carries its list exactly, style included', () => {
    expect(THEMES.quiet.variants).toEqual(QUIET_VARIANTS);
  });

  it('classic resolves exactly like no theme — the defaults, named', () => {
    expect(resolvePaint({ theme: 'classic' })).toEqual(resolvePaint({}));
  });

  it('custom seeds bare — none where offered, hidden for effort, minimal otherwise', () => {
    expect(THEMES.custom.variants).toEqual(CUSTOM_SEED);
  });
});

describe('themes: registry pin', () => {
  it.each([...THEME_NAMES])(
    '%s picks only registry items, at variants they offer',
    name => {
      const picks = Object.entries(THEMES[name].variants);

      for (const [item, variant] of picks) {
        const entry = ITEMS.find(spec => spec.item === item);
        expect(entry, `${name} picks unknown item '${item}'`).toBeDefined();
        expect(
          entry !== undefined &&
            (entry.default === variant || entry.alternatives.includes(variant)),
          `${name}: '${item}' offers no '${variant}'`,
        ).toBe(true);
      }
    },
  );
});

// The equivalence core: for every theme, the paint resolver's output must be
// exactly the theme table's own layout and picks (the data the key's --theme
// names), and both doors must render the same bytes from it.

let demo: DemoHome | undefined;
let mainPayload = '';
const tickPayload = tickStdin();

beforeAll(() => {
  demo = createDemoHome();
  const payload = loadPayload('p1');
  payload.workspace = { current_dir: demo.repoDir };
  mainPayload = `${JSON.stringify(payload, null, 2)}\n`;
});

afterAll(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
  }
});

function lineBytes(
  layout: string,
  picks: Readonly<Record<string, string>>,
  columns?: number,
): string {
  if (demo === undefined) {
    throw new Error('demo home not materialized');
  }
  return renderAt(demo, loadPayload('p1'), {
    layout,
    picks,
    ...(columns === undefined ? {} : { columns }),
  });
}

function panelBytes(picks: Readonly<Record<string, string>>): string {
  if (demo === undefined) {
    throw new Error('demo home not materialized');
  }
  return renderPanel({
    now: Number(DEFAULT_NOW),
    payload: tickPayload,
    picks,
  });
}

describe('resolvePaint: the five themes carry their own table rows', () => {
  it.each([...THEME_NAMES])(
    '%s resolves to its layout and picks',
    name => {
      expect(resolvePaint({ theme: name })).toEqual({
        layout: THEMES[name].layout,
        picks: THEMES[name].variants,
      });
    },
  );

  it("custom's absence seeds contribute no bytes to the rendered line", () => {
    if (demo === undefined) {
      throw new Error('demo home not materialized');
    }
    const resolved = resolvePaint({ theme: 'custom' });
    const full = lineBytes(resolved.layout, resolved.picks);
    const repoBase = demo.repoDir.slice(demo.repoDir.lastIndexOf('/') + 1);

    expect(full).toContain('opus');
    expect(full).toContain(repoBase);
    expect(full).not.toContain('login-flow');
    expect(full).not.toContain('⚡');
    expect(full).not.toContain('%');
    expect(full).not.toContain('$');
    expect(full).not.toContain('█');
    expect(full).not.toContain('░');
    // The twelve `none` picks and effort's `hidden` render nothing, so the
    // full default layout collapses to exactly the two surviving items.
    expect(full).toBe(lineBytes('{model} {cwd}', resolved.picks));
  });
});

describe('resolvePaint: precedence', () => {
  it('an item flag beats the theme pick; the rest of the theme holds', () => {
    expect(resolvePaint({ theme: 'rich', picks: { bar: 'percent' } })).toEqual({
      layout: THEMES.rich.layout,
      picks: { ...THEMES.rich.variants, bar: 'percent' },
    });
  });

  it('a flag-over-theme render equals the table picks with the flag applied', () => {
    const resolved = resolvePaint({ theme: 'rich', picks: { bar: 'percent' } });
    const table = { ...THEMES.rich.variants, bar: 'percent' };
    expect(lineBytes(resolved.layout, resolved.picks)).toBe(
      lineBytes(THEMES.rich.layout, table),
    );
    expect(panelBytes(resolved.picks)).toBe(panelBytes(table));
  });

  it('--layout beats the theme layout; the theme picks still hold', () => {
    expect(resolvePaint({ theme: 'quiet', layout: '{model}' })).toEqual({
      layout: '{model}',
      picks: THEMES.quiet.variants,
    });
  });

  it('no theme leaves the registry defaults, flags kept', () => {
    expect(resolvePaint({})).toEqual({ layout: DEFAULT_LAYOUT, picks: {} });
    expect(resolvePaint({ picks: { bar: 'gauge' } })).toEqual({
      layout: DEFAULT_LAYOUT,
      picks: { bar: 'gauge' },
    });
  });

  it('an unknown theme warns and paints the defaults', () => {
    const writes: string[] = [];
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(chunk => {
        writes.push(String(chunk));
        return true;
      });
    try {
      expect(resolvePaint({ theme: 'wat' })).toEqual({
        layout: DEFAULT_LAYOUT,
        picks: {},
      });
    } finally {
      stderr.mockRestore();
    }
    const warned = writes.join('');
    expect(warned).toContain('wat');
    expect(warned).toMatch(/theme/i);
  });
});

describe('the entry resolves --theme at paint', () => {
  const runPaint = (args: readonly string[], stdin: string) =>
    runRenderer([BUNDLED_RENDERER, ...args], demo?.home ?? '', stdin);

  it('a hand-written key spelling --theme=lean paints the lean line', () => {
    const painted = runPaint(
      ['--theme=lean', `--now=${DEFAULT_NOW}`],
      mainPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(
      lineBytes(THEMES.lean.layout, THEMES.lean.variants),
    );
  });

  it('the subagent key spelling --subagent --theme=lean paints the lean panel', () => {
    const painted = runPaint(
      ['--subagent', '--theme=lean', `--now=${DEFAULT_NOW}`],
      tickPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(panelBytes(THEMES.lean.variants));
  });

  it('an unknown theme on the key paints the default line', () => {
    const painted = runPaint(
      [`--theme=wat`, `--now=${DEFAULT_NOW}`],
      mainPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(lineBytes(DEFAULT_LAYOUT, {}));
    expect(painted.stderr).toContain('wat');
    expect(painted.stderr).toMatch(/theme/i);
  });
});
