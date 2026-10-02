import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { snapshotFixtures } from './version-snapshot.js';

const documentationGolden = readFileSync(
  join(import.meta.dirname, '../fixtures/documentation/saved.golden.md'),
  'utf8',
);

// Every fixture is re-parsed at the installed version; the captured real
// pages alone put this well past the default timeout.
it('snapshotFixtures writes one markdown file per fixture at the installed readability version', { timeout: 60_000 }, () => {
  const outDir = mkdtempSync(join(tmpdir(), 'version-snap-'));
  const result = snapshotFixtures(outDir);

  expect(result.fixtures.length).toBeGreaterThan(0);
  expect(result.readabilityVersion).toMatch(/^\d+\.\d+\.\d+/);

  const written = readdirSync(outDir).sort();
  expect(written.length).toBe(result.fixtures.length);

  const documentation = join(outDir, 'documentation.md');
  expect(existsSync(documentation)).toBe(true);
  const markdown = readFileSync(documentation, 'utf8');
  expect(markdown.length).toBeGreaterThan(0);
  expect(markdown).toBe(documentationGolden);
});
