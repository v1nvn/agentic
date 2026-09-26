import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveRuntime, resolveRuntimeDir } from '../src/resolve.js';
import * as themes from '../src/themes.js';
import { createHomes, installRuntime, RUNTIME_SOURCE } from './fixtures.js';

// The Design block's literal theme definitions — the pin the builder
// implements to. Only classic's default picks and the layout/membership
// cross-checks derive from the resolved runtime below.
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

// Custom seeds bare — the Design block's sixteen pairs: `none` for the
// eleven items that offer it, effort's absence word `hidden`, and the four
// named picks for the items with no absence word.
const CUSTOM_VARIANTS: Readonly<Record<string, string>> = {
  ahead: 'none',
  bar: 'none',
  branch: 'last',
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

const THEMES = themes.themesFor(resolveRuntimeDir(RUNTIME_SOURCE));

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function registry() {
  const home = homes.newHome();
  installRuntime(home);
  return resolveRuntime({ home });
}

describe('themes: surface', () => {
  it('exports only THEME_NAMES and themesFor; the record is keyed by exactly the five themes', () => {
    expect(Object.keys(themes)).toEqual(['THEME_NAMES', 'themesFor']);
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

describe('themes: derivation', () => {
  it('follows the runtime it is given, not any ambient registry', () => {
    const home = homes.newHome();
    const dir = installRuntime(home);
    const model = resolveRuntime({ home }).items.find(
      item => item.item === 'model',
    );
    if (model === undefined) {
      throw new Error('registry declares no model item');
    }
    const other = model.alternatives.find(alt => alt !== model.default);
    if (other === undefined) {
      throw new Error('model item offers no alternative to its default');
    }
    const lib = join(dir, 'lib.sh');
    writeFileSync(
      lib,
      readFileSync(lib, 'utf8').replace(
        /model\) echo [a-z]+ ;;/,
        `model) echo ${other} ;;`,
      ),
    );

    expect(THEMES.classic.variants.model).toBe(model.default);
    expect(
      themes.themesFor(resolveRuntime({ home })).classic.variants.model,
    ).toBe(other);
  });
});

describe('themes: layouts', () => {
  it('quiet verbatim; the other four are the runtime default layout', () => {
    const runtime = registry();

    expect(THEMES.quiet.layout).toBe(QUIET_LAYOUT);
    for (const name of DEFAULT_LAYOUT_THEMES) {
      expect(THEMES[name].layout, name).toBe(runtime.defaultLayout);
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
    const runtime = registry();

    expect(THEMES.classic.variants).toEqual(
      Object.fromEntries(runtime.items.map(item => [item.item, item.default])),
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
      const runtime = registry();
      const byItem = new Map(runtime.items.map(item => [item.item, item]));
      const picks = Object.entries(THEMES[name].variants);

      for (const [item, variant] of picks) {
        const entry = byItem.get(item);
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
