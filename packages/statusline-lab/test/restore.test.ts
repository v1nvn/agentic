import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { restore } from '../src/restore.js';
import {
  DATA_REL,
  backupPath,
  createHomes,
  installRuntime,
  mainKeyValue,
  settingsCommand,
  settingsPath,
  subagentKeyValue,
  writeSettings,
} from './fixtures.js';
import { capturePath, tmpFilesUnder } from './plugin-runtime.js';

const TAKEOVER_SEED = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "./old-main.sh" }
}
`;

const OLD_MAIN_MEMBER = '{ "type": "command", "command": "./old-main.sh" }';

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

function takeover(home: string): void {
  configure({ force: true, home, layout: '{model}', variants: { model: 'block' } });
}

describe('restore: flagship roundtrip (contract 4)', () => {
  it('seed foreign keys → configure --force → restore → settings.json bytes are the seed bytes', () => {
    const home = newInstalledHome();
    const seed = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "echo \\"hi\\" && ./old-main.sh" },
  "subagentStatusLine": { "type": "command", "command": "./old-sub.sh" }
}
`;
    writeSettings(home, seed);

    takeover(home);
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=block']),
    );

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });
});

describe('restore: first-takeover-wins backup (contract 4)', () => {
  it('a foreign repoint saves the raw member text once; an ours→ours reconfigure leaves the backup bytes untouched', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);

    takeover(home);
    const backupBytes = readFileSync(backupPath(home), 'utf8');
    expect(JSON.parse(backupBytes)).toEqual({
      createdFile: false,
      keys: { statusLine: OLD_MAIN_MEMBER },
    });
    expect(tmpFilesUnder(home)).toEqual([]);

    configure({ home, layout: '{model}', variants: { model: 'pill' } });

    expect(readFileSync(backupPath(home), 'utf8')).toBe(backupBytes);
  });
});

describe('restore: createdFile endgame (contract 4)', () => {
  it('a settings.json the lab created holding only our members is deleted by restore', () => {
    const home = newInstalledHome();

    configure({ home, layout: '{model}', variants: { model: 'block' } });
    expect(JSON.parse(readFileSync(backupPath(home), 'utf8'))).toEqual({
      createdFile: true,
      keys: {},
    });

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(existsSync(settingsPath(home))).toBe(false);
  });

  it('keeps the lab-created file when a sibling member exists — ours removed, sibling intact', () => {
    const home = newInstalledHome();
    configure({ home, layout: '{model}', variants: { model: 'block' } });
    writeSettings(
      home,
      `{
  "model": "opus-4",
  "statusLine": ${JSON.stringify({ command: mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=block']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: subagentKeyValue, type: 'command' })}
}
`,
    );

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(JSON.parse(readFileSync(settingsPath(home), 'utf8'))).toEqual({
      model: 'opus-4',
    });
  });
});

describe('restore: refusal on a foreign current value (contract 4)', () => {
  it('a value differing from the saved text refuses naming --force and touches nothing; --force splices the saved text back', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    const edited = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "./newer.sh" },
  "subagentStatusLine": ${JSON.stringify({ command: subagentKeyValue, type: 'command' })}
}
`;
    writeSettings(home, edited);

    expect(() => restore({ home })).toThrowError(/--force/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(edited);
    expect(existsSync(backupPath(home))).toBe(true);

    expect(restore({ force: true, home })).toMatchObject({ mode: 'restored' });
    const raw = readFileSync(settingsPath(home), 'utf8');
    expect(raw).toContain(OLD_MAIN_MEMBER);
    expect(JSON.parse(raw)).toEqual({
      model: 'opus-4',
      statusLine: { type: 'command', command: './old-main.sh' },
    });
  });
});

describe('restore: no runtime resolution (contract 4)', () => {
  it('restore works with the plugin cache dir entirely absent', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    rmSync(join(home, '.claude', 'plugins', 'cache'), {
      force: true,
      recursive: true,
    });

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(TAKEOVER_SEED);
  });
});

describe('restore: --dry-run (contract 4)', () => {
  it('prints a plan and writes nothing — settings, backup, and captures intact', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    const settingsBefore = readFileSync(settingsPath(home), 'utf8');
    const backupBefore = readFileSync(backupPath(home), 'utf8');
    mkdirSync(join(home, DATA_REL, 'captures'), { recursive: true });
    writeFileSync(capturePath(home, 'main'), '{"kept":true}\n');

    const result = restore({ dryRun: true, home });

    expect(result.mode).toBe('dry-run');
    expect(result.text ?? '').not.toBe('');
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(settingsBefore);
    expect(readFileSync(backupPath(home), 'utf8')).toBe(backupBefore);
    expect(readFileSync(capturePath(home, 'main'), 'utf8')).toBe(
      '{"kept":true}\n',
    );
  });
});

describe('restore: cleanup endgame (contract 4)', () => {
  it('deletes captures/ and backup.json, rmdirs the empty data dir, reverts the bytes exactly, and is idempotent', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    mkdirSync(join(home, DATA_REL, 'captures'), { recursive: true });
    writeFileSync(capturePath(home, 'main'), '{}\n');
    writeFileSync(capturePath(home, 'tick'), '{}\n');

    expect(restore({ home })).toMatchObject({ mode: 'restored' });

    expect(readFileSync(settingsPath(home), 'utf8')).toBe(TAKEOVER_SEED);
    expect(existsSync(join(home, DATA_REL, 'captures'))).toBe(false);
    expect(existsSync(backupPath(home))).toBe(false);
    expect(existsSync(join(home, DATA_REL))).toBe(false);

    const again = restore({ home });
    expect(again).toMatchObject({ mode: 'nothing' });
    expect(again.text ?? '').toMatch(/nothing to restore/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(TAKEOVER_SEED);
  });

  it('keeps the data dir when a host file lives in it', () => {
    const home = newInstalledHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    writeFileSync(join(home, DATA_REL, 'host.txt'), 'host data\n');

    expect(restore({ home })).toMatchObject({ mode: 'restored' });

    expect(readFileSync(join(home, DATA_REL, 'host.txt'), 'utf8')).toBe(
      'host data\n',
    );
    expect(existsSync(join(home, DATA_REL))).toBe(true);
  });

  it('keys absent before the lab are removed by recognizing ours — no backup entry', () => {
    const home = newInstalledHome();
    const seed = `{
  "model": "opus-4"
}
`;
    writeSettings(home, seed);

    configure({ home, layout: '{model}', variants: { model: 'block' } });
    expect(JSON.parse(readFileSync(backupPath(home), 'utf8'))).toEqual({
      createdFile: false,
      keys: {},
    });

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });
});
