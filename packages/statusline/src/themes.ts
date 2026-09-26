import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type ResolvedRuntime,
  resolveRuntime,
  resolveRuntimeDir,
  type RuntimeItem,
} from './resolve.js';

export type ThemeName = 'classic' | 'custom' | 'lean' | 'quiet' | 'rich';

export interface Theme {
  readonly layout: string;
  readonly summary: string;
  readonly variants: Readonly<Record<string, string>>;
}

// From the checkout the working-tree runtime is the registry the pin test
// derives from; installed, only the cache under the home exists.
const RUNTIME_SOURCE = fileURLToPath(
  new URL('../../../plugins/statusline/runtime', import.meta.url),
);

function registryAtLoad(): ResolvedRuntime {
  if (existsSync(join(RUNTIME_SOURCE, 'statusline.sh'))) {
    return resolveRuntimeDir(RUNTIME_SOURCE);
  }
  return resolveRuntime({ home: process.env.HOME ?? homedir() });
}

const runtime = registryAtLoad();

const CUSTOM_SEEDS: Readonly<Partial<Record<string, string>>> = {
  branch: 'last',
  cwd: 'base',
  model: 'zen',
  style: 'bare',
};

function offers(item: RuntimeItem, variant: string): boolean {
  return item.default === variant || item.alternatives.includes(variant);
}

function absenceSeed(item: RuntimeItem): string {
  if (offers(item, 'none')) {
    return 'none';
  }
  if (offers(item, 'hidden')) {
    return 'hidden';
  }
  const named = CUSTOM_SEEDS[item.item];
  if (named === undefined) {
    throw new Error(`no absence variant for '${item.item}' — name its seed`);
  }
  return named;
}

function variantsOf(
  pick: (item: RuntimeItem) => string,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    runtime.items.map((item): [string, string] => [item.item, pick(item)]),
  );
}

export const THEMES: Readonly<Record<ThemeName, Theme>> = {
  quiet: {
    layout: '{model cwd}',
    summary: 'model and directory, nothing else',
    variants: { cwd: 'tail', model: 'zen', style: 'bare' },
  },
  classic: {
    layout: runtime.defaultLayout,
    summary: 'the shipped defaults, named',
    variants: variantsOf(item => item.default),
  },
  lean: {
    layout: runtime.defaultLayout,
    summary: 'text only, no graphics',
    variants: {
      model: 'plain',
      effort: 'dim',
      state: 'none',
      cwd: 'init',
      branch: 'initials',
      status: 'counts',
      ahead: 'arrows',
      pr: 'badge',
      bar: 'percent',
      tokens: 'full',
      cache: 'hit',
      cost: 'plain',
      duration: 'clock',
      lines: 'diffstat',
      rate: 'none',
      style: 'dots',
    },
  },
  rich: {
    layout: runtime.defaultLayout,
    summary: 'every gauge and counter',
    variants: {
      model: 'pill',
      effort: 'plain',
      state: 'pills',
      cwd: 'icon',
      branch: 'icon',
      status: 'icons',
      ahead: 'arrows',
      pr: 'badge',
      bar: 'gauge',
      tokens: 'full',
      cache: 'fuse',
      cost: 'burn',
      duration: 'clock',
      lines: 'diffstat',
      rate: 'strip',
      style: 'plain',
    },
  },
  custom: {
    layout: runtime.defaultLayout,
    summary: 'bare; you decide everything',
    variants: variantsOf(absenceSeed),
  },
};
