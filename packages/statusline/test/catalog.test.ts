import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { buildProgram, parseArgs } from '../src/cli.js';
import { configure } from '../src/configure.js';
import { ITEMS } from '../src/render/index.js';
import { mainKeyValue } from '../src/resolve.js';
import { THEMES, createHomes, writeSettings } from './fixtures.js';

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

function expectedLines(
  picks: Record<string, string>,
  items?: readonly string[],
): string[] {
  return (items ?? ITEMS.map(({ item }) => item)).map(item => {
    const entry = ITEMS.find(spec => spec.item === item);
    if (entry === undefined) {
      throw new Error(`unknown item '${item}'`);
    }
    const current = picks[item] ?? entry.default;
    return `${item}: ${entry.alternatives
      .map(alt => (alt === current ? `${alt}*` : alt))
      .join(' | ')}`;
  });
}

function seedOursKey(
  home: string,
  theme: null | string,
  layout: null | string,
  flags: readonly string[],
): void {
  writeSettings(
    home,
    `${JSON.stringify(
      {
        statusLine: {
          command: mainKeyValue(theme, layout, flags),
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
function expectedThemeLines(theme: string | undefined): string[] {
  return Object.entries(THEMES).map(
    ([name, spec]) => `${name}${theme === name ? '*' : ''}: ${spec.summary}`,
  );
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('the verb surface (contracts 1 and 10)', () => {
  it('registers exactly catalog, configure, preview, restore, and status', () => {
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
    for (const { item } of ITEMS) {
      expect(parseArgs(['catalog', `--${item}`]), item).toMatchObject({
        command: 'catalog',
        items: [item],
      });
    }
  });
});

describe('catalog: output (contract 2)', () => {
  it('leads with the themes block, a blank line, then the item lines with the registry default starred and zero ANSI', () => {
    const home = homes.newHome();

    const out = catalog({ home });

    expect(out).not.toMatch(/\u001b\[/);
    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({}),
    ]);
  });

  it('stars follow the main key flags in settings.json', () => {
    const home = homes.newHome();
    seedOursKey(home, null, '{model cache}', [
      '--model=block',
      '--cache=none',
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

    const out = catalog({ home, items: ['model', 'bar'] });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({}, ['model', 'bar']),
    ]);
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

  it('stars the theme the key names, and stars its resolved picks per item', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines('lean'),
      '',
      ...expectedLines({ ...THEMES.lean.variants }),
    ]);
  });

  it('a one-swap key (--theme lean --bar gauge) still stars lean by name; the swap stars per item', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean', variants: { bar: 'gauge' } });

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines('lean'),
      '',
      ...expectedLines({ ...THEMES.lean.variants, bar: 'gauge' }),
    ]);
  });

  it('a sparse theme stars its picks and leaves the rest at the registry defaults', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines('quiet'),
      '',
      ...expectedLines({ ...THEMES.quiet.variants }),
    ]);
  });

  it('a hand-seeded themed key stars by the name it carries', () => {
    const home = homes.newHome();
    seedOursKey(home, 'rich', null, []);

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines('rich'),
      '',
      ...expectedLines({ ...THEMES.rich.variants }),
    ]);
  });

  it('an unknown theme on the key stars nothing and leaves every item at its default', () => {
    const home = homes.newHome();
    seedOursKey(home, 'wat', null, []);

    const out = catalog({ home });

    expect(out.split('\n')).toEqual([
      ...expectedThemeLines(undefined),
      '',
      ...expectedLines({}),
    ]);
  });

  it('--themes cuts the output to the block alone', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });

    const out = catalog({ home, themes: true });

    expect(out.split('\n')).toEqual(expectedThemeLines('lean'));
  });

  it('no key present: no star, five clean lines', () => {
    const home = homes.newHome();

    const out = catalog({ home, themes: true });

    expect(out.split('\n')).toEqual(expectedThemeLines(undefined));
    expect(out).not.toContain('*');
  });

  it('--themes beside item flags is an error, not a silent cut', () => {
    const home = homes.newHome();

    expect(() =>
      catalog({ home, items: ['model'], themes: true }),
    ).toThrowError(/--themes cannot combine with item flags/);
  });
});
