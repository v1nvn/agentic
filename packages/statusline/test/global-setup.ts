import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUNDLED_RENDERER, BUNDLED_RESOLVER } from '../src/configure.js';

// Test-entry bootstrap only: the suites read dist/render.mjs and
// dist/resolver.mjs, which the gate builds after the test step. A build that
// still emits no render.mjs fails here naming it; a missing resolver.mjs
// fails inside syncResolver on first use, naming its own path.
export default function setup(): void {
  if (existsSync(BUNDLED_RENDERER) && existsSync(BUNDLED_RESOLVER)) {
    return;
  }
  const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
  const run = spawnSync('yarn', ['build'], { cwd: pkg, encoding: 'utf8' });
  if (run.status !== 0 || !existsSync(BUNDLED_RENDERER)) {
    throw new Error(
      `bootstrap build produced no ${BUNDLED_RENDERER}:\n${run.stdout}\n${run.stderr}`,
    );
  }
}
