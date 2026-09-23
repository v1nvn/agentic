import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { buildProgram, parseArgs } from '../src/cli.js';
import {
  createHomes,
  installRuntime,
  mainKeyValue,
  writeSettings,
} from './fixtures.js';

const RUNTIME_DIR = fileURLToPath(
  new URL('../../../plugins/statusline/runtime', import.meta.url),
);
const RUNTIME_MAIN = join(RUNTIME_DIR, 'statusline.sh');
const RUNTIME_COMPONENTS = join(RUNTIME_DIR, 'components');
const RUNTIME_LIB = join(RUNTIME_DIR, 'lib.sh');

// Each dead verb is invoked the way a user would really type it — with the
// arguments it used to accept — so a pass is a surviving verb, not a missing
// required argument.
const DEAD_VERBS: ReadonlyArray<{
  readonly args: readonly string[];
  readonly name: string;
}> = [
  { args: ['apply'], name: 'apply' },
  { args: ['capture'], name: 'capture' },
  { args: ['designs'], name: 'designs' },
  { args: ['payload', 'p1'], name: 'payload p1' },
  { args: ['pick'], name: 'pick' },
  { args: ['resolve'], name: 'resolve' },
];

// Independent parses of the plugin runtime (contract 6's forever home) — the
// catalog is cross-checked against these, never against the implementation's
// own readers.
function declaredAlternatives(): Map<string, readonly string[]> {
  const declared = new Map<string, readonly string[]>();
  for (const file of readdirSync(RUNTIME_COMPONENTS).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    for (const line of readFileSync(
      join(RUNTIME_COMPONENTS, file),
      'utf8',
    ).split('\n')) {
      if (!line.startsWith('#')) {
        break;
      }
      const match = /alternatives:\s*(.+)$/.exec(line);
      if (match) {
        declared.set(
          file.slice(0, -'.sh'.length),
          match[1]
            .split('|')
            .map(alt => alt.trim().replace(/\s*\(current\)$/, '')),
        );
      }
    }
  }
  return declared;
}

function declaredOrder(): string[] {
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_MAIN, 'utf8'));
  if (match === null) {
    throw new Error('statusline.sh declares no COMPS order');
  }
  return match[1].split(' ');
}

function declaredDefaults(): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const [, item, alt] of readFileSync(RUNTIME_LIB, 'utf8').matchAll(
    /([a-z]+)\) echo ([a-z]+) ;;/g,
  )) {
    defaults.set(item, alt);
  }
  return defaults;
}

function expectedLines(
  live: Record<string, string>,
  items?: readonly string[],
): string[] {
  const alternatives = declaredAlternatives();
  const defaults = declaredDefaults();
  return (items ?? declaredOrder()).map(item => {
    const current = live[item] ?? defaults.get(item);
    return `${item}: ${(alternatives.get(item) ?? [])
      .map(alt => (alt === current ? `${alt}*` : alt))
      .join(' | ')}`;
  });
}

function seedOursKey(
  home: string,
  layout: string,
  assignments: readonly string[],
): void {
  writeSettings(
    home,
    `${JSON.stringify(
      {
        statusLine: {
          command: mainKeyValue(layout, assignments),
          type: 'command',
        },
      },
      null,
      2,
    )}\n`,
  );
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('the verb surface (contracts 1 and 10)', () => {
  it('registers exactly catalog, configure, restore, and status', () => {
    expect(
      buildProgram()
        .commands.map(command => command.name())
        .sort(),
    ).toEqual(['catalog', 'configure', 'restore', 'status']);
  });

  it('a bare invocation is a usage error the entry answers with help and a non-zero exit', () => {
    // The entry maps a failed parse to printUsageAndExit (help + exit 1).
    expect(parseArgs([])).toBeUndefined();
    const help = buildProgram().helpInformation();
    expect(help).toContain('catalog');
    expect(help).toContain('configure');
  });

  it.each([...DEAD_VERBS])('$name is no-such-command', ({ args }) => {
    expect(parseArgs([...args])).toBeUndefined();
  });
});

describe('catalog: parsing', () => {
  it('parses a bare catalog, --home, and item filters; rejects everything else', () => {
    expect(parseArgs(['catalog'])).toMatchObject({ command: 'catalog' });
    expect(parseArgs(['catalog', '--home', '/tmp/lab-home'])).toMatchObject({
      command: 'catalog',
      home: '/tmp/lab-home',
    });
    expect(parseArgs(['catalog', '--model', '--bar'])).toMatchObject({
      command: 'catalog',
      items: ['model', 'bar'],
    });
    expect(parseArgs(['catalog', '--bogus'])).toBeUndefined();
    expect(parseArgs(['catalog', 'stray'])).toBeUndefined();
    expect(parseArgs(['catalog', '--nonsense'])).toBeUndefined();
  });

  it('offers a boolean flag for every item id', () => {
    for (const item of declaredOrder()) {
      expect(parseArgs(['catalog', `--${item}`]), item).toMatchObject({
        command: 'catalog',
        items: [item],
      });
    }
  });
});

describe('catalog: the runtime install seam (contract 2)', () => {
  it('no resolvable runtime under $HOME fails with the install hint', () => {
    const home = homes.newHome();
    const attempt = (): string => catalog({ home });

    expect(attempt).toThrowError(/install/);
    expect(attempt).toThrowError(/no statusline runtime/);
  });
});

describe('catalog: output (contract 2)', () => {
  it('lists one line per item with the lib default starred and zero ANSI', () => {
    const home = homes.newHome();
    installRuntime(home);

    const out = catalog({ home });

    expect(out).not.toMatch(/\u001b\[/);
    expect(out.split('\n')).toEqual(expectedLines({}));
  });

  it('stars follow the main key assignments in settings.json', () => {
    const home = homes.newHome();
    installRuntime(home);
    seedOursKey(home, '{model cache}', [
      'STATUSLINE_LAB_MODEL=block',
      'STATUSLINE_LAB_CACHE=none',
    ]);

    const out = catalog({ home });

    expect(out.split('\n')).toEqual(
      expectedLines({ cache: 'none', model: 'block' }),
    );
  });

  it('boolean flags cut the listing to those items', () => {
    const home = homes.newHome();
    installRuntime(home);

    const out = catalog({ home, items: ['model', 'bar'] });

    expect(out.split('\n')).toEqual(expectedLines({}, ['model', 'bar']));
  });
});
