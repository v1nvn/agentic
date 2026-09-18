import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { materializeDemoRepo } from '../src/demo-repo.js';

export const RUNTIME_BIN = fileURLToPath(
  new URL('../../../plugins/statusline/bin/statusline.sh', import.meta.url),
);

export const SUBAGENT_BIN = fileURLToPath(
  new URL('../../../plugins/statusline/bin/subagent.sh', import.meta.url),
);

export const PICKS_PATH = join(
  '.claude',
  'plugins',
  'data',
  'statusline-agentic',
  'picks',
);

// 2026-09-08T12:20:00Z — after every fixture's cache expiry, inert under the
// default picks (no default-picked segment reads NOW).
export const DEFAULT_NOW = '1788870000';
export const NOW_BEFORE_CACHE_EXPIRY = '1788869000';
export const NOW_AFTER_CACHE_EXPIRY = '1788869200';

export interface DemoHome {
  readonly home: string;
  readonly repoDir: string;
}

export interface RenderResult {
  readonly status: number;
  readonly stdout: Buffer;
  readonly stderr: string;
}

export interface RenderInput {
  readonly payload?: string;
  readonly payloadJson?: string;
  readonly home: string;
  readonly repoDir: string;
  readonly now?: string;
  readonly picks?: string;
  readonly columns?: number;
  readonly modelDisplayName?: string;
  readonly args?: readonly string[];
}

const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
const GOLDENS_DIR = fileURLToPath(new URL('./goldens', import.meta.url));

export interface Tick {
  readonly columns: number;
  readonly tasks: ReadonlyArray<{
    readonly id?: string;
    readonly [field: string]: unknown;
  }>;
}

function writePicks(home: string, picks: string): void {
  const picksFile = join(home, PICKS_PATH);
  mkdirSync(dirname(picksFile), { recursive: true });
  writeFileSync(picksFile, picks);
}

function spawnRender(
  bin: string,
  stdin: string,
  home: string,
  now: string,
  columns?: number,
  args?: readonly string[],
): RenderResult {
  const run = spawnSync('bash', [bin, ...(args ?? [])], {
    input: stdin,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: home,
      NOW: now,
      LC_ALL: 'C',
      TZ: 'UTC',
      ...(columns === undefined ? {} : { COLUMNS: String(columns) }),
    },
    timeout: 30_000,
  });
  return {
    status: run.status ?? -1,
    stdout: run.stdout ?? Buffer.alloc(0),
    stderr: (run.stderr ?? Buffer.alloc(0)).toString('utf8'),
  };
}

export function createDemoHome(): DemoHome {
  const home = mkdtempSync(join(tmpdir(), 'statusline-test-'));
  return { home, repoDir: materializeDemoRepo(home) };
}

export function loadTick(name: string): Tick {
  return JSON.parse(readFileSync(join(TICKS_DIR, `${name}.json`), 'utf8'));
}

export function renderStatusline(input: RenderInput): RenderResult {
  const payload = JSON.parse(
    input.payloadJson ??
      readFileSync(join(PAYLOADS_DIR, `${input.payload}.json`), 'utf8'),
  ) as { model: { display_name: string }; workspace: { current_dir: string } };
  payload.workspace.current_dir = input.repoDir;
  if (input.modelDisplayName !== undefined) {
    payload.model.display_name = input.modelDisplayName;
  }
  if (input.picks !== undefined) {
    writePicks(input.home, input.picks);
  }
  return spawnRender(
    RUNTIME_BIN,
    `${JSON.stringify(payload, null, 2)}\n`,
    input.home,
    input.now ?? DEFAULT_NOW,
    input.columns,
    input.args,
  );
}

export interface SubagentInput {
  readonly tick: string;
  readonly columns?: number;
  readonly home: string;
  readonly now?: string;
  readonly picks?: string;
}

export function renderSubagent(input: SubagentInput): RenderResult {
  const loaded = loadTick(input.tick);
  const tick: Tick =
    input.columns === undefined
      ? loaded
      : { ...loaded, columns: input.columns };
  if (input.picks !== undefined) {
    writePicks(input.home, input.picks);
  }
  return spawnRender(
    SUBAGENT_BIN,
    `${JSON.stringify(tick, null, 2)}\n`,
    input.home,
    input.now ?? DEFAULT_NOW,
  );
}

export function golden(name: string): Buffer {
  return readFileSync(join(GOLDENS_DIR, `${name}.ans`));
}
