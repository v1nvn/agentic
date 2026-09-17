import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// assets/runtime is the builder-owned sync of plugins/statusline; tests only
// demand it exists and never copy the plugin tree themselves.
const SYNC = fileURLToPath(
  new URL('../scripts/sync-runtime.mjs', import.meta.url),
);

export default function setup(): void {
  try {
    statSync(SYNC);
  } catch {
    return;
  }
  execFileSync(process.execPath, [SYNC], { stdio: 'inherit' });
}
