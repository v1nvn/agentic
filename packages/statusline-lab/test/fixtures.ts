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

export function settingsCommand(
  home: string,
  key: 'statusLine' | 'subagentStatusLine',
): string {
  const settings = JSON.parse(
    readFileSync(settingsPath(home), 'utf8'),
  ) as Record<string, unknown>;
  const value = settings[key];
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { command?: unknown }).command !== 'string'
  ) {
    throw new Error(`${key} in ${settingsPath(home)} is not a command member`);
  }
  return (value as { command: string }).command;
}

export const KEY_RESOLVER =
  "d=$(printf '%s\\n' ~/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1)";

export function mainKeyValue(
  layout: string,
  assignments: readonly string[],
): string {
  return `${KEY_RESOLVER}; STATUSLINE_LAB_LAYOUT='${layout}' ${assignments.join(
    ' ',
  )} bash "\${d}runtime/statusline.sh" 2>/dev/null || true`;
}

export const subagentKeyValue = `${KEY_RESOLVER}; bash "\${d}runtime/subagent.sh" 2>/dev/null || true`;

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
