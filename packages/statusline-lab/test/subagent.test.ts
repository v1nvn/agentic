import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_NOW,
  golden,
  loadTick,
  renderSubagent,
  type RenderResult,
} from './runtime.js';

// Goldens are byte captures of the reference ~/.claude/subagent-statusline.sh
// patched with the unit-3 deltas (NOW overridable, /tmp stdin dump removed,
// SEP resolved via the shipped components/style.sh pick chain), run under the
// renderSubagent contract. Every startTime in the tick is pinned against
// DEFAULT_NOW (2026-09-08T12:20:00Z).

interface Row {
  readonly id: string;
  readonly content: string;
}

function rowsOf(run: RenderResult): Row[] {
  return run.stdout
    .toString('utf8')
    .split('\n')
    .filter(line => line !== '')
    .map(line => JSON.parse(line) as Row);
}

const ANSI = /\x1b\[[0-9;]*m/g;

function visibleLength(content: string): number {
  return content.replace(ANSI, '').length;
}

function identifiedTaskIds(): string[] {
  return loadTick('multi')
    .tasks.map(task => task.id)
    .filter((id): id is string => typeof id === 'string');
}

let home: string | undefined;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'subagent-test-'));
});

afterEach(() => {
  if (home) {
    rmSync(home, { recursive: true, force: true });
    home = undefined;
  }
});

function render(
  options: { columns?: number; now?: string; picks?: string } = {},
) {
  if (!home) {
    throw new Error('test home not created');
  }
  return renderSubagent({ tick: 'multi', home, ...options });
}

describe('subagent multi-row golden', () => {
  it('renders one deterministic JSON line per identified task', () => {
    const run = render({ now: DEFAULT_NOW });
    expect(run.status).toBe(0);
    const rows = rowsOf(run);
    expect(rows.map(row => row.id)).toEqual(identifiedTaskIds());
    for (const row of rows) {
      expect(row.content).not.toBe('');
    }
    expect(run.stdout).toEqual(golden('multi-default'));
    expect(render({ now: DEFAULT_NOW }).stdout).toEqual(run.stdout);
  });
});

describe('subagent width rungs', () => {
  it.each([80, 40])('columns %i steps detail down without wrapping', width => {
    const run = render({ columns: width });
    expect(run.status).toBe(0);
    expect(run.stdout).toEqual(golden(`multi-cols-${width}`));
    expect(run.stdout.equals(golden('multi-default'))).toBe(false);
    for (const row of rowsOf(run)) {
      expect(row.content).not.toMatch(/[\n\r]/);
      expect(visibleLength(row.content)).toBeLessThanOrEqual(width - 1);
    }
  });
});

describe('subagent style pick', () => {
  it('style=dots swaps the row separator', () => {
    const run = render({ picks: 'style=dots\n' });
    expect(run.status).toBe(0);
    expect(run.stdout.equals(golden('multi-default'))).toBe(false);
    expect(run.stdout).toEqual(golden('multi-style-dots'));
  });

  it('style=dim renders the separator with the dim attribute', () => {
    const run = render({ picks: 'style=dim\n' });
    expect(run.status).toBe(0);
    expect(run.stdout.equals(golden('multi-default'))).toBe(false);
    expect(run.stdout).toEqual(golden('multi-style-dim'));
    const contents = rowsOf(run)
      .map(row => row.content)
      .join('\n');
    expect(contents).toContain('\x1b[2m │ \x1b[0m');
  });
});

describe('subagent determinism', () => {
  it('two fresh homes render identical bytes', () => {
    const first = render();
    const secondHome = mkdtempSync(join(tmpdir(), 'subagent-test-'));
    try {
      const second = renderSubagent({ tick: 'multi', home: secondHome });
      expect(second.status).toBe(0);
      expect(second.stdout).toEqual(first.stdout);
    } finally {
      rmSync(secondHome, { recursive: true, force: true });
    }
    expect(first.stdout).toEqual(golden('multi-default'));
  });
});
