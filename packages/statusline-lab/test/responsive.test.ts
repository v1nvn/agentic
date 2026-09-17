import { rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDemoHome,
  golden,
  renderStatusline,
  type DemoHome,
} from './runtime.js';

// The rung ladder and 2-line wrap are pinned from the live responsive engine
// (~/.claude/statusline-command.sh, FULL_STEPS/L1_STEPS/L2_STEPS): details
// step down least-valuable-first and the wrap splits between the location
// and context clusters, never mid-segment.

const stripAnsi = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');
// the engine's vlen counts ⚡ as 2 visible columns
const vlen = (line: string) =>
  [...line].length + (line.match(/⚡/g) ?? []).length;

const linesOf = (stdout: Buffer) =>
  stdout.toString('utf8').replace(/\n$/, '').split('\n');

const barWidth = (plain: string) => (plain.match(/[█░]/g) ?? []).length;

function expectFits(lines: string[], columns: number): void {
  expect(lines.length).toBeLessThanOrEqual(2);
  for (const line of lines) {
    expect(vlen(stripAnsi(line))).toBeLessThanOrEqual(columns - 3);
  }
}

function expectNoBlankArtifacts(lines: string[]): void {
  for (const line of lines) {
    const plain = stripAnsi(line);
    expect(plain, `blank artifact in ${JSON.stringify(line)}`).not.toBe('');
    expect(plain).not.toMatch(/  /);
    expect(plain).not.toMatch(/│ │/);
    expect(plain).not.toMatch(/^│/);
    expect(plain).not.toMatch(/│$/);
  }
}

let demo: DemoHome | undefined;

beforeEach(() => {
  demo = createDemoHome();
});

afterEach(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
    demo = undefined;
  }
});

function render(
  payload: string,
  columns?: number,
  home: { home: string; repoDir: string } | undefined = demo,
) {
  if (!home) {
    throw new Error('demo home not materialized');
  }
  return renderStatusline({
    payload,
    home: home.home,
    repoDir: home.repoDir,
    ...(columns === undefined ? {} : { columns }),
  });
}

describe('wide and unset equivalence', () => {
  it('COLUMNS=250 renders the identical full-detail single line as unset COLUMNS', () => {
    const wide = render('p1', 250);
    const unset = render('p1');
    expect(wide.status).toBe(0);
    expect(linesOf(wide.stdout)).toHaveLength(1);
    expect(wide.stdout).toEqual(unset.stdout);
    expect(unset.stdout).toEqual(golden('p1-default'));
  });
});

describe('rung ladder on p1', () => {
  const rungs = [
    {
      name: 'drops only the duration',
      columns: 88,
      gone: ['82m05s'],
      kept: [
        'Opus high',
        '~/d/atlas-web',
        'f/login-flow',
        '+2 ~2',
        '116.8k/200k',
        '⚡94%',
        '$3.87',
      ],
      bar: 10,
    },
    {
      name: 'drops the cache hit next',
      columns: 82,
      gone: ['82m05s', '⚡'],
      kept: ['Opus high', 'f/login-flow', '+2 ~2', '116.8k/200k', '$3.87'],
      bar: 10,
    },
    {
      name: 'compacts the tokens next',
      columns: 76,
      gone: ['82m05s', '⚡', '116.8k/200k'],
      kept: ['117k', '+2 ~2', 'f/login-flow', '$3.87'],
      bar: 10,
    },
    {
      name: 'halves the bar and drops the git counts next',
      columns: 66,
      gone: ['82m05s', '⚡', '116.8k/200k', '+2 ~2'],
      kept: ['117k', 'f/login-flow', 'Opus high', '$3.87'],
      bar: 6,
    },
    {
      name: 'shortens the branch and thins the bar next',
      columns: 60,
      gone: ['82m05s', '⚡', '116.8k/200k', '+2 ~2', 'f/login-flow'],
      kept: ['login-flow', '117k', 'Opus high', '$3.87'],
      bar: 4,
    },
    {
      name: 'flattens the bar to a percent and drops the branch next',
      columns: 50,
      gone: ['82m05s', '⚡', '116.8k/200k', '+2 ~2', 'login-flow'],
      kept: ['58%', '117k', 'Opus high', '~/d/atlas-web', '$3.87'],
      bar: 0,
    },
  ];

  it.each(rungs)('$name (COLUMNS=$columns)', ({ columns, gone, kept, bar }) => {
    const run = render('p1', columns);
    expect(run.status).toBe(0);
    const lines = linesOf(run.stdout);
    expect(lines).toHaveLength(1);
    expectFits(lines, columns);
    const plain = stripAnsi(lines[0]);
    for (const detail of gone) {
      expect(plain).not.toContain(detail);
    }
    for (const detail of kept) {
      expect(plain).toContain(detail);
    }
    expect(barWidth(plain)).toBe(bar);
  });

  it('ladders the sparse fixture p3 the same way', () => {
    const run = render('p3', 82);
    expect(run.status).toBe(0);
    const lines = linesOf(run.stdout);
    expect(lines).toHaveLength(1);
    expectFits(lines, 82);
    const plain = stripAnsi(lines[0]);
    expect(plain).not.toContain('101m50s');
    expect(plain).not.toContain('⚡');
    expect(plain).toContain('190.8k/200k');
    expect(plain).toContain('$8.91');
  });
});

describe('fit invariant', () => {
  it.each(['p1', 'p3'])(
    '%s: every COLUMNS from 40 to 240 fits inside COLUMNS-3 on at most 2 lines',
    payload => {
      for (let columns = 40; columns <= 240; columns += 8) {
        const run = render(payload, columns);
        expect(run.status, `COLUMNS=${columns}`).toBe(0);
        const lines = linesOf(run.stdout);
        expectFits(lines, columns);
        expectNoBlankArtifacts(lines);
      }
    },
  );
});

describe('two-line wrap', () => {
  const COST: Record<'p1' | 'p3', string> = { p1: '$3.87', p3: '$8.91' };
  const TOKENS_COMPACT: Record<'p1' | 'p3', string> = {
    p1: '117k',
    p3: '191k',
  };
  const DURATION: Record<'p1' | 'p3', string> = {
    p1: '82m05s',
    p3: '101m50s',
  };

  it.each(['p1', 'p3'] as const)(
    '%s at COLUMNS=30 wraps between location and context at the pinned rungs',
    payload => {
      const run = render(payload, 30);
      expect(run.status).toBe(0);
      const lines = linesOf(run.stdout);
      expect(lines).toHaveLength(2);
      expectFits(lines, 30);
      expectNoBlankArtifacts(lines);
      const [first, second] = lines.map(stripAnsi);
      expect(first).toContain('Opus high');
      expect(first).toContain('~/d/atlas-web');
      expect(first).not.toContain('login-flow');
      expect(second).toContain(TOKENS_COMPACT[payload]);
      expect(second).toContain(COST[payload]);
      expect(barWidth(second)).toBe(10);
      expect(second).not.toContain(DURATION[payload]);
      expect(second).not.toContain('⚡');
      expect(second).not.toContain('/200k');
    },
  );

  it.each(['p1', 'p3'] as const)(
    '%s: two-line output keeps every detail whole on one line',
    payload => {
      for (const columns of [30, 24, 20]) {
        const run = render(payload, columns);
        const lines = linesOf(run.stdout);
        expect(lines, `COLUMNS=${columns}`).toHaveLength(2);
        expectFits(lines, columns);
        expectNoBlankArtifacts(lines);
        const plains = lines.map(stripAnsi);
        const markers = [
          'Opus',
          'atlas-web',
          TOKENS_COMPACT[payload],
          COST[payload],
        ];
        for (const marker of markers) {
          expect(
            plains.filter(plain => plain.includes(marker)),
            `COLUMNS=${columns} marker ${marker}`,
          ).toHaveLength(1);
        }
        expect(plains[0]).toContain('Opus');
        expect(plains[1]).toContain(COST[payload]);
      }
    },
  );
});

describe('determinism', () => {
  it('two fresh demo homes at COLUMNS=60 render identical bytes', () => {
    const first = render('p1', 60);
    const other = createDemoHome();
    try {
      const again = render('p1', 60, other);
      expect(again.status).toBe(0);
      expect(again.stdout).toEqual(first.stdout);
    } finally {
      rmSync(other.home, { recursive: true, force: true });
    }
  });
});
