import { readdirSync, rmSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The door implemented in src/render/:
//   renderStatusline({ payload, home, now, columns?, layout?,
//                      picks?, noColor? }): string
//   ITEMS: readonly { item, default, alternatives }[] — the item registry
//   DEFAULT_LAYOUT: string
// payload is the JSON text exactly as the renderer's stdin; the engine
// owns the parse and reads git at payload.workspace.current_dir. picks map
// item -> alternative, layout overrides the default, columns is COLUMNS
// (omitted -> the engine default), noColor is NO_COLOR.
// The return is the emitted stdout: lines joined by '\n' with a trailing
// '\n'. The panel goldens (multi-*, subagent.sh) are the panel engine's
// corpus, not this door.
import { DEFAULT_LAYOUT, ITEMS } from '../src/render/index.js';
import { SEGMENTS } from '../src/render/segments.js';
import {
  createDemoHome,
  DEFAULT_NOW,
  GOLDENS_DIR,
  golden,
  loadPayload,
  NOW_AFTER_CACHE_EXPIRY,
  NOW_BEFORE_CACHE_EXPIRY,
  renderAt,
  type DemoHome,
} from './runtime.js';

type Loose = Record<string, unknown>;

export interface CorpusCase {
  readonly name: string;
  readonly payload: 'p1' | 'p2' | 'p3' | 'p4';
  readonly oracle?: boolean;
  readonly columns?: number;
  readonly layout?: string;
  readonly now?: string;
  readonly noColor?: boolean;
  readonly picks?: Readonly<Record<string, string>>;
  readonly mutate?: (payload: Loose) => void;
}

function setPct(payload: Loose, pct: number): void {
  (payload.context_window as Loose).used_percentage = pct;
}

function setDuration(payload: Loose, m: number): void {
  (payload.cost as Loose).total_duration_ms = m * 60000;
}

function setFuse(
  payload: Loose,
  ttl: null | string,
  expiresIn: null | number,
): void {
  const cache = payload.prompt_cache as Loose;
  if (ttl === null) {
    delete cache.ttl;
  } else {
    cache.ttl = ttl;
  }
  if (expiresIn === null) {
    delete cache.expires_at;
  } else {
    cache.expires_at = Number(DEFAULT_NOW) + expiresIn;
  }
}

function setLimits(
  payload: Loose,
  limits: null | undefined | Readonly<Record<string, readonly [number, number]>>,
): void {
  if (limits === null || limits === undefined) {
    delete payload.rate_limits;
    return;
  }
  payload.rate_limits = Object.fromEntries(
    Object.entries(limits).map(([key, [pct, resetsIn]]) => [
      key,
      { used_percentage: pct, resets_at: Number(DEFAULT_NOW) + resetsIn },
    ]),
  );
}

function bracketModel(payload: Loose): void {
  (payload.model as Loose).display_name = 'Opus 4.5[1m]';
}

// Oracle cases ({item} one-item layouts) store the segment without the
// trailing newline the emit adds; full-line cases store exact stdout.
export const CORPUS: readonly CorpusCase[] = [
  { name: 'p1-default', payload: 'p1' },
  { name: 'p2-default', payload: 'p2' },
  { name: 'p3-default', payload: 'p3' },
  { name: 'p4-default', payload: 'p4' },
  { name: 'p1-style-dots', payload: 'p1', picks: { style: 'dots' } },
  {
    name: 'p1-coldin-warm',
    payload: 'p1',
    now: NOW_BEFORE_CACHE_EXPIRY,
    picks: { cache: 'coldin' },
  },
  {
    name: 'p1-coldin-cold',
    payload: 'p1',
    now: NOW_AFTER_CACHE_EXPIRY,
    picks: { cache: 'coldin' },
  },
  ...[0, 1, 50, 58.4, 95, 99, 100].map(
    (pct): CorpusCase => ({
      name: `ramp-gauge-pct${pct}`,
      payload: 'p1',
      oracle: true,
      layout: '{bar}',
      picks: { bar: 'gauge' },
      mutate: payload => setPct(payload, pct),
    }),
  ),
  ...[0, 1, 6, 10].map(
    (pct): CorpusCase => ({
      name: `ramp-flat-pct${pct}`,
      payload: 'p1',
      oracle: true,
      layout: '{bar}',
      picks: { bar: 'flat' },
      mutate: payload => setPct(payload, pct),
    }),
  ),
  ...[0, 42, 2847, 3087].map(
    (m): CorpusCase => ({
      name: `ramp-clock-m${m}`,
      payload: 'p1',
      oracle: true,
      layout: '{duration}',
      picks: { duration: 'clock' },
      mutate: payload => setDuration(payload, m),
    }),
  ),
  ...[42, 3087].map(
    (m): CorpusCase => ({
      name: `ramp-hours-m${m}`,
      payload: 'p1',
      oracle: true,
      layout: '{duration}',
      picks: { duration: 'hours' },
      mutate: payload => setDuration(payload, m),
    }),
  ),
  ...(
    [
      ['5m-290', '5m', 290],
      ['5m-76', '5m', 76],
      ['5m-75', '5m', 75],
      ['5m-40', '5m', 40],
      ['5m-25', '5m', 25],
      ['5m-24', '5m', 24],
      ['5m-1', '5m', 1],
      ['5m-0', '5m', 0],
      ['gone', '1h', -86400],
      ['1h-3500', '1h', 3500],
      ['1h-289', '1h', 289],
      ['1h-288', '1h', 288],
      ['no-ttl', null, 0],
      ['no-expires', '1h', null],
    ] as const
  ).map(
    ([id, ttl, expiresIn]): CorpusCase => ({
      name: `ramp-fuse-${id}`,
      payload: 'p1',
      oracle: true,
      layout: '{cache}',
      picks: { cache: 'fuse' },
      mutate: payload => setFuse(payload, ttl, expiresIn),
    }),
  ),
  ...(
    [
      [
        'zero',
        {
          five_hour: [0, 3599],
          seven_day: [0, 3600],
          spend_limit: [0, 518400],
        } as const,
      ],
      [
        'bands',
        {
          five_hour: [69.9, 61],
          seven_day: [70, 60],
          spend_limit: [89.9, 4980],
        } as const,
      ],
      [
        'red-edge',
        {
          five_hour: [90, 7200],
          seven_day: [100, 86400],
          spend_limit: [50, 120],
        } as const,
      ],
      [
        'rounding',
        { five_hour: [22.5, 3000], seven_day: [23.5, 3000] } as const,
      ],
      ['only-five-hour', { five_hour: [41.2, 4980] } as const],
      ['none', undefined],
    ] as const
  ).map(
    ([id, limits]): CorpusCase => ({
      name: `ramp-strip-${id}`,
      payload: 'p1',
      oracle: true,
      layout: '{rate}',
      picks: { rate: 'strip' },
      mutate: payload => setLimits(payload, limits),
    }),
  ),

  ...[88, 82, 76, 66, 60, 50, 30, 24, 20].map(
    (columns): CorpusCase => ({
      name: `p1-cols-${columns}`,
      payload: 'p1',
      columns,
    }),
  ),
  ...[82, 30].map(
    (columns): CorpusCase => ({
      name: `p3-cols-${columns}`,
      payload: 'p3',
      columns,
    }),
  ),
  ...[250, 58, 36].map(
    (columns): CorpusCase => ({
      name: `p1m-cols-${columns}`,
      payload: 'p1',
      columns,
      mutate: bracketModel,
    }),
  ),
  { name: 'p1-style-dim', payload: 'p1', picks: { style: 'dim' } },
  { name: 'p1-style-bare', payload: 'p1', picks: { style: 'bare' } },
  { name: 'p1-nocolor', payload: 'p1', noColor: true },
  {
    name: 'p1-layout-24',
    payload: 'p1',
    columns: 24,
    layout: '{cwd branch} {model effort cost}',
  },

  ...(
    [
      ['model', 'block'],
      ['model', 'pill'],
      ['model', 'zen'],
      ['effort', 'dim'],
      ['state', 'pills'],
      ['cwd', 'full'],
      ['cwd', 'tail'],
      ['cwd', 'base'],
      ['cwd', 'icon'],
      ['branch', 'full'],
      ['branch', 'last'],
      ['branch', 'icon'],
      ['status', 'icons'],
      ['ahead', 'arrows'],
      ['pr', 'badge'],
      ['bar', 'percent'],
      ['bar', 'flat6'],
      ['bar', 'flat4'],
      ['tokens', 'compact'],
      ['tokens', 'free'],
      ['cost', 'burn'],
      ['duration', 'hours'],
      ['lines', 'diffstat'],
    ] as const
  ).map(
    ([item, alt]): CorpusCase => ({
      name: `seg-p1-${item}-${alt}`,
      payload: 'p1',
      oracle: true,
      layout: `{${item}}`,
      picks: { [item]: alt },
    }),
  ),
  // bar=gauge above 100%: the bar geometry clamps, the percent label does not.
  {
    name: 'seg-p1-bar-gauge150',
    payload: 'p1',
    oracle: true,
    layout: '{bar}',
    picks: { bar: 'gauge' },
    mutate: payload => setPct(payload, 150),
  },
  // token ties: awk printf rounds 1.25/2.5 to even ("1.2k"/"2k"), toFixed
  // rounds away from zero ("1.3k"/"3k").
  {
    name: 'seg-p1-tokens-tie',
    payload: 'p1',
    oracle: true,
    layout: '{tokens}',
    picks: { tokens: 'full' },
    mutate: payload => {
      const ctx = payload.context_window as Loose;
      ctx.total_input_tokens = 1250;
      ctx.context_window_size = 2500;
    },
  },
  // cost tie: awk printf "$%.2f" rounds 0.125 to even "$0.12"; toFixed says
  // "$0.13".
  {
    name: 'seg-p1-cost-tie',
    payload: 'p1',
    oracle: true,
    layout: '{cost}',
    mutate: payload => {
      (payload.cost as Loose).total_cost_usd = 0.125;
    },
  },
  { name: 'seg-p4-state-pills', payload: 'p4', oracle: true, layout: '{state}', picks: { state: 'pills' } },
  { name: 'seg-p4-pr-badge', payload: 'p4', oracle: true, layout: '{pr}', picks: { pr: 'badge' } },
  { name: 'seg-p2-state-pills', payload: 'p2', oracle: true, layout: '{state}', picks: { state: 'pills' } },
  { name: 'seg-p2-pr-badge', payload: 'p2', oracle: true, layout: '{pr}', picks: { pr: 'badge' } },
];

let demo: DemoHome | undefined;

beforeAll(() => {
  demo = createDemoHome();
});

afterAll(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
  }
});

function renderCase(c: CorpusCase): string {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  const payload = loadPayload(c.payload);
  c.mutate?.(payload);
  return renderAt(demo, payload, {
    ...(c.now === undefined ? {} : { now: c.now }),
    ...(c.columns === undefined ? {} : { columns: c.columns }),
    ...(c.layout === undefined ? {} : { layout: c.layout }),
    ...(c.picks === undefined ? {} : { picks: c.picks }),
    ...(c.noColor === undefined ? {} : { noColor: c.noColor }),
  });
}

describe('the src/render door', () => {
  it('exposes the registry in paint order with the 3 inline rung shims', () => {
    expect(ITEMS.map(entry => entry.item)).toEqual([
      'model', 'effort', 'state', 'cwd', 'branch', 'status', 'ahead', 'pr',
      'bar', 'tokens', 'cache', 'cost', 'duration', 'lines', 'rate', 'style',
    ]);
    const byItem = new Map(ITEMS.map(entry => [entry.item, entry]));
    for (const entry of ITEMS) {
      expect(entry.alternatives, entry.item).toContain(entry.default);
    }
    expect(byItem.get('branch')?.alternatives).toContain('none');
    expect(byItem.get('bar')?.alternatives).toEqual(
      expect.arrayContaining(['flat6', 'flat4']),
    );
  });

  it('carries the runtime DEFAULT_LAYOUT', () => {
    expect(DEFAULT_LAYOUT).toBe(
      '{model effort state} {cwd branch status ahead pr} {bar tokens cache} {cost} {duration} {lines} {rate}',
    );
  });

  // style is the one registry item no layout paints — separators, not a
  // segment. Every other registered alternative must have a renderer, or it
  // would silently paint ''.
  it('every registered alternative has a segment renderer', () => {
    for (const { alternatives, item } of ITEMS) {
      if (item === 'style') {
        continue;
      }
      for (const alt of alternatives) {
        expect(typeof SEGMENTS[item]?.[alt], `${item}=${alt}`).toBe(
          'function',
        );
      }
    }
  });

  it('omitting layout renders the same bytes as layout: DEFAULT_LAYOUT', () => {
    const bare = renderCase({ name: 'layout-default-check', payload: 'p1' });
    const withLayout = renderCase({
      name: 'layout-default-check',
      payload: 'p1',
      layout: DEFAULT_LAYOUT,
    });
    expect(bare).toBe(withLayout);
  });

  it('accepts every corpus pick as a registered alternative', () => {
    const byItem = new Map(ITEMS.map(entry => [entry.item, entry]));
    for (const c of CORPUS) {
      for (const [item, alt] of Object.entries(c.picks ?? {})) {
        expect(
          byItem.get(item)?.alternatives,
          `${c.name}: ${item}=${alt}`,
        ).toContain(alt);
      }
    }
  });

  it('covers every non-panel golden in test/goldens', () => {
    const onDisk = readdirSync(GOLDENS_DIR)
      .filter(file => file.endsWith('.ans'))
      .filter(file => !file.startsWith('multi-'))
      .map(file => file.slice(0, -'.ans'.length))
      .sort();
    const covered = CORPUS.map(c => c.name).sort();
    expect(covered).toEqual(onDisk);
  });
});

describe('the golden corpus through the engine', () => {
  it.each(CORPUS)('$name renders byte-identical', c => {
    const out = renderCase(c);
    const want = c.oracle
      ? Buffer.concat([golden(c.name), Buffer.from('\n')])
      : golden(c.name);
    expect(Buffer.from(out, 'utf8'), c.name).toEqual(want);
  });
});
