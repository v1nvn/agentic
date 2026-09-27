import { readFileSync, rmSync, writeFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs, subcommandHelp } from '../src/cli.js';
import {
  BUNDLED_RENDERER,
  configure,
  type ConfigureOptions,
} from '../src/configure.js';
import { liveTheme } from '../src/live-theme.js';
import { ITEMS } from '../src/render/index.js';
import {
  mainKeyValue,
  panelKeyValue,
  readKeyConfig,
  renderMjsPath,
} from '../src/resolve.js';
import { nodeOnPath, rendererHash, status } from '../src/status.js';
import {
  THEMES,
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

// A compiled key — every non-default lean pick spelled as flags, the pre-t2
// shape a hand-edited key may still hold. A t2+ configure write records
// decisions (--theme plus overrides) instead, so liveTheme names no theme for
// it until t4 reads the name straight from the key.
function leanKeyFlags(): string[] {
  return ITEMS.filter(
    ({ default: def, item }) => THEMES.lean.variants[item] !== def,
  ).map(({ item }) => `--${item}=${THEMES.lean.variants[item]}`);
}

function seedMainKey(home: string, flags: readonly string[]): void {
  writeSettings(
    home,
    `${JSON.stringify(
      {
        statusLine: {
          command: mainKeyValue(null, THEMES.lean.layout, flags),
          type: 'command',
        },
      },
      null,
      2,
    )}\n`,
  );
}

describe('status: the live theme (contract 5)', () => {
  it("names the theme a compiled key equals exactly — a 'theme: lean' row right after the config row", () => {
    const home = homes.newHome();
    seedMainKey(home, leanKeyFlags());

    const result = status({ home });

    expect(themeRows(result.rows)).toEqual(['theme: lean']);
    expect(result.rows.indexOf('theme: lean')).toBe(
      result.rows.indexOf('config: no drift') + 1,
    );
  });

  it('a configure theme write and a one-swap key (--theme lean --bar gauge) name no theme yet — t4 reads the name from the key', () => {
    const themed = homes.newHome();
    configure({ home: themed, theme: 'lean' });

    const swapped = homes.newHome();
    configure({ home: swapped, theme: 'lean', variants: { bar: 'gauge' } });

    expect(themeRows(status({ home: themed }).rows)).toEqual([]);
    expect(themeRows(status({ home: swapped }).rows)).toEqual([]);
  });

  it('no key names no theme', () => {
    const home = homes.newHome();

    expect(themeRows(status({ home }).rows)).toEqual([]);
  });

  it('rides the shared matcher — the row says exactly what liveTheme says on the same key, a dropped decision included', () => {
    const exact = homes.newHome();
    seedMainKey(exact, leanKeyFlags());

    const swapped = homes.newHome();
    seedMainKey(
      swapped,
      leanKeyFlags().map(flag =>
        flag === '--bar=percent' ? '--bar=gauge' : flag,
      ),
    );

    // a hand-edited key missing one non-default decision falls back to the
    // registry default for it, so it no longer equals the theme
    const dropped = homes.newHome();
    seedMainKey(
      dropped,
      leanKeyFlags().filter(flag => flag !== '--style=dots'),
    );

    expect(liveTheme(readKeyConfig(exact))).toBe('lean');
    expect(liveTheme(readKeyConfig(swapped))).toBeUndefined();
    expect(liveTheme(readKeyConfig(dropped))).toBeUndefined();

    for (const home of [exact, swapped, dropped]) {
      const live = liveTheme(readKeyConfig(home));
      expect(themeRows(status({ home }).rows)).toEqual(
        live === undefined ? [] : [`theme: ${live}`],
      );
    }
  });
});
