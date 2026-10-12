import { describe, expect, it, vi } from 'vitest';

// The panel layout's degraded-paint contract, pinned at the door: an unknown
// item warns exactly once per paint and drops, malformed grammar warns and
// renders the bare head — the corpus layouts are all grammar-valid, so these
// are the only red a warn-path deletion would meet.
import { renderPanel } from '../src/render/panel.js';
import { DEFAULT_NOW, loadTick } from './runtime.js';

function paint(layout: string): string {
  return renderPanel({
    layout,
    noColor: true,
    now: Number(DEFAULT_NOW),
    payload: JSON.stringify(loadTick()),
  });
}

function capture(layout: string): { out: string; warned: string } {
  const writes: string[] = [];
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
    writes.push(String(chunk));
    return true;
  });
  try {
    return { out: paint(layout), warned: writes.join('') };
  } finally {
    stderr.mockRestore();
  }
}

describe('the panel layout warn paths', () => {
  it('an unknown item warns once per paint and the row renders without it', () => {
    const layout = '{model ghost state} {bar tokens}';
    const clean = '{model state} {bar tokens}';
    const { out, warned } = capture(layout);
    expect(
      warned.match(/layout item 'ghost' is not available, skipped/g),
    ).toHaveLength(1);
    expect(out).toBe(paint(clean));
  });

  it('a malformed layout warns and renders the bare head', () => {
    const { out, warned } = capture('{model state');
    expect(warned).toContain("layout '{model state': unterminated cluster");
    const lines = out
      .trim()
      .split('\n')
      .map(l => JSON.parse(l) as { id: string; content: string });
    expect(lines.map(l => l.id)).toEqual([
      'row-explore',
      'row-tests',
      'row-review',
      'row-fork',
      'row-idle',
    ]);
    expect(lines[0].content.startsWith('Explore ')).toBe(true);
    expect(out).toBe(paint('{skipA skipB}'));
  });
});
