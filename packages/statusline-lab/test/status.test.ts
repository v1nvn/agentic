import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs, subcommandHelp } from '../src/cli.js';
import { configure } from '../src/configure.js';
import { status } from '../src/status.js';
import {
  createHomes,
  installRuntime,
  mainKeyValue,
  subagentKeyValue,
  writeCapture,
  writeSettings,
} from './fixtures.js';

const BOTH_FOREIGN_SEED = `{
  "model": "opus-4",
  "statusLine": { "type": "command", "command": "./old-main.sh" },
  "subagentStatusLine": { "type": "command", "command": "./old-sub.sh" }
}
`;

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

describe('status: healthy home (contract 5)', () => {
  it('prints every row — newest runtime version and item count, both ours keys with the decoded config, no drift, the backup summary, capture ages — and signals healthy', () => {
    const home = homes.newHome();
    installRuntime(home, '0.18.0');
    installRuntime(home);
    writeSettings(home, BOTH_FOREIGN_SEED);
    configure({
      force: true,
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });
    writeCapture(home, 'main', 2 * 60 * 60 * 1000);

    const result = status({ home });

    expect(result.healthy).toBe(true);
    expect(result.rows).toEqual([
      'runtime: 0.19.0 — 16 items',
      "statusLine: ours — layout='{model effort}' model=block effort=dim",
      'subagentStatusLine: ours',
      'config: no drift',
      'backup: present — saved statusLine, subagentStatusLine',
      'captures: main 2h ago, tick absent',
      'healthy',
    ]);
  });
});

describe('status: config drift (contract 5)', () => {
  it('names the unknown layout item and the unoffered variant by id with the reconfigure fix, and signals unhealthy', () => {
    const home = newInstalledHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue('{model flux}', ['STATUSLINE_LAB_MODEL=neon', 'STATUSLINE_LAB_FLUX=pulse']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: subagentKeyValue, type: 'command' })}
}
`,
    );

    const result = status({ home });

    expect(result.healthy).toBe(false);
    expect(result.rows).toEqual([
      'runtime: 0.19.0 — 16 items',
      "statusLine: ours — layout='{model flux}' model=neon flux=pulse",
      'subagentStatusLine: ours',
      "config: drift — unknown variant 'neon' for 'model', unknown item 'flux' — fix: rerun configure --fallback=existing",
      'backup: absent',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: foreign and absent keys (contract 5)', () => {
  it('classifies the foreign key with its command and the absent key, each row naming its fix, and signals unhealthy', () => {
    const home = newInstalledHome();
    writeSettings(
      home,
      `{
  "statusLine": { "type": "command", "command": "./old-main.sh" }
}
`,
    );

    const result = status({ home });

    expect(result.healthy).toBe(false);
    expect(result.rows).toEqual([
      'runtime: 0.19.0 — 16 items',
      'statusLine: foreign (./old-main.sh) — fix: rerun configure --force',
      'subagentStatusLine: absent — fix: rerun configure --fallback=existing',
      'backup: absent',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: no runtime (contract 5)', () => {
  it('prints the partial rows — keys and backup — names the install fix on the runtime row, and signals unhealthy', () => {
    const home = homes.newHome();
    installRuntime(home);
    configure({ home, layout: '{model}', variants: { model: 'block' } });
    rmSync(join(home, '.claude', 'plugins', 'cache'), {
      force: true,
      recursive: true,
    });

    const result = status({ home });

    expect(result.healthy).toBe(false);
    expect(result.rows).toEqual([
      'runtime: missing — fix: claude plugin install statusline-lab@agentic',
      "statusLine: ours — layout='{model}' model=block",
      'subagentStatusLine: ours',
      'backup: present — created settings.json, saved nothing',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: CLI surface (contract 5)', () => {
  it('registers status with --home and routes to it, rejecting strays', () => {
    expect(parseArgs(['status'])).toEqual({
      version: false,
      command: 'status',
    });
    expect(parseArgs(['status', '--home', '/tmp/lab-home'])).toEqual({
      version: false,
      command: 'status',
      home: '/tmp/lab-home',
    });
    expect(parseArgs(['status', '-h'])).toEqual({
      version: false,
      help: 'status',
    });
    expect(parseArgs(['status', 'stray'])).toBeUndefined();
    expect(parseArgs(['status', '--bogus'])).toBeUndefined();
  });

  it('names the status flags in its help', () => {
    expect(subcommandHelp('status')).toContain('--home');
  });
});
