import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { parseArgs } from '../src/cli.js';
import { configure } from '../src/configure.js';
import {
  DATA_REL,
  THEMES,
  createHomes,
  installRuntime,
  mainKeyValue,
  settingsCommand,
  settingsPath,
  subagentKeyValue,
  writeSettings,
} from './fixtures.js';

const RUNTIME_MAIN = fileURLToPath(
  new URL('../../../plugins/statusline/runtime/statusline.sh', import.meta.url),
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
  it('parses the full flag set; rejects --fallback, --dry-run, unknown flags, and stray arguments', () => {
    expect(
      parseArgs([
        'configure',
        '--model',
        'block',
        '--layout',
        '{model effort}',
        '--theme',
        'lean',
        '--force',
        '--home',
        '/tmp/lab-home',
      ]),
    ).toMatchObject({
      command: 'configure',
      force: true,
      home: '/tmp/lab-home',
      layout: '{model effort}',
      theme: 'lean',
      variants: { model: 'block' },
    });
    expect(parseArgs(['configure', '--fallback=default'])).toBeUndefined();
    expect(parseArgs(['configure', '--fallback=existing'])).toBeUndefined();
    expect(parseArgs(['configure', '--fallback', 'default'])).toBeUndefined();
    expect(parseArgs(['configure', '--dry-run'])).toBeUndefined();
    expect(parseArgs(['configure', '--bogus'])).toBeUndefined();
    expect(parseArgs(['configure', 'stray'])).toBeUndefined();
    expect(parseArgs(['configure', '--nonsense', 'zzz'])).toBeUndefined();
  });

  it('parses --theme alone and a bare configure', () => {
    expect(parseArgs(['configure', '--theme', 'quiet'])).toMatchObject({
      command: 'configure',
      theme: 'quiet',
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

    configure({
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

    configure({
      home,
      layout: '{model}',
      variants: { model: 'pill' },
    });

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

describe('configure: --theme', () => {
  it('writes lean; the settings text is byte-equal to a flags-only write of the same layout and variants', () => {
    const themed = newInstalledHome();
    const flagged = newInstalledHome();

    configure({ home: themed, theme: 'lean' });
    configure({
      home: flagged,
      layout: THEMES.lean.layout,
      variants: THEMES.lean.variants,
    });

    expect(readFileSync(settingsPath(themed), 'utf8')).toBe(
      readFileSync(settingsPath(flagged), 'utf8'),
    );
  });

  it('an item flag swaps exactly that one pick over the theme', () => {
    const themed = newInstalledHome();
    const swapped = newInstalledHome();

    configure({ home: themed, theme: 'lean' });
    configure({ home: swapped, theme: 'lean', variants: { bar: 'gauge' } });

    const lean = settingsCommand(themed, 'statusLine');
    expect(lean).toContain('STATUSLINE_LAB_BAR=percent');
    expect(settingsCommand(swapped, 'statusLine')).toBe(
      lean.replace('STATUSLINE_LAB_BAR=percent', 'STATUSLINE_LAB_BAR=gauge'),
    );
  });

  it('a theme write replaces a seeded ours key with exactly the theme values', () => {
    const home = newInstalledHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue('{model bar}', [
              'STATUSLINE_LAB_MODEL=block',
              'STATUSLINE_LAB_BAR=gauge',
            ]),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );

    configure({ home, theme: 'quiet' });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model cwd}', [
        'STATUSLINE_LAB_MODEL=zen',
        'STATUSLINE_LAB_CWD=tail',
        'STATUSLINE_LAB_STYLE=bare',
      ]),
    );
  });

  it('a theme gap errors naming the item and its flag — no registry-default fill, nothing written', () => {
    const home = newInstalledHome();
    const attempt = () =>
      configure({ home, theme: 'quiet', layout: '{model effort} {cwd}' });

    expect(attempt).toThrowError(/quiet/);
    expect(attempt).toThrowError(/effort/);
    expect(attempt).toThrowError(/--effort/);
    assertNothingWritten(home);
  });

  it('an unknown theme errors naming the valid themes', () => {
    const home = newInstalledHome();
    const attempt = () => configure({ home, theme: 'nope' });

    expect(attempt).toThrowError(/nope/);
    expect(attempt).toThrowError(/valid themes/);
    for (const name of ['classic', 'custom', 'lean', 'quiet', 'rich']) {
      expect(attempt, name).toThrowError(new RegExp(name));
    }
    assertNothingWritten(home);
  });
});

describe('configure: no params, no TTY (contract 3)', () => {
  it('errors naming the two guides — the wizard on a terminal, the lab skill in Claude Code — and writes nothing', () => {
    const home = newInstalledHome();

    const attempt = () => configure({ home });

    expect(attempt).toThrowError(/wizard/);
    expect(attempt).toThrowError(/terminal/);
    expect(attempt).toThrowError(/\/lab/);
    expect(attempt).toThrowError(/Claude Code/);
    assertNothingWritten(home);
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

    configure({
      force: true,
      home,
      layout: '{model}',
      variants: { model: 'block' },
    });

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
    expect(attempt).toThrowError(/no statusline runtime/);
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
