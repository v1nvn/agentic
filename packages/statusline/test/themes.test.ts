import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { BUNDLED_RENDERER } from '../src/configure.js';
import { renderStatusline } from '../src/render/engine.js';
import { DEFAULT_LAYOUT, ITEMS } from '../src/render/index.js';
import { renderPanel } from '../src/render/panel.js';
import { resolvePaint } from '../src/render/theme.js';
import * as themes from '../src/themes.js';
import { createDemoHome, DEFAULT_NOW, tickStdin, type DemoHome } from './runtime.js';

// The Design block's literal theme definitions — the pin the builder
// implements to. Classic's default picks and the layout/membership
// cross-checks derive from the registry below.
const QUIET_LAYOUT = '{model cwd}';

const QUIET_VARIANTS: Readonly<Record<string, string>> = {
  cwd: 'tail',
  model: 'zen',
  style: 'bare',
};

const LEAN_VARIANTS: Readonly<Record<string, string>> = {
  ahead: 'arrows',
  bar: 'percent',
  branch: 'initials',
  cache: 'hit',
  cost: 'plain',
  cwd: 'init',
  duration: 'clock',
  effort: 'dim',
  lines: 'diffstat',
  model: 'plain',
  pr: 'badge',
  rate: 'none',
  state: 'none',
  status: 'counts',
  style: 'dots',
  tokens: 'full',
};

const RICH_VARIANTS: Readonly<Record<string, string>> = {
  ahead: 'arrows',
  bar: 'gauge',
  branch: 'icon',
  cache: 'fuse',
  cost: 'burn',
  cwd: 'icon',
  duration: 'clock',
  effort: 'plain',
  lines: 'diffstat',
  model: 'pill',
  pr: 'badge',
  rate: 'strip',
  state: 'pills',
  status: 'icons',
  style: 'plain',
  tokens: 'full',
};

// Custom seeds bare — sixteen pairs: `none` for the twelve items that offer
// it (branch included — the registry knows the inline shim the old bash
// scrape could not see), effort's absence word `hidden`, and the three named
// picks for the items with no absence word.
const CUSTOM_VARIANTS: Readonly<Record<string, string>> = {
  ahead: 'none',
  bar: 'none',
  branch: 'none',
  cache: 'none',
  cost: 'none',
  cwd: 'base',
  duration: 'none',
  effort: 'hidden',
  lines: 'none',
  model: 'zen',
  pr: 'none',
  rate: 'none',
  state: 'none',
  status: 'none',
  style: 'bare',
  tokens: 'none',
};

const SUMMARIES: Readonly<Record<string, string>> = {
  classic: 'the shipped defaults, named',
  custom: 'bare; you decide everything',
  lean: 'text only, no graphics',
  quiet: 'model and directory, nothing else',
  rich: 'every gauge and counter',
};

const THEME_NAMES = [
  'classic',
  'custom',
  'lean',
  'quiet',
  'rich',
] as const satisfies readonly string[];

const DEFAULT_LAYOUT_THEMES = [
  'classic',
  'custom',
  'lean',
  'rich',
] as const satisfies readonly string[];

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
    for (const name of DEFAULT_LAYOUT_THEMES) {
      expect(THEMES[name].layout, name).toBe(DEFAULT_LAYOUT);
    }
  });
});

describe('themes: variant picks', () => {
  it('quiet, lean, and rich carry the Design lists exactly, style included', () => {
    expect(THEMES.quiet.variants).toEqual(QUIET_VARIANTS);
    expect(THEMES.lean.variants).toEqual(LEAN_VARIANTS);
    expect(THEMES.rich.variants).toEqual(RICH_VARIANTS);
  });

  it('classic is every registry item at its default pick', () => {
    expect(THEMES.classic.variants).toEqual(
      Object.fromEntries(ITEMS.map(({ default: def, item }) => [item, def])),
    );
  });

  it('custom seeds bare — the sixteen literal most-absent pairs', () => {
    expect(THEMES.custom.variants).toEqual(CUSTOM_VARIANTS);
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

describe('themes: summaries', () => {
  it('each theme carries its Design phrase verbatim', () => {
    for (const name of THEME_NAMES) {
      expect(THEMES[name].summary, name).toBe(SUMMARIES[name]);
    }
  });
});

// The equivalence core: for every theme, the paint resolver's output must be
// exactly the theme table's own layout and picks (the data the key's --theme
// names), and both doors must render the same bytes from it.

let demo: DemoHome | undefined;
let mainPayload = '';
const tickPayload = tickStdin();

beforeAll(() => {
  demo = createDemoHome();
  const payload = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../assets/payloads/p1.json', import.meta.url)),
      'utf8',
    ),
  ) as Record<string, unknown>;
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
  return renderStatusline({
    home: demo.home,
    layout,
    now: Number(DEFAULT_NOW),
    payload: mainPayload,
    picks,
    timeZone: 'UTC',
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

  it.each([...THEME_NAMES])(
    '%s renders byte-identical on the line, wide and narrow',
    name => {
      const resolved = resolvePaint({ theme: name });
      for (const columns of [200, 60]) {
        expect(
          lineBytes(resolved.layout, resolved.picks, columns),
          `${name} at ${columns}`,
        ).toBe(lineBytes(THEMES[name].layout, THEMES[name].variants, columns));
      }
    },
  );

  it.each([...THEME_NAMES])(
    '%s renders byte-identical on the panel (the theme style)',
    name => {
      expect(panelBytes(resolvePaint({ theme: name }).picks)).toBe(
        panelBytes(THEMES[name].variants),
      );
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
  function runRenderer(
    args: readonly string[],
    stdin: string,
  ): { readonly status: number; readonly stderr: string; readonly stdout: string } {
    const run = spawnSync('node', [BUNDLED_RENDERER, ...args], {
      input: stdin,
      env: {
        HOME: demo?.home ?? '',
        LC_ALL: 'C',
        PATH: process.env.PATH ?? '',
        TZ: 'UTC',
      },
      timeout: 30_000,
    });
    return {
      status: run.status ?? -1,
      stderr: (run.stderr ?? Buffer.alloc(0)).toString('utf8'),
      stdout: (run.stdout ?? Buffer.alloc(0)).toString('utf8'),
    };
  }

  it('a hand-written key spelling --theme=lean paints the lean line', () => {
    const painted = runRenderer(
      ['--theme=lean', `--now=${DEFAULT_NOW}`],
      mainPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(
      lineBytes(THEMES.lean.layout, THEMES.lean.variants),
    );
  });

  it('the panel key spelling --theme=lean paints the lean panel', () => {
    const painted = runRenderer(
      ['panel', '--theme=lean', `--now=${DEFAULT_NOW}`],
      tickPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(panelBytes(THEMES.lean.variants));
  });

  it('an unknown theme on the key paints the default line', () => {
    const painted = runRenderer(
      [`--theme=wat`, `--now=${DEFAULT_NOW}`],
      mainPayload,
    );

    expect(painted.status).toBe(0);
    expect(painted.stdout).toBe(lineBytes(DEFAULT_LAYOUT, {}));
    expect(painted.stderr).toContain('wat');
    expect(painted.stderr).toMatch(/theme/i);
  });
});
