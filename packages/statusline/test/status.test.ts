import { readFileSync, rmSync, writeFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs, subcommandHelp } from '../src/cli.js';
import {
  BUNDLED_RENDERER,
  configure,
  type ConfigureOptions,
} from '../src/configure.js';
import {
  mainKeyValue,
  panelKeyValue,
  renderMjsPath,
} from '../src/resolve.js';
import { nodeOnPath, rendererHash, status } from '../src/status.js';
import {
  backupPath,
  createHomes,
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

const NODE_ROW = `node: on PATH (${nodeOnPath(process.env.PATH ?? '')})`;

function rendererCurrent(): string {
  return `renderer: current — ${rendererHash(readFileSync(BUNDLED_RENDERER))}`;
}

const RENDERER_MISSING =
  'renderer: missing — fix: rerun configure --force --theme classic';

afterEach(() => {
  homes.dispose();
});

describe('status: healthy home (contract 5)', () => {
  it('prints every row — both ours keys with the decoded config, no drift, the backup summary, capture ages — and signals healthy', () => {
    const home = homes.newHome();
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
      NODE_ROW,
      rendererCurrent(),
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
  it('names the unknown layout item and the unoffered variant by id, the fix naming a fresh default layout, and signals unhealthy', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, '{model flux}', ['--model=neon', '--flux=pulse']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    const result = status({ home });

    expect(result.healthy).toBe(false);
    expect(result.rows).toEqual([
      NODE_ROW,
      RENDERER_MISSING,
      "statusLine: ours — layout='{model flux}' model=neon flux=pulse",
      'subagentStatusLine: ours',
      "config: drift — unknown variant 'neon' for 'model', unknown item 'flux' — fix: rerun configure --theme classic",
      'backup: absent',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: variants-only drift (contract 5)', () => {
  it('keeps the layout in the fix line — only the variants reset, so no --layout is named', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, '{model effort}', ['--model=neon', '--effort=dim']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    const result = status({ home });

    expect(result.healthy).toBe(false);
    expect(result.rows).toEqual([
      NODE_ROW,
      RENDERER_MISSING,
      "statusLine: ours — layout='{model effort}' model=neon effort=dim",
      'subagentStatusLine: ours',
      "config: drift — unknown variant 'neon' for 'model' — fix: rerun configure --theme classic",
      'backup: absent',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: layout-less drift (t2)', () => {
  it('a layout-less ours key still flags unknown variants and shows its decisions', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, null, ['--model=zzz']), type: 'command' })}
}
`,
    );

    const result = status({ home });

    expect(result.rows).toContain('statusLine: ours — model=zzz');
    expect(result.rows).toContain(
      "config: drift — unknown variant 'zzz' for 'model' — fix: rerun configure --theme classic",
    );
    expect(result.healthy).toBe(false);
  });
});

describe('status: foreign and absent keys (contract 5)', () => {
  it('classifies the foreign key with its command and the absent key, each row naming its fix, and signals unhealthy', () => {
    const home = homes.newHome();
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
      NODE_ROW,
      RENDERER_MISSING,
      'statusLine: foreign (./old-main.sh) — fix: rerun configure --force --theme classic',
      'subagentStatusLine: absent — fix: rerun configure --theme classic',
      'backup: absent',
      'captures: main absent, tick absent',
      'unhealthy',
    ]);
  });
});

describe('status: unreadable backup (contract 5)', () => {
  it('survives a backup.json that is valid JSON but not a lab backup — one row naming the file to delete, verdict untouched', () => {
    const home = homes.newHome();
    configure({
      force: true,
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });
    writeFileSync(backupPath(home), '{"note": "not a lab backup"}\n');

    const result = status({ home });

    expect(result.healthy).toBe(true);
    expect(result.rows).toEqual([
      NODE_ROW,
      rendererCurrent(),
      "statusLine: ours — layout='{model effort}' model=block effort=dim",
      'subagentStatusLine: ours',
      'config: no drift',
      'backup: unreadable — fix: delete ~/.claude/plugins/data/statusline-agentic/backup.json',
      'captures: main absent, tick absent',
      'healthy',
    ]);
  });
});

describe('status: node and renderer rows (contract 5)', () => {
  it('node and renderer rows lead', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });

    const result = status({ home });

    expect(result.rows[0]).toBe(NODE_ROW);
    expect(result.rows[1]).toBe(rendererCurrent());
    expect(result.healthy).toBe(true);
  });

  it('node off PATH names the install fix and signals unhealthy', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });

    const result = status({ home, path: `${home}/empty-bin` });

    expect(result.rows).toContain(
      'node: missing — fix: install node ≥ 18 from nodejs.org, then restart Claude Code',
    );
    expect(result.healthy).toBe(false);
  });

  it('a stale synced renderer names both hashes; the configure fix restores healthy', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    const stale = Buffer.from('// stale renderer\n');
    writeFileSync(renderMjsPath(home), stale);

    const result = status({ home });

    expect(result.rows).toContain(
      `renderer: stale — data ${rendererHash(stale)}, this CLI ${rendererHash(readFileSync(BUNDLED_RENDERER))} — fix: rerun configure --force --theme classic`,
    );
    expect(result.healthy).toBe(false);

    runFixCommand('rerun configure --force --theme classic', home);
    expect(status({ home }).healthy).toBe(true);
  });

  it('a missing synced renderer names the configure fix', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    rmSync(renderMjsPath(home));

    const result = status({ home });

    expect(result.rows).toContain(RENDERER_MISSING);
    expect(result.healthy).toBe(false);
  });
});

describe('status: fix lines run (contract 5 seam)', () => {
  it('every rerun-configure fix row, followed on its home, completes and restores healthy', () => {
    const absentHome = homes.newHome();
    writeSettings(
      absentHome,
      `{
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    const foreignHome = homes.newHome();
    writeSettings(
      foreignHome,
      `{
  "statusLine": { "type": "command", "command": "./old-main.sh" },
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    const variantDriftHome = homes.newHome();
    writeSettings(
      variantDriftHome,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, '{model effort}', ['--model=neon', '--effort=dim']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    const itemDriftHome = homes.newHome();
    writeSettings(
      itemDriftHome,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue(null, '{model flux}', ['--model=neon', '--flux=pulse']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue(null, []), type: 'command' })}
}
`,
    );

    for (const home of [absentHome, foreignHome, variantDriftHome, itemDriftHome]) {
      const fixRows = status({ home }).rows.filter(row =>
        row.includes(' — fix: rerun configure '),
      );
      expect(fixRows.length).toBeGreaterThan(0);
      for (const row of fixRows) {
        const fix = row.split(' — fix: ')[1];
        if (fix === undefined) {
          throw new Error(`row names no fix: ${row}`);
        }
        runFixCommand(fix, home);
      }
      expect(status({ home }).healthy).toBe(true);
    }
  });
});

function runFixCommand(fix: string, home: string): void {
  const flags = fix.slice('rerun configure '.length).split(' ');
  for (const flag of flags) {
    if (flag !== '--force' && flag !== '--theme' && flag !== 'classic') {
      throw new Error(`fix flag not mapped onto configure: ${flag}`);
    }
  }
  const options: ConfigureOptions = {
    force: flags.includes('--force') ? true : undefined,
    home,
    theme: flags.includes('--theme') ? 'classic' : undefined,
  };
  configure(options);
}

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

function themeRows(rows: readonly string[]): readonly string[] {
  return rows.filter(row => row.startsWith('theme:'));
}

describe('status: the theme row (t4)', () => {
  it('prints the name straight from a configure theme key, right after the config row', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });

    const result = status({ home });

    expect(result.healthy).toBe(true);
    expect(themeRows(result.rows)).toEqual(['theme: lean']);
    expect(result.rows.indexOf('theme: lean')).toBe(
      result.rows.indexOf('config: no drift') + 1,
    );
  });

  it('appends the key’s swaps after the name, in the key’s flag order', () => {
    const one = homes.newHome();
    configure({ home: one, theme: 'lean', variants: { bar: 'gauge' } });

    const two = homes.newHome();
    configure({
      home: two,
      theme: 'lean',
      variants: { bar: 'gauge', model: 'block' },
    });

    expect(themeRows(status({ home: one }).rows)).toEqual([
      'theme: lean +bar=gauge',
    ]);
    expect(themeRows(status({ home: two }).rows)).toEqual([
      'theme: lean +model=block +bar=gauge',
    ]);
  });

  it('a drifted swap still prints the row — the name is the truth, the drift row names the fix', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue('lean', null, ['--bar=wat']), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue('lean', []), type: 'command' })}
}
`,
    );

    const result = status({ home });

    expect(themeRows(result.rows)).toEqual(['theme: lean +bar=wat']);
    expect(result.rows).toContain(
      "config: drift — unknown variant 'wat' for 'bar' — fix: rerun configure --theme classic",
    );
  });

  it('a themeless key prints no theme row', () => {
    const home = homes.newHome();
    configure({ home, layout: '{model effort}', variants: { effort: 'dim' } });

    expect(themeRows(status({ home }).rows)).toEqual([]);
  });
});

describe('status: the panel row carries its theme (t4)', () => {
  it('a theme write names the theme on the panel row, a style swap beside it', () => {
    const themed = homes.newHome();
    configure({ home: themed, theme: 'lean' });

    const swapped = homes.newHome();
    configure({ home: swapped, theme: 'lean', variants: { style: 'bare' } });

    expect(status({ home: themed }).rows).toContain(
      'subagentStatusLine: ours — theme=lean',
    );
    expect(status({ home: swapped }).rows).toContain(
      'subagentStatusLine: ours — theme=lean style=bare',
    );
  });

  it('a themeless panel key shows its style pick alone', () => {
    const home = homes.newHome();
    configure({ home, layout: '{model}', variants: { style: 'dots' } });

    expect(status({ home }).rows).toContain(
      'subagentStatusLine: ours — style=dots',
    );
  });

  it('a hand-seeded themed key names its theme on both rows', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `{
  "statusLine": ${JSON.stringify({ command: mainKeyValue('quiet', null, []), type: 'command' })},
  "subagentStatusLine": ${JSON.stringify({ command: panelKeyValue('quiet', []), type: 'command' })}
}
`,
    );

    const rows = status({ home }).rows;

    expect(themeRows(rows)).toEqual(['theme: quiet']);
    expect(rows).toContain('subagentStatusLine: ours — theme=quiet');
  });
});
