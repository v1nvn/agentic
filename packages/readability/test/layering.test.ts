import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test } from 'vitest';

const pipelineDir = resolve(import.meta.dirname, '../src/pipeline');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}

test('nothing under src/pipeline imports ../policy (the arrow runs policy → pipeline)', () => {
  const offenders = walk(pipelineDir).filter(path =>
    /\.\.\/policy\//.test(readFileSync(path, 'utf8')),
  );
  expect(offenders).toEqual([]);
});
