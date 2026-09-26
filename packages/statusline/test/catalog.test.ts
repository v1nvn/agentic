import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { buildProgram, parseArgs } from '../src/cli.js';
import { liveTheme } from '../src/live-theme.js';
import { THEMES } from '../src/themes.js';
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

// Derived from THEMES on purpose: the block quotes THEMES verbatim, in
// THEMES's own order — the shape (name, star, colon, summary) is the pin.
function expectedThemeLines(live: string | undefined): string[] {
  return Object.entries(THEMES).map(
    ([name, theme]) => `${name}${live === name ? '*' : ''}: ${theme.summary}`,
  );
}

function themeKeyAssignments(
  variants: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(variants).map(
    ([item, variant]) => `STATUSLINE_LAB_${item.toUpperCase()}=${variant}`,
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
    ).toEqual(['catalog', 'configure', 'preview', 'restore', 'status']);
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
  it('leads with the themes block, a blank line, then the item lines with the lib default starred and zero ANSI', () => {
    const home = homes.newHome();
    installRuntime(home);

    const out = catalog({ home });

    expect(out).not.toMatch(/\u001b\[/);
    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({}),
    ]);
  });

  it('stars follow the main key assignments in settings.json', () => {
    const home = homes.newHome();
    installRuntime(home);
    seedOursKey(home, '{model cache}', [
      'STATUSLINE_LAB_MODEL=block',
      'STATUSLINE_LAB_CACHE=none',
    ]);

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({ cache: 'none', model: 'block' }),
    ]);
  });

  it('boolean flags cut the item lines to those items; the block still leads', () => {
    const home = homes.newHome();
    installRuntime(home);

    const out = catalog({ home, items: ['model', 'bar'] });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({}, ['model', 'bar']),
    ]);
  });
});

describe('the live-theme matcher', () => {
  it('names the theme whose layout and assignments the key equals exactly', () => {
    expect(
      liveTheme({
        layout: THEMES.quiet.layout,
        values: { ...THEMES.quiet.variants },
      }),
    ).toBe('quiet');
    expect(
      liveTheme({
        layout: THEMES.lean.layout,
        values: { ...THEMES.lean.variants },
      }),
    ).toBe('lean');
  });

  it('a one-swap key (--theme lean --bar gauge) matches nothing', () => {
    expect(
      liveTheme({
        layout: THEMES.lean.layout,
        values: { ...THEMES.lean.variants, bar: 'gauge' },
      }),
    ).toBeUndefined();
  });

  it('the layout must equal too — lean assignments on quiet layout match nothing', () => {
    expect(
      liveTheme({
        layout: THEMES.quiet.layout,
        values: { ...THEMES.lean.variants },
      }),
    ).toBeUndefined();
  });

  it('equality runs both directions — a dropped assignment matches nothing', () => {
    const values = { ...THEMES.lean.variants };
    delete values.rate;

    expect(liveTheme({ layout: THEMES.lean.layout, values })).toBeUndefined();
  });

  it('the key side of both directions — an assignment beyond the theme set matches nothing', () => {
    expect(
      liveTheme({
        layout: THEMES.quiet.layout,
        values: { ...THEMES.quiet.variants, branch: 'initials' },
      }),
    ).toBeUndefined();
  });

  it('no key (null layout, no values) matches nothing', () => {
    expect(liveTheme({ layout: null, values: {} })).toBeUndefined();
  });
});

describe('catalog: the themes block', () => {
  it('parses --themes as a boolean flag beside --home and the item flags', () => {
    expect(parseArgs(['catalog', '--themes'])).toMatchObject({
      command: 'catalog',
      themes: true,
    });
    expect(
      parseArgs(['catalog', '--themes', '--home', '/tmp/lab-home']),
    ).toMatchObject({
      command: 'catalog',
      home: '/tmp/lab-home',
      themes: true,
    });
    expect(parseArgs(['catalog'])).not.toMatchObject({ themes: true });
  });

  it('stars the theme the live key equals exactly', () => {
    const home = homes.newHome();
    installRuntime(home);
    seedOursKey(
      home,
      THEMES.lean.layout,
      themeKeyAssignments(THEMES.lean.variants),
    );

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines('lean'),
      '',
      ...expectedLines({ ...THEMES.lean.variants }),
    ]);
  });

  it('a one-swap key (--theme lean --bar gauge) stars nothing', () => {
    const home = homes.newHome();
    installRuntime(home);
    seedOursKey(
      home,
      THEMES.lean.layout,
      themeKeyAssignments({ ...THEMES.lean.variants, bar: 'gauge' }),
    );

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({ ...THEMES.lean.variants, bar: 'gauge' }),
    ]);
  });

  it('--themes cuts the output to the block alone', () => {
    const home = homes.newHome();
    installRuntime(home);
    seedOursKey(
      home,
      THEMES.lean.layout,
      themeKeyAssignments(THEMES.lean.variants),
    );

    const out = catalog({ home, themes: true });

    expect(out.split('\n')).toEqual(expectedThemeLines('lean'));
  });

  it('no key present: no star, five clean lines', () => {
    const home = homes.newHome();
    installRuntime(home);

    const out = catalog({ home, themes: true });

    expect(out.split('\n')).toEqual(expectedThemeLines(undefined));
    expect(out).not.toContain('*');
  });
});
