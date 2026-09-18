import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { apply } from '../src/apply.js';
import {
  TRAMPOLINE_COMMAND,
  TRAMPOLINE_MARKER,
  createHomes,
  runTrampoline,
  settingsPath,
  snapshotTree,
  trampolinePath,
  writeCacheVersion,
  writeEchoBins,
  writeInstalledPlugins,
  writeSettings,
  writeTrampoline,
} from './fixtures.js';

// Valid JSON, deliberately ugly — mixed indent widths, a space before a
// colon, blank lines. A whole-file rewrite (plain jq output) normalizes every
// one of these; a surgical insertion leaves them byte-identical.
const ODD_SETTINGS = `{
  "model" : "opus-4",
    "spinnerTipsEnabled": false,

 "permissions": {
    "allow": [
      "Bash(git status:ro)"
    ]
 },

        "env": { }
}
`;

// Returns the one contiguous run of bytes apply inserted into `before` to
// produce `after`. Throws when anything else moved — the formatting-
// preservation contract is exactly "original bytes plus one insertion".
function insertionBetween(before: string, after: string): string {
  let prefix = 0;
  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  if (prefix + suffix !== before.length) {
    throw new Error(
      `settings.json changed beyond one insertion (${prefix + suffix} of ${before.length} original bytes kept)`,
    );
  }
  return after.slice(prefix, after.length - suffix);
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('apply', () => {
  it('writes the trampoline, adds both keys, and preserves settings.json bytes around the insertion', () => {
    const home = homes.newHome();
    writeSettings(home, ODD_SETTINGS);
    const before = snapshotTree(home);

    const result = apply({ home });

    expect(result.steps).toEqual([
      { target: 'trampoline', action: 'write' },
      { target: 'statusLine', action: 'add' },
      { target: 'subagentStatusLine', action: 'add' },
    ]);
    expect(
      Object.keys(snapshotTree(home)).filter(path => !(path in before)),
    ).toEqual(['.claude/statusline-command.sh']);

    const trampoline = readFileSync(trampolinePath(home), 'utf8');
    expect(trampoline.split('\n')[0]).toBe(TRAMPOLINE_MARKER);

    const after = readFileSync(settingsPath(home), 'utf8');
    const inserted = insertionBetween(ODD_SETTINGS, after);
    expect(inserted).toContain('"statusLine"');
    expect(inserted).toContain('"subagentStatusLine"');
    expect(inserted.length).toBeLessThan(400);
    expect(JSON.parse(after)).toEqual({
      model: 'opus-4',
      spinnerTipsEnabled: false,
      permissions: { allow: ['Bash(git status:ro)'] },
      env: {},
      statusLine: { type: 'command', command: TRAMPOLINE_COMMAND },
      subagentStatusLine: { type: 'command', command: TRAMPOLINE_COMMAND },
    });
  });

  it('is a byte-identical no-op when re-run over its own work', () => {
    const home = homes.newHome();
    writeSettings(home, ODD_SETTINGS);
    apply({ home });
    const once = snapshotTree(home);

    const again = apply({ home });

    expect(again.steps).toEqual([
      { target: 'trampoline', action: 'keep' },
      { target: 'statusLine', action: 'keep' },
      { target: 'subagentStatusLine', action: 'keep' },
    ]);
    expect(snapshotTree(home)).toEqual(once);
  });

  it('refuses a foreign statusLine key without --force and repoints it with --force', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          model: 'opus-4',
          statusLine: {
            type: 'command',
            command: '~/.claude/old-main-line.sh',
          },
        },
        null,
        2,
      )}\n`,
    );

    const refused = apply({ home });
    expect(refused.steps).toEqual([
      { target: 'trampoline', action: 'write' },
      { target: 'statusLine', action: 'refuse' },
      { target: 'subagentStatusLine', action: 'add' },
    ]);
    expect(
      JSON.parse(readFileSync(settingsPath(home), 'utf8')).statusLine,
    ).toEqual({
      type: 'command',
      command: '~/.claude/old-main-line.sh',
    });

    const forced = apply({ home, force: true });
    expect(forced.steps).toEqual([
      { target: 'trampoline', action: 'keep' },
      { target: 'statusLine', action: 'repoint' },
      { target: 'subagentStatusLine', action: 'keep' },
    ]);
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: TRAMPOLINE_COMMAND,
    });
    expect(settings.model).toBe('opus-4');
  });

  it('--force repoints both keys when both start foreign', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          model: 'opus-4',
          statusLine: {
            type: 'command',
            command: '~/.claude/old-main-line.sh',
          },
          subagentStatusLine: {
            type: 'command',
            command: '~/.claude/subagent-statusline.sh',
          },
        },
        null,
        2,
      )}\n`,
    );

    const forced = apply({ home, force: true });

    expect(forced.steps).toEqual([
      { target: 'trampoline', action: 'write' },
      { target: 'statusLine', action: 'repoint' },
      { target: 'subagentStatusLine', action: 'repoint' },
    ]);
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: TRAMPOLINE_COMMAND,
    });
    expect(settings.subagentStatusLine).toEqual({
      type: 'command',
      command: TRAMPOLINE_COMMAND,
    });
    expect(settings.model).toBe('opus-4');
  });

  it('adds no keys when it refused the foreign trampoline, and --force lands everything', () => {
    const home = homes.newHome();
    writeSettings(home, `${JSON.stringify({ model: 'opus-4' }, null, 2)}\n`);
    writeTrampoline(home, 'echo foreign-trampoline\n');
    const before = snapshotTree(home);

    const refused = apply({ home });

    // A refused trampoline must sink the whole run: no key may point at a
    // script apply declined to own.
    expect(refused.steps).toEqual([
      { target: 'trampoline', action: 'refuse' },
      { target: 'statusLine', action: 'refuse' },
      { target: 'subagentStatusLine', action: 'refuse' },
    ]);
    expect(snapshotTree(home)).toEqual(before);

    const forced = apply({ home, force: true });
    expect(forced.steps).toEqual([
      { target: 'trampoline', action: 'write' },
      { target: 'statusLine', action: 'add' },
      { target: 'subagentStatusLine', action: 'add' },
    ]);
    expect(readFileSync(trampolinePath(home), 'utf8').split('\n')[0]).toBe(
      TRAMPOLINE_MARKER,
    );
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: TRAMPOLINE_COMMAND,
    });
    expect(settings.subagentStatusLine).toEqual({
      type: 'command',
      command: TRAMPOLINE_COMMAND,
    });
  });

  describe('--force over foreign commands carrying braces', () => {
    // Both keys foreign, the statusLine command holding a brace — the member
    // spans must be found with string awareness, not a naive brace scan.
    function settingsWith(statusLineCommand: string): string {
      return `{
 "model" : "opus-4",
  "statusLine": {"type": "command", "command": ${JSON.stringify(statusLineCommand)}},
  "subagentStatusLine": {"type": "command", "command": "~/.claude/subagent-statusline.sh"}
}
`;
    }

    it.each([
      {
        name: 'a } inside the command string repoints cleanly',
        command: "sed 's/}//g' ~/.claude/line.sh",
        leftover: 'line.sh',
      },
      {
        name: 'a { inside the command string repoints cleanly',
        command: "sed 's/{//g' ~/.claude/line.sh",
        leftover: 'line.sh',
      },
      {
        name: 'an awk program repoints cleanly',
        command: "awk '{print $1}'",
        leftover: 'print',
      },
    ])('$name', ({ command, leftover }) => {
      const home = homes.newHome();
      writeSettings(home, settingsWith(command));

      const result = apply({ home, force: true });

      expect(result.steps).toEqual([
        { target: 'trampoline', action: 'write' },
        { target: 'statusLine', action: 'repoint' },
        { target: 'subagentStatusLine', action: 'repoint' },
      ]);
      const after = readFileSync(settingsPath(home), 'utf8');
      const settings = JSON.parse(after);
      expect(settings.statusLine).toEqual({
        type: 'command',
        command: TRAMPOLINE_COMMAND,
      });
      expect(settings.subagentStatusLine).toEqual({
        type: 'command',
        command: TRAMPOLINE_COMMAND,
      });
      expect(settings.model).toBe('opus-4');
      expect(after).toContain(' "model" : "opus-4",');
      expect(after).not.toContain(leftover);
      expect(readFileSync(trampolinePath(home), 'utf8').split('\n')[0]).toBe(
        TRAMPOLINE_MARKER,
      );
    });

    it('repoints the root statusLine, never a same-named member nested in env', () => {
      const home = homes.newHome();
      writeSettings(
        home,
        `{"env":{"statusLine":"legacy"},"statusLine":{"type":"command","command":"~/.claude/old-main-line.sh"},"model":"opus-4"}\n`,
      );

      const result = apply({ home, force: true });

      expect(result.steps).toEqual([
        { target: 'trampoline', action: 'write' },
        { target: 'statusLine', action: 'repoint' },
        { target: 'subagentStatusLine', action: 'add' },
      ]);
      const after = readFileSync(settingsPath(home), 'utf8');
      expect(after).toContain('"env":{"statusLine":"legacy"}');
      const settings = JSON.parse(after);
      expect(settings.env).toEqual({ statusLine: 'legacy' });
      expect(settings.statusLine).toEqual({
        type: 'command',
        command: TRAMPOLINE_COMMAND,
      });
      expect(settings.model).toBe('opus-4');
    });
  });

  it('--dry-run reports the planned actions and writes nothing', () => {
    const home = homes.newHome();
    writeSettings(home, `${JSON.stringify({ model: 'opus-4' }, null, 2)}\n`);
    const before = snapshotTree(home);

    const planned = apply({ home, dryRun: true });

    expect(planned.steps).toEqual([
      { target: 'trampoline', action: 'write' },
      { target: 'statusLine', action: 'add' },
      { target: 'subagentStatusLine', action: 'add' },
    ]);
    expect(snapshotTree(home)).toEqual(before);

    const bare = homes.newHome();
    const bareBefore = snapshotTree(bare);
    apply({ home: bare, dryRun: true });
    expect(snapshotTree(bare)).toEqual(bareBefore);
  });
});

describe('the written trampoline', () => {
  it('execs the installPath named by installed_plugins.json, forwarding args and stdin', () => {
    const home = homes.newHome();
    const installDir = writeEchoBins(
      join(home, '.claude', 'plugins', 'store', 'statusline-0.10.0'),
      'installed-0.10.0',
    );
    writeCacheVersion(home, '0.19.0');
    writeInstalledPlugins(home, {
      'statusline-lab@agentic': [{ installPath: installDir }],
    });
    apply({ home });

    const main = runTrampoline(home, [], 'main-payload');
    expect(main.status).toBe(0);
    expect(main.stdout.toString('utf8')).toBe(
      'installed-0.10.0 statusline main-payload\n',
    );

    const subagent = runTrampoline(home, ['--subagent'], 'agent-payload');
    expect(subagent.status).toBe(0);
    expect(subagent.stdout.toString('utf8')).toBe(
      'installed-0.10.0 subagent agent-payload\n',
    );
  });

  it('execs the newest cache version dir when installed_plugins.json is absent', () => {
    const home = homes.newHome();
    writeCacheVersion(home, '0.9.0');
    writeCacheVersion(home, '0.10.0');
    writeCacheVersion(home, '0.19.0');
    apply({ home });

    // 0.9.0 sorts above 0.10.0 lexicographically — only a version sort picks 0.19.0.
    const main = runTrampoline(home, [], 'tick');
    expect(main.status).toBe(0);
    expect(main.stdout.toString('utf8')).toBe('0.19.0 statusline tick\n');

    const subagent = runTrampoline(home, ['--subagent'], 'tick');
    expect(subagent.status).toBe(0);
    expect(subagent.stdout.toString('utf8')).toBe('0.19.0 subagent tick\n');
  });

  const barrenTrees: ReadonlyArray<{
    readonly name: string;
    readonly seed: (home: string) => void;
  }> = [
    {
      name: 'no plugins installed',
      seed: home => writeSettings(home, '{"model":"opus-4"}\n'),
    },
    {
      name: 'installed_plugins.json names no statusline entry',
      seed: home => {
        writeSettings(home, '{"model":"opus-4"}\n');
        writeInstalledPlugins(home, {
          'md@agentic': [{ installPath: join(home, 'md-nowhere') }],
        });
      },
    },
  ];

  it.each(barrenTrees)(
    '$name: exits 0, silent, and writes nothing',
    ({ seed }) => {
      const home = homes.newHome();
      seed(home);
      apply({ home });
      const before = snapshotTree(home);

      const run = runTrampoline(home, [], '{"columns":80,"tasks":[]}');

      expect(run.status).toBe(0);
      expect(run.stdout.length).toBe(0);
      expect(run.stderr).toBe('');
      expect(snapshotTree(home)).toEqual(before);
    },
  );

  it('stays under 25 lines and carries no nonzero exit and no file-writing redirect', () => {
    const home = homes.newHome();
    apply({ home });
    const raw = readFileSync(trampolinePath(home), 'utf8');

    const lines = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
    expect(lines.split('\n').length).toBeLessThan(25);

    expect(raw).not.toMatch(/\bexit\b(?!\s+0\b)/);

    const withoutStderrRedirects = raw
      .replaceAll('2>&1', '')
      .replaceAll('>&2', '')
      .replaceAll('2>', '')
      .replaceAll('&>', '');
    expect(withoutStderrRedirects).not.toContain('>');
  });
});
