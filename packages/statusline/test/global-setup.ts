import { existsSync } from 'node:fs';

import { LAUNCHER, RENDER_ENTRY } from '../src/configure.ts';

// Test-entry bootstrap only: the suites run the renderer as node source, so
// there is nothing to build — a checkout missing an entry fails here naming
// it.
export default function setup(): void {
  // The until goldens hold a wall clock: every suite renders in one zone, so
  // a golden never moves with the runner's timezone. Workers fork after this
  // and inherit it.
  process.env.TZ = 'UTC';
  for (const entry of [LAUNCHER, RENDER_ENTRY]) {
    if (!existsSync(entry)) {
      throw new Error(`missing renderer source: ${entry}`);
    }
  }
}
