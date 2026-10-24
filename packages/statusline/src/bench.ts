import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderStatusline } from './render/index.ts';

const PAYLOADS = fileURLToPath(new URL('../assets/payloads', import.meta.url));
const RENDERS =
  Number(process.argv[2]) > 0 ? Math.trunc(Number(process.argv[2])) : 200;

function median(durations: readonly number[]): number {
  const sorted = [...durations].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

const fixtures = readdirSync(PAYLOADS)
  .filter(file => file.endsWith('.json'))
  .sort()
  .map(
    file =>
      [
        file.slice(0, -'.json'.length),
        readFileSync(join(PAYLOADS, file), 'utf8'),
      ] as const,
  );

const home = process.env.HOME ?? '';
const now = Date.now();

for (const [, payload] of fixtures) {
  renderStatusline({ home, now, payload });
}

const durations: number[][] = fixtures.map(() => []);
for (let at = 0; at < RENDERS; at += 1) {
  fixtures.forEach(([, payload], index) => {
    const start = performance.now();
    renderStatusline({ home, now, payload });
    durations[index]?.push(performance.now() - start);
  });
}

const detail = fixtures
  .map(
    ([name], index) => `${name} ${median(durations[index] ?? []).toFixed(2)}ms`,
  )
  .join('  ');
const all = durations.flat();
process.stdout.write(
  `bench: ${RENDERS} renders x ${fixtures.length} payloads — median ${median(all).toFixed(2)}ms per paint (${detail})\n`,
);
