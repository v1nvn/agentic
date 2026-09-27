import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderStatusline } from '../src/render/index.js';
import { createDemoHome, DEFAULT_NOW, golden, type DemoHome } from './runtime.js';

// The rung ladder and 2-line wrap are pinned by the golden corpus at their
// pinned widths; this suite covers what the corpus cannot — the fit invariant
// across every width, and rungs no golden sits on.
const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);

const stripAnsi = (line: string) => line.replace(/\x1b\[[0-9;]*m/g, '');
// the engine's vlen counts ⚡ as 2 visible columns
const vlen = (line: string) =>
  [...line].length + (line.match(/⚡/g) ?? []).length;

const linesOf = (out: string) => out.replace(/\n$/, '').split('\n');

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
  modelDisplayName?: string,
): string {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  const parsed = JSON.parse(
    readFileSync(join(PAYLOADS_DIR, `${payload}.json`), 'utf8'),
  ) as { model: { display_name: string }; workspace: { current_dir: string } };
  parsed.workspace.current_dir = demo.repoDir;
  if (modelDisplayName !== undefined) {
    parsed.model.display_name = modelDisplayName;
  }
  return renderStatusline({
    home: demo.home,
    now: Number(DEFAULT_NOW),
    payload: `${JSON.stringify(parsed, null, 2)}\n`,
    timeZone: 'UTC',
    ...(columns === undefined ? {} : { columns }),
  });
}

describe('wide and unset equivalence', () => {
  it('COLUMNS=250 renders the identical full-detail single line as unset COLUMNS', () => {
    const wide = render('p1', 250);
    const unset = render('p1');
    expect(linesOf(wide)).toHaveLength(1);
    expect(wide).toBe(unset);
    expect(unset).toBe(golden('p1-default').toString('utf8'));
  });
});

describe('fit invariant', () => {
  it.each(['p1', 'p3'])(
    '%s: every COLUMNS from 40 to 240 fits inside COLUMNS-3 on at most 2 lines',
    payload => {
      for (let columns = 40; columns <= 240; columns += 8) {
        const lines = linesOf(render(payload, columns));
        expectFits(lines, columns);
        expectNoBlankArtifacts(lines);
      }
    },
  );
});

describe('percent rung fidelity', () => {
  it('renders one unstyled percent at the bar=percent rung (live BARB=0)', () => {
    const lines = linesOf(render('p1', 47));
    expect(lines).toHaveLength(1);
    expectFits(lines, 47);
    const plain = stripAnsi(lines[0]);
    expect(plain).toContain('117k');
    expect(plain).toMatch(/58%(?!%)/);
    expect(lines[0]).not.toMatch(/\x1b\[2m\d+%/);
  });
});

// A stale capture renders resets_at < NOW: the port floors the negative
// delta, bash $(( )) division truncates toward zero. -60 agrees by accident
// (exact multiple of 60).
describe('rate=strip negative reset deltas', () => {
  it('floors negative reset deltas like the oracle', () => {
    if (!demo) {
      throw new Error('demo home not materialized');
    }
    const payload = JSON.parse(
      readFileSync(join(PAYLOADS_DIR, 'p1.json'), 'utf8'),
    ) as Record<string, unknown>;
    const now = Number(DEFAULT_NOW);
    payload.rate_limits = {
      five_hour: { used_percentage: 41.2, resets_at: now - 5 },
      seven_day: { used_percentage: 41.2, resets_at: now - 3601 },
      spend_limit: { used_percentage: 41.2, resets_at: now - 60 },
    };
    (payload.workspace as { current_dir: string }).current_dir = demo.repoDir;
    const line = renderStatusline({
      home: demo.home,
      layout: '{rate}',
      now,
      payload: `${JSON.stringify(payload, null, 2)}\n`,
      picks: { rate: 'strip' },
      timeZone: 'UTC',
    });
    expect(line).toContain('resets -1m55s');
    expect(line).toContain('resets -61m59s');
    expect(line).toContain('resets -1m00s');
  });
});

// live MODELD=1 strips a trailing "[...]" from the model display name; the
// corpus pins the strip at 58 and 36 — 75 pins the bracket surviving below
// the model rung.
describe('model suffix rung', () => {
  const NAME = 'Opus 4.5[1m]';

  it('keeps the bracket while the ladder has not reached the model rung', () => {
    const lines = linesOf(render('p1', 75, NAME));
    expect(lines).toHaveLength(1);
    expectFits(lines, 75);
    const plain = stripAnsi(lines[0]);
    expect(plain).toContain('Opus 4.5[1m] high');
    expect(plain).not.toContain('Opus 4.5 high');
  });
});
