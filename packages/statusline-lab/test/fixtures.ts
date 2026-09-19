import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUNTIME_SOURCE = fileURLToPath(
  new URL('../../../plugins/statusline-lab/runtime', import.meta.url),
);

export const DATA_REL = join(
  '.claude',
  'plugins',
  'data',
  'statusline-lab-agentic',
);

// A fake installed plugin (contract 6): the repo runtime copied into the
// versioned cache dir the shared install seam resolves (contract 2).
export function installRuntime(home: string, version = '0.19.0'): string {
  const dest = join(
    home,
    '.claude',
    'plugins',
    'cache',
    'agentic',
    'statusline-lab',
    version,
    'runtime',
  );
  cpSync(RUNTIME_SOURCE, dest, { recursive: true });
  return dest;
}

export function settingsPath(home: string): string {
  return join(home, '.claude', 'settings.json');
}

export function writeSettings(home: string, raw: string): void {
  mkdirSync(dirname(settingsPath(home)), { recursive: true });
  writeFileSync(settingsPath(home), raw);
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

export interface Homes {
  readonly newHome: () => string;
  readonly dispose: () => void;
}

export function createHomes(): Homes {
  const homes: string[] = [];
  return {
    newHome(): string {
      const home = mkdtempSync(join(tmpdir(), 'statusline-lab-'));
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
