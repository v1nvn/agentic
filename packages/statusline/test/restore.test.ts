import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { DATA_DIR } from '../src/render/capture.js';
import { restore } from '../src/restore.js';
import {
  backupPath,
  capturePath,
  mainKeyValue,
  panelKeyValue,
  renderMjsPath,
} from '../src/resolve.js';
import {
  createHomes,
  settingsCommand,
  settingsPath,
  tmpFilesUnder,
  writeSettings,
} from './fixtures.js';

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

function takeover(home: string): void {
  configure({ force: true, home, layout: '{model}', variants: { model: 'block' } });
}

describe('restore: flagship roundtrip (contract 4)', () => {
  it('seed foreign keys → configure --force → restore → settings.json bytes are the seed bytes', () => {
    const home = homes.newHome();
    const seed = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "echo \\"hi\\" && ./old-main.sh" },
  "subagentStatusLine": { "type": "command", "command": "./old-sub.sh" }
}
`;
    writeSettings(home, seed);

    takeover(home);
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(null, '{model}', ['--model=block']),
    );

    expect(restore({ home })).toMatchObject({ mode: 'restored' });
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });
});

describe('restore: first-takeover-wins backup (contract 4)', () => {
  it('a foreign repoint saves the raw member text once; an ours→ours reconfigure leaves the backup bytes untouched', () => {
    const home = homes.newHome();
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
    const home = homes.newHome();

    configure({ home, layout: '{model}', variants: { model: 'block' } });
    expect(JSON.parse(readFileSync(backupPath(home), 'utf8'))).toEqual({
      createdFile: true,
      keys: {},
    });

    expect(restore({ home })).toEqual({
      mode: 'restored',
      text: 'restored — settings.json is gone, exactly as before the lab',
    });
    expect(existsSync(settingsPath(home))).toBe(false);
  });

  it('keeps the lab-created file when a sibling member exists — ours removed, sibling intact', () => {
    const home = homes.newHome();
    configure({ home, layout: '{model}', variants: { model: 'block' } });
    writeSettings(
      home,
      `{
  "model": "opus-4",
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, '{model}', ['--model=block']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
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
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    const edited = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "./newer.sh" },
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
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

describe('restore: --dry-run (contract 4)', () => {
  it('prints a plan and writes nothing — settings, backup, and captures intact', () => {
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    const settingsBefore = readFileSync(settingsPath(home), 'utf8');
    const backupBefore = readFileSync(backupPath(home), 'utf8');
    mkdirSync(join(home, DATA_DIR, 'captures'), { recursive: true });
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
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    mkdirSync(join(home, DATA_DIR, 'captures'), { recursive: true });
    writeFileSync(capturePath(home, 'main'), '{}\n');
    writeFileSync(capturePath(home, 'tick'), '{}\n');

    expect(restore({ home })).toMatchObject({ mode: 'restored' });

    expect(readFileSync(settingsPath(home), 'utf8')).toBe(TAKEOVER_SEED);
    expect(existsSync(join(home, DATA_DIR, 'captures'))).toBe(false);
    expect(existsSync(backupPath(home))).toBe(false);
    expect(existsSync(join(home, DATA_DIR))).toBe(false);

    const again = restore({ home });
    expect(again).toMatchObject({ mode: 'nothing' });
    expect(again.text ?? '').toMatch(/nothing to restore/);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(TAKEOVER_SEED);
  });

  it('keeps the data dir when a host file lives in it', () => {
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    writeFileSync(join(home, DATA_DIR, 'host.txt'), 'host data\n');

    expect(restore({ home })).toMatchObject({ mode: 'restored' });

    expect(readFileSync(join(home, DATA_DIR, 'host.txt'), 'utf8')).toBe(
      'host data\n',
    );
    expect(existsSync(join(home, DATA_DIR))).toBe(true);
  });

  it('keys absent before the lab are removed by recognizing ours — no backup entry', () => {
    const home = homes.newHome();
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

describe('restore: renderer cleanup (contract 4)', () => {
  it('deletes the synced render.mjs by explicit path — a host file beside it survives', () => {
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);
    const synced = renderMjsPath(home);
    expect(existsSync(synced), 'configure synced render.mjs').toBe(true);
    writeFileSync(join(home, DATA_DIR, 'host.txt'), 'host data\n');

    expect(restore({ home })).toMatchObject({ mode: 'restored' });

    expect(existsSync(synced)).toBe(false);
    expect(readFileSync(join(home, DATA_DIR, 'host.txt'), 'utf8')).toBe(
      'host data\n',
    );
  });

  it('a lone render.mjs is lab data — cleaned even with no keys, backup, or captures', () => {
    const home = homes.newHome();
    mkdirSync(join(home, DATA_DIR), { recursive: true });
    writeFileSync(renderMjsPath(home), '// renderer\n');

    expect(restore({ home })).toEqual({
      mode: 'restored',
      text: 'lab data cleaned — no lab keys in settings.json',
    });
    expect(existsSync(join(home, DATA_DIR))).toBe(false);
  });

  it('the dry-run plan names render.mjs and leaves it in place', () => {
    const home = homes.newHome();
    writeSettings(home, TAKEOVER_SEED);
    takeover(home);

    const result = restore({ dryRun: true, home });

    expect(result.mode).toBe('dry-run');
    expect(result.text ?? '').toContain('delete render.mjs');
    expect(existsSync(renderMjsPath(home))).toBe(true);
  });
});
