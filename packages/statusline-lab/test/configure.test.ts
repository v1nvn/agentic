import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { parseArgs } from '../src/cli.js';
import { configure, type ConfigureResult } from '../src/configure.js';
import { tmpFilesUnder } from './plugin-runtime.js';

const RUNTIME_SOURCE = fileURLToPath(
  new URL('../../../plugins/statusline-lab/runtime', import.meta.url),
);
const RUNTIME_MAIN = join(RUNTIME_SOURCE, 'statusline.sh');

const DATA_REL = join('.claude', 'plugins', 'data', 'statusline-lab-agentic');
const MAIN_COMMAND = `~/${join(DATA_REL, 'statusline-command.sh')}`;
const SUB_COMMAND = `~/${join(DATA_REL, 'subagent-statusline.sh')}`;

const MANAGED_BY =
  '# statusline-lab — your config. Managed by `statusline-lab configure`.';

const GLOB_NEWEST =
  'd=$(printf \'%s\\n\' "$HOME"/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1)';

function execTail(bin: 'statusline.sh' | 'subagent.sh'): string[] {
  return [
    GLOB_NEWEST,
    `[ -f "\${d%/}/runtime/${bin}" ] && exec bash "\${d%/}/runtime/${bin}" "$@"`,
    'exit 0',
  ];
}

function itemIds(): string[] {
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_MAIN, 'utf8'));
  if (match === null) {
    throw new Error('statusline.sh declares no COMPS order');
  }
  return match[1].split(' ');
}

function mainScript(home: string): string {
  return join(home, DATA_REL, 'statusline-command.sh');
}

function subagentScript(home: string): string {
  return join(home, DATA_REL, 'subagent-statusline.sh');
}

function settingsFile(home: string): string {
  return join(home, '.claude', 'settings.json');
}

function captureFile(home: string, surface: 'main' | 'tick'): string {
  return join(home, DATA_REL, 'captures', `${surface}.json`);
}

function writeSettingsFile(home: string, raw: string): void {
  mkdirSync(dirname(settingsFile(home)), { recursive: true });
  writeFileSync(settingsFile(home), raw);
}

function seedGeneratedScript(home: string, exports: readonly string[]): void {
  const file = mainScript(home);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `${['#!/bin/bash', MANAGED_BY, ...exports, ...execTail('statusline.sh')].join('\n')}\n`,
  );
}

// A fake installed plugin (contract 6): the repo runtime copied into the
// versioned cache dir configure's install-check and dry-run renders expect.
function installFakeRuntime(home: string): string {
  const dest = join(
    home,
    '.claude',
    'plugins',
    'cache',
    'agentic',
    'statusline-lab',
    '0.19.0',
    'runtime',
  );
  cpSync(RUNTIME_SOURCE, dest, { recursive: true });
  return dest;
}

function createHomes(): {
  readonly newHome: () => string;
  readonly dispose: () => void;
} {
  const homes: string[] = [];
  return {
    newHome(): string {
      const home = mkdtempSync(join(tmpdir(), 'statusline-configure-'));
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

const homes = createHomes();

function newInstalledHome(): string {
  const home = homes.newHome();
  installFakeRuntime(home);
  return home;
}

afterEach(() => {
  homes.dispose();
});

function assertNothingWritten(home: string): void {
  expect(existsSync(mainScript(home)), 'main script').toBe(false);
  expect(existsSync(subagentScript(home)), 'subagent script').toBe(false);
  expect(existsSync(settingsFile(home)), 'settings.json').toBe(false);
}

interface ScriptShape {
  readonly bin: 'statusline.sh' | 'subagent.sh';
  readonly exports: Readonly<Record<string, string>>;
  readonly layout: null | string;
}

// Contract 5's generated shape: shebang, the managed-by line, one
// STATUSLINE_LAB_* export per configured item plus STATUSLINE_LAB_LAYOUT,
// then the glob-newest exec tail and exit 0. Export order is unspecified by
// the contract, so the export lines are set-compared.
function expectGeneratedScript(raw: string, shape: ScriptShape): void {
  const lines = raw.split('\n');
  const wanted = Object.entries(shape.exports).map(
    ([name, value]) => `export STATUSLINE_LAB_${name}=${value}`,
  );
  if (shape.layout !== null) {
    wanted.push(`export STATUSLINE_LAB_LAYOUT='${shape.layout}'`);
  }
  expect(lines.slice(0, 2)).toEqual(['#!/bin/bash', MANAGED_BY]);
  const exportLines = lines.filter(line =>
    line.startsWith('export STATUSLINE_LAB_'),
  );
  expect([...exportLines].sort()).toEqual([...wanted].sort());
  expect(raw.endsWith(`${execTail(shape.bin).join('\n')}\n`)).toBe(true);
  expect(lines).toHaveLength(2 + wanted.length + 3 + 1);
}

function textOf(result: ConfigureResult): string {
  if (result.mode === 'written') {
    throw new Error('expected a text-carrying result');
  }
  return result.text;
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

  it('writes both scripts and both settings keys in the contract-5 shape', () => {
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

    const settings = JSON.parse(readFileSync(settingsFile(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: MAIN_COMMAND,
    });
    expect(settings.subagentStatusLine).toEqual({
      type: 'command',
      command: SUB_COMMAND,
    });

    expectGeneratedScript(readFileSync(mainScript(home), 'utf8'), {
      bin: 'statusline.sh',
      exports: {
        BAR: 'gauge',
        BRANCH: 'last',
        CACHE: 'fuse',
        CWD: 'full',
        EFFORT: 'dim',
        MODEL: 'block',
        TOKENS: 'compact',
      },
      layout,
    });
    expectGeneratedScript(readFileSync(subagentScript(home), 'utf8'), {
      bin: 'subagent.sh',
      exports: {},
      layout: null,
    });

    expect(statSync(mainScript(home)).mode & 0o111).not.toBe(0);
    expect(statSync(subagentScript(home)).mode & 0o111).not.toBe(0);
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
      home,
      fallback: 'default',
      layout: '{model effort} {bar tokens}',
      variants: { model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    const raw = readFileSync(mainScript(home), 'utf8');
    expectGeneratedScript(raw, {
      bin: 'statusline.sh',
      exports: {
        BAR: 'flat',
        EFFORT: 'plain',
        MODEL: 'block',
        TOKENS: 'full',
      },
      layout: '{model effort} {bar tokens}',
    });
    expect(raw).not.toContain('default');
  });
});

describe('configure: --fallback=existing (contracts 3 and 5)', () => {
  it('sources values from the generated script; flags override one', () => {
    const home = newInstalledHome();
    seedGeneratedScript(home, [
      'export STATUSLINE_LAB_MODEL=block',
      'export STATUSLINE_LAB_BAR=gauge',
      `export STATUSLINE_LAB_LAYOUT='{model bar}'`,
    ]);

    const result = configure({
      home,
      fallback: 'existing',
      layout: '{model bar}',
      variants: { model: 'pill' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    expectGeneratedScript(readFileSync(mainScript(home), 'utf8'), {
      bin: 'statusline.sh',
      exports: { BAR: 'gauge', MODEL: 'pill' },
      layout: '{model bar}',
    });
  });

  it('deletes exports for items the new layout drops', () => {
    const home = newInstalledHome();
    seedGeneratedScript(home, [
      'export STATUSLINE_LAB_MODEL=block',
      'export STATUSLINE_LAB_BAR=gauge',
      'export STATUSLINE_LAB_STYLE=dots',
      `export STATUSLINE_LAB_LAYOUT='{model bar} {style}'`,
    ]);

    const result = configure({
      home,
      fallback: 'existing',
      layout: '{model bar}',
      variants: { model: 'pill' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    const raw = readFileSync(mainScript(home), 'utf8');
    expectGeneratedScript(raw, {
      bin: 'statusline.sh',
      exports: { BAR: 'gauge', MODEL: 'pill' },
      layout: '{model bar}',
    });
    expect(raw).not.toContain('STATUSLINE_LAB_STYLE');
  });

  it('a layout item unresolved by base and flags fails loudly — no silent defaults', () => {
    const home = newInstalledHome();
    seedGeneratedScript(home, [
      'export STATUSLINE_LAB_BAR=gauge',
      `export STATUSLINE_LAB_LAYOUT='{bar}'`,
    ]);
    const seeded = readFileSync(mainScript(home), 'utf8');

    const attempt = () =>
      configure({ home, fallback: 'existing', layout: '{bar tokens}' });

    expect(attempt).toThrowError(/tokens/);
    expect(readFileSync(mainScript(home), 'utf8')).toBe(seeded);
    expect(existsSync(subagentScript(home))).toBe(false);
    expect(existsSync(settingsFile(home))).toBe(false);
    expect(tmpFilesUnder(home)).toEqual([]);
  });
});

describe('configure: --dry-run (contract 3)', () => {
  it('renders both surfaces and persists nothing', () => {
    const home = newInstalledHome();

    const result = configure({
      home,
      dryRun: true,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'dry-run' });
    expect(existsSync(mainScript(home))).toBe(false);
    expect(existsSync(subagentScript(home))).toBe(false);
    expect(existsSync(settingsFile(home))).toBe(false);
    // The render proof is the runtime's own tee (contract 7): spawning the
    // installed runtime under this home leaves both captures behind.
    expect(existsSync(captureFile(home, 'main'))).toBe(true);
    expect(existsSync(captureFile(home, 'tick'))).toBe(true);
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
    seedGeneratedScript(seeded, [
      'export STATUSLINE_LAB_MODEL=block',
      `export STATUSLINE_LAB_LAYOUT='{model bar}'`,
    ]);
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
    writeSettingsFile(home, seed);

    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'block' } });

    expect(attempt).toThrowError(/statusLine/);
    expect(readFileSync(settingsFile(home), 'utf8')).toBe(seed);
    expect(existsSync(mainScript(home))).toBe(false);
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
    writeSettingsFile(home, seed);

    const attempt = () =>
      configure({ home, layout: '{model}', variants: { model: 'block' } });

    expect(attempt).toThrowError(/subagentStatusLine/);
    expect(readFileSync(settingsFile(home), 'utf8')).toBe(seed);
    expect(existsSync(mainScript(home))).toBe(false);
  });

  it('--force takes over both foreign keys and preserves siblings', () => {
    const home = newInstalledHome();
    writeSettingsFile(
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
      home,
      force: true,
      layout: '{model}',
      variants: { model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    const settings = JSON.parse(readFileSync(settingsFile(home), 'utf8'));
    expect(settings.model).toBe('opus-4');
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: MAIN_COMMAND,
    });
    expect(settings.subagentStatusLine).toEqual({
      type: 'command',
      command: SUB_COMMAND,
    });
    expect(existsSync(mainScript(home))).toBe(true);
    expect(existsSync(subagentScript(home))).toBe(true);
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
  it('after configure, catalog stars follow the written exports', () => {
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
