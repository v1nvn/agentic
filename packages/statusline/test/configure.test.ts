import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { parseArgs } from '../src/cli.js';
import { configure, BUNDLED_RENDERER } from '../src/configure.js';
import { DATA_DIR } from '../src/render/capture.js';
import { ITEMS } from '../src/render/index.js';
import { mainKeyValue, panelKeyValue, renderMjsPath } from '../src/resolve.js';
import {
  THEMES,
  createHomes,
  settingsCommand,
  settingsPath,
  writeSettings,
} from './fixtures.js';

function assertNothingWritten(home: string): void {
  expect(existsSync(settingsPath(home)), 'settings.json').toBe(false);
  expect(existsSync(join(home, DATA_DIR)), 'data dir').toBe(false);
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

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
    for (const { item } of ITEMS) {
      expect(parseArgs(['configure', `--${item}`, 'zzz']), item).toMatchObject({
        command: 'configure',
        variants: { [item]: 'zzz' },
      });
    }
  });
});

describe('configure: writes (contract 3)', () => {
  it('a partial pick set writes — unpicked items resolve to the registry defaults at paint', () => {
    const home = homes.newHome();

    configure({
      home,
      layout: '{cwd branch} {model effort}',
      variants: { model: 'block' },
    });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(null, '{cwd branch} {model effort}', ['--model=block']),
    );
  });

  it('writes exactly the two settings keys, nothing else on disk', () => {
    const home = homes.newHome();
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
      mainKeyValue(null, layout, [
        '--model=block',
        '--effort=dim',
        '--cwd=full',
        '--branch=last',
        '--bar=gauge',
        '--tokens=compact',
        '--cache=fuse',
      ]),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue(null, []),
    );
    expect(readdirSync(join(home, DATA_DIR)).sort(), 'data dir').toEqual([
      'backup.json',
      'render.mjs',
    ]);
  });

  it('reconfiguring an ours key repoints it in place, no --force needed', () => {
    const home = homes.newHome();
    writeSettings(home, `{"model":"opus-4"}\n`);
    configure({ home, layout: '{model}', variants: { model: 'block' } });

    configure({
      home,
      layout: '{model}',
      variants: { model: 'pill' },
    });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(null, '{model}', ['--model=pill']),
    );
    const after = readFileSync(settingsPath(home), 'utf8');
    expect(after).toContain('"model":"opus-4"');
  });

  it('default-equal picks ride no flag — the key records only decisions', () => {
    const home = homes.newHome();

    configure({
      home,
      layout: '{model bar}',
      variants: { bar: 'flat', model: 'block' },
    });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(null, '{model bar}', ['--model=block']),
    );
  });

  it('an unknown item id in --layout fails listing the valid ids', () => {
    const home = homes.newHome();
    const attempt = () =>
      configure({ home, layout: '{cwd bogusitem}', variants: { cwd: 'full' } });

    expect(attempt).toThrowError(/bogusitem/);
    expect(attempt).toThrowError(/model/);
    assertNothingWritten(home);
  });

  it('an unknown variant value fails listing the item valid ids', () => {
    const home = homes.newHome();
    const attempt = () => configure({ home, layout: '{model}', variants: { model: 'nonsense' } });

    expect(attempt).toThrowError(/nonsense/);
    expect(attempt).toThrowError(/plain/);
    expect(attempt).toThrowError(/block/);
    assertNothingWritten(home);
  });
});

describe('configure: --theme', () => {
  it('writes the theme flag alone — no item flags, no layout; the panel key carries it too', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean' });

    expect(settingsCommand(home, 'statusLine')).toBe(
      'node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean || true',
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      'node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" panel --theme=lean || true',
    );
  });

  it('an item flag adds only its own flag over the theme', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean', variants: { bar: 'gauge' } });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, ['--bar=gauge']),
    );
  });

  it('an override equal to the theme pick rides no flag — the theme carries it', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean', variants: { bar: 'percent' } });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, []),
    );
  });

  it('a custom layout rides beside the theme; the theme own layout does not', () => {
    const custom = homes.newHome();
    const own = homes.newHome();

    configure({ home: custom, theme: 'quiet', layout: '{model}' });
    configure({ home: own, theme: 'quiet', layout: THEMES.quiet.layout });

    expect(settingsCommand(custom, 'statusLine')).toBe(
      mainKeyValue('quiet', '{model}', []),
    );
    expect(settingsCommand(own, 'statusLine')).toBe(mainKeyValue('quiet', null, []));
  });

  it('a style override rides both keys over the theme style', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean', variants: { style: 'bare' } });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, ['--style=bare']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('lean', ['--style=bare']),
    );
  });

  it('a flags-only style write rides the panel key; the theme own style rides nothing', () => {
    const flagged = homes.newHome();
    const themed = homes.newHome();

    configure({ home: flagged, layout: '{model}', variants: { style: 'bare' } });
    configure({ home: themed, theme: 'quiet' });

    expect(settingsCommand(flagged, 'subagentStatusLine')).toBe(
      panelKeyValue(null, ['--style=bare']),
    );
    expect(settingsCommand(themed, 'subagentStatusLine')).toBe(
      panelKeyValue('quiet', []),
    );
  });

  it('a theme write replaces a seeded ours key with the theme decision alone', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue(null, '{model bar}', [
              '--model=block',
              '--bar=gauge',
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
      mainKeyValue('quiet', null, []),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('quiet', []),
    );
  });

  it('an unknown theme errors naming the valid themes', () => {
    const home = homes.newHome();
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
    const home = homes.newHome();

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
    const home = homes.newHome();
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
    const home = homes.newHome();
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
    const home = homes.newHome();
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
      mainKeyValue(null, '{model}', ['--model=block']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue(null, []),
    );
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.model).toBe('opus-4');
    expect(readdirSync(join(home, DATA_DIR)).sort(), 'data dir').toEqual([
      'backup.json',
      'render.mjs',
    ]);
  });
});

describe('configure: renderer sync', () => {
  it('every run syncs the bundled renderer into the data dir, byte-equal', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean' });

    expect(readFileSync(renderMjsPath(home), 'utf8')).toBe(
      readFileSync(BUNDLED_RENDERER, 'utf8'),
    );
  });

  it('an identical copy is not rewritten — mtime untouched on a rerun', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    const synced = renderMjsPath(home);
    const before = statSync(synced).mtimeMs;

    configure({ home, theme: 'lean' });

    expect(statSync(synced).mtimeMs).toBe(before);
    expect(readFileSync(synced, 'utf8')).toBe(
      readFileSync(BUNDLED_RENDERER, 'utf8'),
    );
  });

  it('a diverged copy is refreshed on the next run — even a settings no-op', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    const synced = renderMjsPath(home);
    writeFileSync(synced, '// diverged\n');

    configure({ home, theme: 'lean' });

    expect(readFileSync(synced, 'utf8')).toBe(
      readFileSync(BUNDLED_RENDERER, 'utf8'),
    );
  });
});

describe('configure to catalog (the scratch-home e2e)', () => {
  it('after configure, catalog stars follow the written key', () => {
    const home = homes.newHome();

    configure({
      home,
      layout: '{model bar}',
      variants: { bar: 'gauge', model: 'block' },
    });

    const lines = catalog({ home }).split('\n');
    expect(lines).toContain('model: plain | block* | pill | zen');
    expect(lines).toContain('bar: flat | gauge* | percent | none | flat6 | flat4');
  });
});
