export interface ItemSpec {
  readonly alternatives: readonly string[];
  readonly default: string;
  readonly item: string;
}

// The one item registry, shared by the renderer and the CLI: 17 items in
// paint order, including the three rungs no component header ever declared
// (branch=none, bar=flat6, bar=flat4).
export const ITEMS: readonly ItemSpec[] = [
  {
    alternatives: ['plain', 'block', 'pill', 'zen'],
    default: 'plain',
    item: 'model',
  },
  {
    alternatives: ['plain', 'dim', 'hidden'],
    default: 'plain',
    item: 'effort',
  },
  { alternatives: ['none', 'pills'], default: 'none', item: 'state' },
  {
    alternatives: ['init', 'full', 'tail', 'base', 'icon'],
    default: 'init',
    item: 'cwd',
  },
  {
    alternatives: ['initials', 'full', 'last', 'icon', 'none'],
    default: 'initials',
    item: 'branch',
  },
  {
    alternatives: ['counts', 'icons', 'none'],
    default: 'counts',
    item: 'status',
  },
  { alternatives: ['none', 'arrows'], default: 'none', item: 'ahead' },
  { alternatives: ['none', 'badge'], default: 'none', item: 'pr' },
  {
    alternatives: ['flat', 'gauge', 'percent', 'none', 'flat6', 'flat4'],
    default: 'flat',
    item: 'bar',
  },
  {
    alternatives: ['full', 'compact', 'free', 'none'],
    default: 'full',
    item: 'tokens',
  },
  {
    alternatives: ['plain', 'none'],
    default: 'plain',
    item: 'cache-hit',
  },
  {
    alternatives: ['coldin', 'fuse', 'until', 'none'],
    default: 'until',
    item: 'cache-expiry',
  },
  { alternatives: ['plain', 'burn', 'none'], default: 'plain', item: 'cost' },
  {
    alternatives: ['clock', 'hours', 'none'],
    default: 'clock',
    item: 'duration',
  },
  { alternatives: ['none', 'diffstat'], default: 'none', item: 'lines' },
  { alternatives: ['none', 'strip'], default: 'none', item: 'rate' },
  {
    alternatives: ['plain', 'dots', 'dim', 'bare'],
    default: 'plain',
    item: 'style',
  },
];

export const DEFAULT_LAYOUT =
  '{model effort state} {cwd branch status ahead pr} {bar tokens} {cache-hit cache-expiry} {cost} {duration} {lines} {rate}';

// The registry's lookup door — every module that asks "is this item known,
// is this alt offered" comes through here, never a Map of its own.
const BY_ITEM = new Map(ITEMS.map(spec => [spec.item, spec]));

export function specFor(item: string): ItemSpec | undefined {
  return BY_ITEM.get(item);
}

export const ITEM_IDS: readonly string[] = ITEMS.map(spec => spec.item);

export const DEFAULT_PICKS: Readonly<Record<string, string>> =
  Object.fromEntries(ITEMS.map(({ default: alt, item }) => [item, alt]));

export const RUNG_ORDERS: Readonly<Partial<Record<string, readonly string[]>>> =
  {
    bar: ['flat', 'flat6', 'flat4', 'percent', 'none'],
    branch: ['icon', 'full', 'initials', 'last', 'none'],
    'cache-expiry': ['coldin', 'fuse', 'until', 'none'],
    'cache-hit': ['plain', 'none'],
    cwd: ['icon', 'full', 'init', 'tail', 'base'],
    duration: ['clock', 'hours', 'none'],
    effort: ['plain', 'dim', 'hidden'],
    status: ['counts', 'icons', 'none'],
    tokens: ['full', 'free', 'compact', 'none'],
  };

export type FitStep = readonly [item: string, alt: string];

export const FULL_STEPS: readonly FitStep[] = [
  ['duration', 'none'],
  ['cache-expiry', 'none'],
  ['tokens', 'compact'],
  ['bar', 'flat6'],
  ['status', 'none'],
  ['branch', 'initials'],
  ['cwd', 'init'],
  ['branch', 'last'],
  ['bar', 'flat4'],
  ['model', 'strip'],
  ['bar', 'percent'],
  ['branch', 'none'],
  ['cwd', 'tail'],
  ['effort', 'hidden'],
  ['cwd', 'base'],
  ['cache-hit', 'none'],
  ['tokens', 'none'],
];

export const L1_STEPS: readonly FitStep[] = [
  ['status', 'none'],
  ['branch', 'initials'],
  ['cwd', 'init'],
  ['branch', 'last'],
  ['model', 'strip'],
  ['branch', 'none'],
  ['cwd', 'tail'],
  ['effort', 'hidden'],
  ['cwd', 'base'],
];

export const L2_STEPS: readonly FitStep[] = [
  ['duration', 'none'],
  ['cache-expiry', 'none'],
  ['tokens', 'compact'],
  ['bar', 'flat6'],
  ['bar', 'flat4'],
  ['tokens', 'none'],
  ['cache-hit', 'none'],
  ['bar', 'percent'],
];
