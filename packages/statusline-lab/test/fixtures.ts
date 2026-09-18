import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// The value apply puts in both settings keys. The tilde literal is the point:
// one string resolves to the trampoline on every machine.
export const TRAMPOLINE_COMMAND = '~/.claude/statusline-command.sh';

// First line of every trampoline apply writes — and how apply recognizes a
// trampoline as its own.
export const TRAMPOLINE_MARKER = '# statusline-lab trampoline';

export interface PluginRecord {
  readonly installPath: string;
}

export interface RunResult {
  readonly status: number;
  readonly stdout: Buffer;
  readonly stderr: string;
}

export function trampolinePath(home: string): string {
  return join(home, '.claude', 'statusline-command.sh');
}

export function settingsPath(home: string): string {
  return join(home, '.claude', 'settings.json');
}

export function writeSettings(home: string, raw: string): void {
  mkdirSync(dirname(settingsPath(home)), { recursive: true });
  writeFileSync(settingsPath(home), raw);
}

export function writeTrampoline(home: string, raw: string): void {
  mkdirSync(dirname(trampolinePath(home)), { recursive: true });
  writeFileSync(trampolinePath(home), raw);
}

export function writeInstalledPlugins(
  home: string,
  plugins: Readonly<Record<string, readonly PluginRecord[]>>,
): void {
  const file = join(home, '.claude', 'plugins', 'installed_plugins.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ plugins }, null, 2)}\n`);
}

// Each bin echoes "<label> <surface> <stdin>" — the label names the resolved
// plugin dir, the surface names the bin the trampoline picked, and the tail
// proves stdin reached the exec'd script.
export function writeEchoBins(root: string, label: string): string {
  mkdirSync(join(root, 'bin'), { recursive: true });
  writeFileSync(
    join(root, 'bin', 'statusline.sh'),
    `echo "${label} statusline $(cat)"\n`,
  );
  writeFileSync(
    join(root, 'bin', 'subagent.sh'),
    `echo "${label} subagent $(cat)"\n`,
  );
  return root;
}

export function writeCacheVersion(home: string, version: string): string {
  return writeEchoBins(
    join(home, '.claude', 'plugins', 'cache', 'agentic', 'statusline-lab', version),
    version,
  );
}

export function snapshotTree(root: string): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(child, childRel);
      } else if (entry.isFile()) {
        files[childRel] = readFileSync(child);
      } else {
        files[childRel] = Buffer.from(`<non-file: ${entry.name}>`);
      }
    }
  };
  walk(root, '');
  return files;
}

export function runTrampoline(
  home: string,
  args: readonly string[] = [],
  stdin = '',
): RunResult {
  const run = spawnSync('bash', [trampolinePath(home), ...args], {
    input: stdin,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: home,
      LC_ALL: 'C',
    },
    timeout: 30_000,
  });
  return {
    status: run.status ?? -1,
    stdout: run.stdout ?? Buffer.alloc(0),
    stderr: (run.stderr ?? Buffer.alloc(0)).toString('utf8'),
  };
}

export interface Homes {
  readonly newHome: () => string;
  readonly dispose: () => void;
}

export function createHomes(): Homes {
  const homes: string[] = [];
  return {
    newHome(): string {
      const home = mkdtempSync(join(tmpdir(), 'statusline-apply-'));
      homes.push(home);
      return home;
    },
    dispose(): void {
      for (const home of homes) {
        rmSync(home, { recursive: true, force: true });
      }
      homes.length = 0;
    },
  };
}
