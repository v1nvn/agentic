// Red/green test for the tokens renderer, on a hand-built aggregate in the
// exact shape scan.mjs emits. Run: node bin/format.test.mjs

import { render, hitRate } from './format.mjs';

const now = new Date(2026, 7, 15, 9, 41); // Aug 15 2026 09:41 local

const scan = {
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

const text = render(scan, { now });

// Sum across both models: 5736+32+80704+1200 = 87672 tokens, 7 calls.
// Hit rate: 80704 / (5736 + 80704 + 1200) = 92.02…% → 92%.
const checks = [
  ['window spans 24h ending Aug 15 09:41', text.includes('Aug 14 09:41 → Aug 15 09:41 · 24h')],
  ['total tokens across models', text.includes('87.7K tokens across 7 model calls')],
  ['headline cache hit rate', text.includes('92% cache hit rate')],
  ['model row: glm-5.3 read tokens', /glm-5\.3\s+51 in/.test(text) && /40\.4K read/.test(text)],
  ['model row: second model listed', text.includes('claude-opus-5')],
  ['zero-token synthetic rows dropped', !text.includes('<synthetic>')],
  ['per-model hit rate rendered', /85% █{10}/.test(text)],
  ['daily rows newest first', text.slice(text.indexOf('Daily')).indexOf('Aug 15') < text.slice(text.indexOf('Daily')).indexOf('Aug 14')],
  ['daily totals formatted', text.includes('87.7K')],
  ['daily max day gets a full bar', /87\.7K {2}█{24}/.test(text)],
  ['no markdown bold leaked', !text.includes('**')],
  ['footer states the hit-rate formula', text.includes('read / (in + read + created)')],
];

// Empty-data branch: fresh machine, nothing recorded.
const empty = render({ now: scan.now, last24: [], models: [], days: [] }, { now });
checks.push(['empty scan renders a placeholder', empty.includes('(no usage recorded in the last 24 hours)')]);

// hitRate units: cacheCreation counts in the denominator; uncached input alone is 0%.
const eps = 1e-9;
if (Math.abs(hitRate({ input: 0, cacheRead: 100, cacheCreation: 100 }) - 50) > eps) checks.push(['hit rate denominator includes cacheCreation', false]);
if (hitRate({ input: 100 }) !== 0) checks.push(['uncached-only usage is 0% hit rate', false]);

console.log(text);
console.log('\n──────── assertions ────────');
let pass = true;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) pass = false;
}
console.log(pass ? '\nPASS' : '\nFAIL');
process.exit(pass ? 0 : 1);
