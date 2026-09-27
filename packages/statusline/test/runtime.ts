import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { materializeDemoRepo } from '../src/demo-repo.js';
import { renderStatusline } from '../src/render/engine.js';

// 2026-09-08T12:20:00Z — after every fixture's cache expiry, inert under the
// default config (no default-picked segment reads NOW).
export const DEFAULT_NOW = '1788870000';
export const NOW_BEFORE_CACHE_EXPIRY = '1788869000';
export const NOW_AFTER_CACHE_EXPIRY = '1788869200';

export interface DemoHome {
  readonly home: string;
  readonly repoDir: string;
}

export const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
export const GOLDENS_DIR = fileURLToPath(new URL('./goldens', import.meta.url));

type Loose = Record<string, unknown>;

export function createDemoHome(): DemoHome {
  const home = mkdtempSync(join(tmpdir(), 'statusline-test-'));
  return { home, repoDir: materializeDemoRepo(home) };
}

export function loadPayload(name: string): Loose {
  return JSON.parse(
    readFileSync(join(PAYLOADS_DIR, `${name}.json`), 'utf8'),
  ) as Loose;
}

export function tickStdin(name = 'multi'): string {
  return readFileSync(join(TICKS_DIR, `${name}.json`), 'utf8');
}

export function loadTick(name = 'multi'): Loose {
  return JSON.parse(tickStdin(name)) as Loose;
}

export function golden(name: string): Buffer {
  return readFileSync(join(GOLDENS_DIR, `${name}.ans`));
}

// The corpus render: a fixture mutated in place, pointed at the demo repo,
// serialized exactly as the entry would receive it.
export function renderAt(
  demo: DemoHome,
  payload: Loose,
  opts: {
    columns?: number;
    layout?: string;
    noColor?: boolean;
    now?: string;
    picks?: Readonly<Record<string, string>>;
  } = {},
): string {
  (payload.workspace as Loose).current_dir = demo.repoDir;
  return renderStatusline({
    home: demo.home,
    now: Number(opts.now ?? DEFAULT_NOW),
    payload: `${JSON.stringify(payload, null, 2)}\n`,
    ...(opts.columns === undefined ? {} : { columns: opts.columns }),
    ...(opts.layout === undefined ? {} : { layout: opts.layout }),
    ...(opts.picks === undefined ? {} : { picks: opts.picks }),
    ...(opts.noColor === undefined ? {} : { noColor: opts.noColor }),
  });
}

export interface RendererRun {
  readonly status: number;
  readonly stderr: string;
  readonly stdout: string;
}

// A renderer run exactly as the host shell would spawn it — argv names the
// program (the data-dir render.mjs a key names, or the bundled one).
export function runRenderer(
  argv: readonly string[],
  home: string,
  stdin: string,
): RendererRun {
  const run = spawnSync('node', [...argv], {
    input: stdin,
    env: {
      HOME: home,
      LC_ALL: 'C',
      PATH: process.env.PATH ?? '',
      TZ: 'UTC',
    },
    timeout: 30_000,
  });
  return {
    status: run.status ?? -1,
    stderr: (run.stderr ?? Buffer.alloc(0)).toString('utf8'),
    stdout: (run.stdout ?? Buffer.alloc(0)).toString('utf8'),
  };
}
