import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_NOW,
  createDemoHome,
  golden,
  renderStatusline,
  type DemoHome,
  type RenderResult,
} from './runtime.js';

// Golden provenance: every ramp-*.ans capture is the byte output of the
// package-side python3 oracle (assets/extras/{gauge,fuse,strip}.sh) at the
// inputs each case names, under the renderStatusline env (HOME/NOW/LC_ALL=C/
// TZ=UTC pinned). Unit 9 ports the ramps to bash and deletes the extras —
// these bytes are the surviving fidelity spec.

type Loose = Record<string, unknown>;

const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const EXTRAS_DIR = fileURLToPath(new URL('../assets/extras', import.meta.url));
const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));

let demo: DemoHome | undefined;

beforeAll(() => {
  demo = createDemoHome();
});

afterAll(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
  }
});

function basePayload(): Loose {
  return JSON.parse(
    readFileSync(join(PAYLOADS_DIR, 'p1.json'), 'utf8'),
  ) as Loose;
}

function seg(comp: string, alt: string, payload: Loose): RenderResult {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  return renderStatusline({
    payloadJson: JSON.stringify(payload, null, 2),
    home: demo.home,
    repoDir: demo.repoDir,
    now: DEFAULT_NOW,
    args: ['--seg', `${comp}=${alt}`],
  });
}

function expectOracle(run: RenderResult, name: string): void {
  expect(run.status, name).toBe(0);
  expect(run.stderr, name).toBe('');
  expect(run.stdout, name).toEqual(golden(`ramp-${name}`));
}

describe('bar=gauge', () => {
  it.each([0, 1, 50, 58.4, 95, 99, 100])(
    'renders pct %s byte-equal to the oracle',
    pct => {
      const payload = basePayload();
      (payload.context_window as Loose).used_percentage = pct;
      expectOracle(seg('bar', 'gauge', payload), `gauge-pct${pct}`);
    },
  );
});

// left values straddle the python ramp boundaries: frac exactly 0.25 or 0.08
// colors low, so 76/75, 25/24 and 289/288 pin both sides of each edge.
// ttl/expiresIn null deletes the key — those cases pin the empty renders.
describe('cache=fuse', () => {
  interface FuseCase {
    readonly id: string;
    readonly ttl: string | null;
    readonly expiresIn: number | null;
  }
  const cases: readonly FuseCase[] = [
    { id: '5m-290', ttl: '5m', expiresIn: 290 },
    { id: '5m-76', ttl: '5m', expiresIn: 76 },
    { id: '5m-75', ttl: '5m', expiresIn: 75 },
    { id: '5m-40', ttl: '5m', expiresIn: 40 },
    { id: '5m-25', ttl: '5m', expiresIn: 25 },
    { id: '5m-24', ttl: '5m', expiresIn: 24 },
    { id: '5m-1', ttl: '5m', expiresIn: 1 },
    { id: '5m-0', ttl: '5m', expiresIn: 0 },
    { id: 'gone', ttl: '1h', expiresIn: -86400 },
    { id: '1h-3500', ttl: '1h', expiresIn: 3500 },
    { id: '1h-289', ttl: '1h', expiresIn: 289 },
    { id: '1h-288', ttl: '1h', expiresIn: 288 },
    { id: 'no-ttl', ttl: null, expiresIn: 0 },
    { id: 'no-expires', ttl: '1h', expiresIn: null },
  ];
  it.each(cases)(
    '%s renders byte-equal to the oracle',
    ({ id, ttl, expiresIn }) => {
      const payload = basePayload();
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
      expectOracle(seg('cache', 'fuse', payload), `fuse-${id}`);
    },
  );
});

// rounding pins python's round-half-even labels (22.5 -> 22, 23.5 -> 24)
// against a bar color that keys off the raw percentage; bands straddles the
// 70/90 color edges where the label already rounds up.
describe('rate=strip', () => {
  interface StripCase {
    readonly id: string;
    readonly limits?: Readonly<Record<string, readonly [number, number]>>;
  }
  const cases: readonly StripCase[] = [
    {
      id: 'zero',
      limits: {
        five_hour: [0, 3599],
        seven_day: [0, 3600],
        spend_limit: [0, 518400],
      },
    },
    {
      id: 'bands',
      limits: {
        five_hour: [69.9, 61],
        seven_day: [70, 60],
        spend_limit: [89.9, 4980],
      },
    },
    {
      id: 'red-edge',
      limits: {
        five_hour: [90, 7200],
        seven_day: [100, 86400],
        spend_limit: [50, 120],
      },
    },
    {
      id: 'rounding',
      limits: { five_hour: [22.5, 3000], seven_day: [23.5, 3000] },
    },
    { id: 'only-five-hour', limits: { five_hour: [41.2, 4980] } },
    { id: 'none' },
  ];
  it.each(cases)('%s renders byte-equal to the oracle', ({ id, limits }) => {
    const payload = basePayload();
    if (limits === undefined) {
      delete payload.rate_limits;
    } else {
      payload.rate_limits = Object.fromEntries(
        Object.entries(limits).map(([key, [pct, resetsIn]]) => [
          key,
          { used_percentage: pct, resets_at: Number(DEFAULT_NOW) + resetsIn },
        ]),
      );
    }
    expectOracle(seg('rate', 'strip', payload), `strip-${id}`);
  });
});

const SIGNATURES: Readonly<Record<string, string>> = {
  'bar=gauge': '\x1b[38;2;68;71;90m',
  'cache=fuse': '\x1b[31m❄ cold\x1b[0m',
  'rate=strip': '· resets ',
};

describe('ramped picks', () => {
  it.each(['bar=gauge', 'cache=fuse', 'rate=strip'])(
    '%s renders from the picks file without a warn',
    pick => {
      if (!demo) {
        throw new Error('demo home not materialized');
      }
      const run = renderStatusline({
        payload: 'p1',
        home: demo.home,
        repoDir: demo.repoDir,
        now: DEFAULT_NOW,
        picks: `${pick}\n`,
      });
      expect(run.status, pick).toBe(0);
      expect(run.stderr, pick).toBe('');
      expect(run.stdout.equals(golden('p1-default'))).toBe(false);
      expect(run.stdout.toString('utf8'), pick).toContain(SIGNATURES[pick]);
    },
  );
});

describe('extras', () => {
  it('no package-side extras remain — the ramps ship in the runtime', () => {
    expect(existsSync(EXTRAS_DIR)).toBe(false);
    for (const file of readdirSync(SRC_DIR)) {
      if (file.endsWith('.ts')) {
        expect(readFileSync(join(SRC_DIR, file), 'utf8'), file).not.toContain(
          'extras',
        );
      }
    }
  });
});
