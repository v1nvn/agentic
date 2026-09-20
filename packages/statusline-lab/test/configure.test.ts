import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { parseArgs } from '../src/cli.js';
import { configure, type ConfigureResult } from '../src/configure.js';
import {
  DATA_REL,
  createHomes,
  installRuntime,
  mainKeyValue,
  settingsCommand,
  settingsPath,
  subagentKeyValue,
  writeSettings,
} from './fixtures.js';
import { tmpFilesUnder } from './plugin-runtime.js';

const RUNTIME_MAIN = fileURLToPath(
  new URL('../../../plugins/statusline-lab/runtime/statusline.sh', import.meta.url),
);

function itemIds(): string[] {
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_MAIN, 'utf8'));
  if (match === null) {
    throw new Error('statusline.sh declares no COMPS order');
  }
  return match[1].split(' ');
}

function assertNothingWritten(home: string): void {
  expect(existsSync(settingsPath(home)), 'settings.json').toBe(false);
  expect(existsSync(join(home, DATA_REL)), 'data dir').toBe(false);
}

function textOf(result: ConfigureResult): string {
  if (result.mode === 'written') {
    throw new Error('expected a text-carrying result');
  }
  return result.text;
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

describe('configure: parsing', () => {
  it('parses the full flag set; rejects bad fallbacks, unknown flags, and stray arguments', () => {
    expect(
      parseArgs([
        'configure',
        '--model',
        'block',
        '--layout',
        '{model effort}',
        '--fallback=default',
        '--dry-run',
        '--force',
        '--home',
        '/tmp/lab-home',
      ]),
    ).toMatchObject({
      command: 'configure',
      dryRun: true,
      fallback: 'default',
      force: true,
      home: '/tmp/lab-home',
      layout: '{model effort}',
      variants: { model: 'block' },
    });
    expect(parseArgs(['configure', '--fallback=bogus'])).toBeUndefined();
    expect(parseArgs(['configure', '--bogus'])).toBeUndefined();
    expect(parseArgs(['configure', 'stray'])).toBeUndefined();
    expect(parseArgs(['configure', '--nonsense', 'zzz'])).toBeUndefined();
  });

  it('parses --fallback=existing and a bare configure', () => {
    expect(parseArgs(['configure', '--fallback=existing'])).toMatchObject({
      command: 'configure',
      fallback: 'existing',
    });
    expect(parseArgs(['configure'])).toMatchObject({ command: 'configure' });
  });

  it('offers a valued flag for every item id', () => {
    for (const item of itemIds()) {
      expect(parseArgs(['configure', `--${item}`, 'zzz']), item).toMatchObject({
        command: 'configure',
        variants: { [item]: 'zzz' },
      });
    }
  });
});

describe('configure: strict mode (contract 3)', () => {
  it('fails naming every unflagged layout item and writes nothing', () => {
    const home = newInstalledHome();
    const attempt = () =>
      configure({
        home,
        layout: '{cwd branch} {model effort}',
        variants: { model: 'block' },
      });

    expect(attempt).toThrowError();
    expect(attempt).toThrowError(/cwd/);
    expect(attempt).toThrowError(/branch/);
    assertNothingWritten(home);
  });

  it('writes exactly the two settings keys, nothing else on disk', () => {
    const home = newInstalledHome();
    const layout = '{cwd branch} {model effort} {bar tokens cache}';

    const result = configure({
      home,
      layout,
      variants: {
        bar: 'gauge',
        branch: 'last',
        cache: 'fuse',
        cwd: 'full',
        effort: 'dim',
        model: 'block',
        tokens: 'compact',
      },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(layout, [
        'STATUSLINE_LAB_CWD=full',
        'STATUSLINE_LAB_BRANCH=last',
        'STATUSLINE_LAB_MODEL=block',
        'STATUSLINE_LAB_EFFORT=dim',
        'STATUSLINE_LAB_BAR=gauge',
        'STATUSLINE_LAB_TOKENS=compact',
        'STATUSLINE_LAB_CACHE=fuse',
      ]),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      subagentKeyValue,
    );
    expect(readdirSync(join(home, DATA_REL)), 'data dir').toEqual([
      'backup.json',
    ]);
  });

  it('reconfiguring an ours key repoints it in place, no --force needed', () => {
    const home = newInstalledHome();
    writeSettings(home, `{"model":"opus-4"}\n`);
    configure({ home, layout: '{model}', variants: { model: 'block' } });

    const result = configure({
      home,
      layout: '{model}',
      variants: { model: 'pill' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=pill']),
    );
    const after = readFileSync(settingsPath(home), 'utf8');
    expect(after).toContain('"model":"opus-4"');
  });

  it('an unknown item id in --layout fails listing the valid ids', () => {
    const home = newInstalledHome();
    const attempt = () =>
      configure({ home, layout: '{cwd bogusitem}', variants: { cwd: 'full' } });

    expect(attempt).toThrowError(/bogusitem/);
    expect(attempt).toThrowError(/model/);
    assertNothingWritten(home);
  });

  it('an unknown variant value fails listing the item valid ids', () => {
    const home = newInstalledHome();
    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'nonsense' } });

    expect(attempt).toThrowError(/nonsense/);
    expect(attempt).toThrowError(/plain/);
    expect(attempt).toThrowError(/block/);
    assertNothingWritten(home);
  });
});

describe('configure: --fallback=default (contract 3)', () => {
  it('resolves unflagged layout items to concrete defaults; flags override', () => {
    const home = newInstalledHome();

    const result = configure({
      fallback: 'default',
      home,
      layout: '{model effort} {bar tokens}',
      variants: { model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model effort} {bar tokens}', [
        'STATUSLINE_LAB_MODEL=block',
        'STATUSLINE_LAB_EFFORT=plain',
        'STATUSLINE_LAB_BAR=flat',
        'STATUSLINE_LAB_TOKENS=full',
      ]),
    );
  });
});

describe('configure: --fallback=existing (contracts 3 and 5)', () => {
  function seedOursKey(
    home: string,
    layout: string,
    assignments: readonly string[],
  ): void {
    writeSettings(
      home,
      `${JSON.stringify(
        { statusLine: { command: mainKeyValue(layout, assignments), type: 'command' } },
        null,
        2,
      )}\n`,
    );
  }

  it('sources values from the main key; flags override one', () => {
    const home = newInstalledHome();
    seedOursKey(home, '{model bar}', [
      'STATUSLINE_LAB_MODEL=block',
      'STATUSLINE_LAB_BAR=gauge',
    ]);

    const result = configure({
      fallback: 'existing',
      home,
      layout: '{model bar}',
      variants: { model: 'pill' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model bar}', [
        'STATUSLINE_LAB_MODEL=pill',
        'STATUSLINE_LAB_BAR=gauge',
      ]),
    );
  });

  it('drops assignments for items the new layout drops', () => {
    const home = newInstalledHome();
    seedOursKey(home, '{model bar} {style}', [
      'STATUSLINE_LAB_MODEL=block',
      'STATUSLINE_LAB_BAR=gauge',
      'STATUSLINE_LAB_STYLE=dots',
    ]);

    const result = configure({
      fallback: 'existing',
      home,
      layout: '{model bar}',
      variants: { model: 'pill' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    const key = settingsCommand(home, 'statusLine');
    expect(key).toBe(
      mainKeyValue('{model bar}', [
        'STATUSLINE_LAB_MODEL=pill',
        'STATUSLINE_LAB_BAR=gauge',
      ]),
    );
    expect(key).not.toContain('STATUSLINE_LAB_STYLE');
  });

  it('a layout item unresolved by base and flags fails loudly — no silent defaults', () => {
    const home = newInstalledHome();
    seedOursKey(home, '{bar}', ['STATUSLINE_LAB_BAR=gauge']);
    const seeded = readFileSync(settingsPath(home), 'utf8');

    const attempt = () =>
      configure({ home, fallback: 'existing', layout: '{bar tokens}' });

    expect(attempt).toThrowError(/tokens/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seeded);
    expect(tmpFilesUnder(home)).toEqual([]);
  });
});

describe('configure: --dry-run (contract 3)', () => {
  it('renders both surfaces and persists nothing', () => {
    const home = newInstalledHome();

    const result = configure({
      dryRun: true,
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'dry-run' });
    expect(existsSync(settingsPath(home))).toBe(false);
    // The render proof is the runtime's own tee (contract 7): spawning the
    // installed runtime under this home leaves both captures behind.
    expect(existsSync(join(home, DATA_REL, 'captures', 'main.json'))).toBe(
      true,
    );
    expect(existsSync(join(home, DATA_REL, 'captures', 'tick.json'))).toBe(
      true,
    );
  });
});

describe('configure: no params, no TTY (contract 3)', () => {
  it('prints the effective config with a hint and writes nothing', () => {
    const bare = newInstalledHome();

    const printed = configure({ home: bare });

    expect(printed).toMatchObject({ mode: 'printed' });
    const text = textOf(printed);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/configure/i);
    assertNothingWritten(bare);

    const seeded = newInstalledHome();
    writeSettings(
      seeded,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue('{model bar}', ['STATUSLINE_LAB_MODEL=block']),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );
    expect(textOf(configure({ home: seeded }))).toContain('block');
  });
});

describe('configure: settings refusal (E4 port)', () => {
  it('refuses a foreign statusLine key, touching nothing', () => {
    const home = newInstalledHome();
    const seed = `${JSON.stringify(
      {
        model: 'opus-4',
        statusLine: { type: 'command', command: './old-main.sh' },
      },
      null,
      2,
    )}\n`;
    writeSettings(home, seed);

    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'block' } });

    expect(attempt).toThrowError(/statusLine/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });

  it('refuses a foreign subagentStatusLine key, touching nothing', () => {
    const home = newInstalledHome();
    const seed = `${JSON.stringify(
      {
        model: 'opus-4',
        subagentStatusLine: { type: 'command', command: './old-sub.sh' },
      },
      null,
      2,
    )}\n`;
    writeSettings(home, seed);

    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'block' } });

    expect(attempt).toThrowError(/subagentStatusLine/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });

  it('--force takes over both foreign keys and preserves siblings', () => {
    const home = newInstalledHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          model: 'opus-4',
          statusLine: { type: 'command', command: './old-main.sh' },
          subagentStatusLine: { type: 'command', command: './old-sub.sh' },
        },
        null,
        2,
      )}\n`,
    );

    const result = configure({
      force: true,
      home,
      layout: '{model}',
      variants: { model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=block']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(subagentKeyValue);
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.model).toBe('opus-4');
    expect(readdirSync(join(home, DATA_REL)), 'data dir').toEqual([
      'backup.json',
    ]);
  });
});

describe('configure: install check', () => {
  it('no plugin cache dir under $HOME fails with the install hint', () => {
    const home = homes.newHome();
    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'block' } });

    expect(attempt).toThrowError(/install/);
    expect(attempt).toThrowError(/statusline-lab/);
    assertNothingWritten(home);
  });
});

describe('configure to catalog (the scratch-home e2e)', () => {
  it('after configure, catalog stars follow the written key', () => {
    const home = newInstalledHome();

    configure({
      home,
      layout: '{model bar}',
      variants: { bar: 'gauge', model: 'block' },
    });

    const lines = catalog({ home }).split('\n');
    expect(lines).toContain('model: plain | block* | pill | zen');
    expect(lines).toContain('bar: flat | gauge* | percent | none');
  });
});
