import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { DATA_DIR } from '../src/render/capture.js';
import { themesFor } from '../src/themes.js';

export const THEMES = themesFor();

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

export function backupPath(home: string): string {
  return join(home, DATA_DIR, 'backup.json');
}

export function writeCapture(
  home: string,
  surface: 'main' | 'tick',
  ageMs: number,
): void {
  const file = join(home, DATA_DIR, 'captures', `${surface}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, '{}\n');
  const at = new Date(Date.now() - ageMs);
  utimesSync(file, at, at);
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

// The settings key is a shell command: split it into the argv the host shell
// would hand node — single-quoted flag values stay one word, "$HOME/…"
// expands, `|| true` drops away. The first word must be the program.
export function keyArgv(key: string, home: string): readonly string[] {
  const words: string[] = [];
  let word = '';
  let quoted = false;
  for (const c of key) {
    if (quoted) {
      if (c === "'") {
        quoted = false;
      } else {
        word += c;
      }
    } else if (c === "'") {
      quoted = true;
    } else if (c === ' ') {
      if (word !== '') {
        words.push(word);
        word = '';
      }
    } else {
      word += c;
    }
  }
  if (word !== '') {
    words.push(word);
  }
  const argv = words
    .filter(word => word !== '||' && word !== 'true')
    .map(word =>
      word.replace(/^"(.*)"$/, '$1').replace(/^\$HOME/, home),
    );
  if (argv[0] !== 'node') {
    throw new Error(`key does not spawn node: ${key}`);
  }
  return argv.slice(1);
}

// The capture tee writes tmp + rename, so a .tmp name anywhere under the
// data dir is a torn write.
export function tmpFilesUnder(home: string): string[] {
  const root = join(home, DATA_DIR);
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

export interface Homes {
  readonly newHome: () => string;
  readonly dispose: () => void;
}

export function createHomes(): Homes {
  const homes: string[] = [];
  return {
    newHome(): string {
      const home = mkdtempSync(join(tmpdir(), 'statusline-'));
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
