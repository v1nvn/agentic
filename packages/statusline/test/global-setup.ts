import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUNDLED_RENDERER } from '../src/configure.js';

// Test-entry bootstrap only: the suites read dist/render.mjs, which the gate
// builds after the test step. The runtime contract stays loud — a shipped CLI
// missing its bundle still fails inside syncRenderer, naming the path.
export default function setup(): void {
  if (existsSync(BUNDLED_RENDERER)) {
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
