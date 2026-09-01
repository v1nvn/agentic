import { describe, expect, it } from 'vitest';
import { hitRate, render } from '../src/format.js';
import type { ScanResult } from '../src/scan.js';

const now = new Date(2026, 7, 15, 9, 41); // Aug 15 2026 09:41 local

const scan: ScanResult = {
  now: '2026-08-15T04:41:00.000Z',
  last24: [
    { model: 'glm-5.3', input: 51, output: 4, cacheRead: 40448, cacheCreation: 0, calls: 3 },
    { model: 'claude-opus-5', input: 5685, output: 28, cacheRead: 40256, cacheCreation: 1200, calls: 4 },
    { model: '<synthetic>', input: 0, output: 0, cacheRead: 0, cacheCreation: 0, calls: 2 },
  ],
  models: [],
  days: [
    { day: '2026-08-14', input: 1200, output: 300, cacheRead: 8000, cacheCreation: 500, calls: 9 },
    { day: '2026-08-15', input: 5736, output: 32, cacheRead: 80704, cacheCreation: 1200, calls: 7 },
  ],
};

// Sum across both models: 5736+32+80704+1200 = 87672 tokens, 7 calls.
// Hit rate: 80704 / (5736 + 80704 + 1200) = 92.02…% → 92%.
describe('tokens report render', () => {
  const text = render(scan, { now });

  it('spans a 24h window ending now', () => {
    expect(text).toContain('Aug 14 09:41 → Aug 15 09:41 · 24h');
  });

  it('leads with totals and the headline cache hit rate', () => {
    expect(text).toContain('87.7K tokens across 7 model calls');
    expect(text).toContain('92% cache hit rate');
  });

  it('renders per-model rows with in/out/read/created', () => {
    expect(/glm-5\.3\s+51 in/.test(text)).toBe(true);
    expect(/40\.4K read/.test(text)).toBe(true);
    expect(text).toContain('claude-opus-5');
  });

  it('drops zero-token synthetic rows', () => {
    expect(text).not.toContain('<synthetic>');
  });

  it('renders the per-model hit-rate bar', () => {
    expect(/85% █{10}/.test(text)).toBe(true);
  });

  it('lists daily rows newest first with a full bar on the max day', () => {
    expect(text.slice(text.indexOf('Daily')).indexOf('Aug 15')).toBeLessThan(
      text.slice(text.indexOf('Daily')).indexOf('Aug 14'),
    );
    expect(text).toContain('87.7K');
    expect(/87\.7K {2}█{24}/.test(text)).toBe(true);
  });

  it('stays plain text and states the hit-rate formula', () => {
    expect(text).not.toContain('**');
    expect(text).toContain('read / (in + read + created)');
  });

  it('renders a placeholder for an empty scan', () => {
    const empty = render({ now: scan.now, last24: [], models: [], days: [] }, { now });
    expect(empty).toContain('(no usage recorded in the last 24 hours)');
  });
});

describe('hitRate units', () => {
  it('counts cacheCreation in the denominator', () => {
    expect(hitRate({ input: 0, cacheRead: 100, cacheCreation: 100 })).toBeCloseTo(50, 9);
  });

  it('scores uncached-only usage as 0%', () => {
    expect(hitRate({ input: 100 })).toBe(0);
  });
});
