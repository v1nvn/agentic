import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_NOW } from './runtime.js';

// Unit 1's target shape: the bash runtime ships with the plugin under
// plugins/statusline-lab/runtime/ (contract 6) and takes its config from
// STATUSLINE_LAB_* env vars (contract 5), not from the picks file.
export const RUNTIME_DIR = fileURLToPath(
  new URL('../../../plugins/statusline-lab/runtime', import.meta.url),
);
export const RUNTIME_MAIN = join(RUNTIME_DIR, 'statusline.sh');
export const RUNTIME_SUBAGENT = join(RUNTIME_DIR, 'subagent.sh');
export const RUNTIME_LIB = join(RUNTIME_DIR, 'lib.sh');
export const RUNTIME_COMPONENTS_DIR = join(RUNTIME_DIR, 'components');

export function capturePath(home: string, surface: 'main' | 'tick'): string {
  return join(
    home,
    '.claude',
    'plugins',
    'data',
    'statusline-lab-agentic',
    'captures',
    `${surface}.json`,
  );
}

const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));

export interface RuntimeSpawnInput {
  readonly script: string;
  readonly stdin: string;
  readonly home: string;
  readonly now?: string;
  readonly columns?: number;
  readonly env?: Readonly<Record<string, string>>;
}

export interface RuntimeSpawnResult {
  readonly status: number;
  readonly stdout: Buffer;
  readonly stderr: string;
}

export function spawnRuntime(input: RuntimeSpawnInput): RuntimeSpawnResult {
  const run = spawnSync('bash', [input.script], {
    input: input.stdin,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: input.home,
      NOW: input.now ?? DEFAULT_NOW,
      LC_ALL: 'C',
      TZ: 'UTC',
      ...(input.columns === undefined
        ? {}
        : { COLUMNS: String(input.columns) }),
      ...(input.env ?? {}),
    },
    timeout: 30_000,
  });
  return {
    status: run.status ?? -1,
    stdout: run.stdout ?? Buffer.alloc(0),
    stderr: (run.stderr ?? Buffer.alloc(0)).toString('utf8'),
  };
}

export function payloadStdin(repoDir: string, payload = 'p1'): string {
  const parsed = JSON.parse(
    readFileSync(join(PAYLOADS_DIR, `${payload}.json`), 'utf8'),
  ) as { workspace: { current_dir: string } };
  parsed.workspace.current_dir = repoDir;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

export function tickStdin(name = 'multi'): string {
  return readFileSync(join(TICKS_DIR, `${name}.json`), 'utf8');
}

// Contract 7 writes captures via tmp + mv, so a .tmp name anywhere under the
// data dir is a torn write.
export function tmpFilesUnder(home: string): string[] {
  const root = join(
    home,
    '.claude',
    'plugins',
    'data',
    'statusline-lab-agentic',
  );
  if (!existsSync(root)) {
    return [];
  }
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(child);
      } else if (entry.name.includes('.tmp')) {
        found.push(child);
      }
    }
  };
  walk(root);
  return found;
}
