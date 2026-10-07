import { DEFAULT_LAYOUT } from './render/items.js';

export const THEME_NAMES = [
  'classic',
  'custom',
  'lean',
  'quiet',
  'rich',
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export interface Theme {
  readonly layout: string;
  readonly summary: string;
  readonly variants: Readonly<Record<string, string>>;
}

// The record's key order is the listing order catalog and the wizard print.
export const THEMES: Readonly<Record<ThemeName, Theme>> = {
  quiet: {
    layout: '{model cwd}',
    summary: 'model and directory, nothing else',
    variants: { cwd: 'tail', model: 'zen', style: 'bare' },
  },
  // The shipped defaults, named: an empty variants record resolves exactly
  // like no theme at all.
  classic: {
    layout: DEFAULT_LAYOUT,
    summary: 'the shipped defaults, named',
    variants: {},
  },
  lean: {
    layout: DEFAULT_LAYOUT,
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
      'cache-hit': 'plain',
      'cache-expiry': 'none',
      cost: 'plain',
      duration: 'clock',
      lines: 'diffstat',
      rate: 'none',
      style: 'dots',
    },
  },
  rich: {
    layout: DEFAULT_LAYOUT,
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
      'cache-hit': 'none',
      'cache-expiry': 'fuse',
      cost: 'burn',
      duration: 'clock',
      lines: 'diffstat',
      rate: 'strip',
      style: 'plain',
    },
  },
  custom: {
    layout: DEFAULT_LAYOUT,
    summary: 'bare; you decide everything',
    variants: {
      model: 'zen',
      effort: 'hidden',
      state: 'none',
      cwd: 'base',
      branch: 'none',
      status: 'none',
      ahead: 'none',
      pr: 'none',
      bar: 'none',
      tokens: 'none',
      'cache-hit': 'none',
      'cache-expiry': 'none',
      cost: 'none',
      duration: 'none',
      lines: 'none',
      rate: 'none',
      style: 'bare',
    },
  },
};
