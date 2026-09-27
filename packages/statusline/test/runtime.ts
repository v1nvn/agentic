import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { materializeDemoRepo } from '../src/demo-repo.js';

// 2026-09-08T12:20:00Z — after every fixture's cache expiry, inert under the
// default config (no default-picked segment reads NOW).
export const DEFAULT_NOW = '1788870000';
export const NOW_BEFORE_CACHE_EXPIRY = '1788869000';
export const NOW_AFTER_CACHE_EXPIRY = '1788869200';

export interface DemoHome {
  readonly home: string;
  readonly repoDir: string;
}

const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
const GOLDENS_DIR = fileURLToPath(new URL('./goldens', import.meta.url));

export function createDemoHome(): DemoHome {
  const home = mkdtempSync(join(tmpdir(), 'statusline-test-'));
  return { home, repoDir: materializeDemoRepo(home) };
}

export function tickStdin(name = 'multi'): string {
  return readFileSync(join(TICKS_DIR, `${name}.json`), 'utf8');
}

export function golden(name: string): Buffer {
  return readFileSync(join(GOLDENS_DIR, `${name}.ans`));
}
