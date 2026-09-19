import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import {
  DATA_REL,
  createHomes,
  installRuntime,
  settingsPath,
  writeSettings,
} from './fixtures.js';

const MAIN_COMMAND = `~/${join(DATA_REL, 'statusline-command.sh')}`;
const SUB_COMMAND = `~/${join(DATA_REL, 'subagent-statusline.sh')}`;

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

// Returns the one contiguous run of bytes configure inserted into `before`
// to produce `after`. Throws when anything else moved — the formatting-
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

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

function configureModel(home: string, force = false): void {
  configure({ force, home, layout: '{model}', variants: { model: 'block' } });
}

describe('configure: the settings splice preserves owner bytes', () => {
  it('adds both keys as one insertion, leaving every other byte alone', () => {
    const home = newInstalledHome();
    writeSettings(home, ODD_SETTINGS);

    configureModel(home);

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
      statusLine: { command: MAIN_COMMAND, type: 'command' },
      subagentStatusLine: { command: SUB_COMMAND, type: 'command' },
    });
  });

  it('re-running over its own work leaves settings.json byte-identical', () => {
    const home = newInstalledHome();
    writeSettings(home, ODD_SETTINGS);
    configureModel(home);
    const once = readFileSync(settingsPath(home), 'utf8');

    configureModel(home);

    expect(readFileSync(settingsPath(home), 'utf8')).toBe(once);
  });
});

describe('configure: --force over foreign commands carrying braces', () => {
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
    },
    {
      name: 'a { inside the command string repoints cleanly',
      command: "sed 's/{//g' ~/.claude/line.sh",
    },
    {
      name: 'an awk program repoints cleanly',
      command: "awk '{print $1}'",
    },
  ])('$name', ({ command }) => {
    const home = newInstalledHome();
    writeSettings(home, settingsWith(command));

    configureModel(home, true);

    const after = readFileSync(settingsPath(home), 'utf8');
    const settings = JSON.parse(after);
    expect(settings.statusLine).toEqual({
      command: MAIN_COMMAND,
      type: 'command',
    });
    expect(settings.subagentStatusLine).toEqual({
      command: SUB_COMMAND,
      type: 'command',
    });
    expect(settings.model).toBe('opus-4');
    expect(after).toContain(' "model" : "opus-4",');
    expect(after).not.toContain(command);
  });

  it('repoints the root statusLine, never a same-named member nested in env', () => {
    const home = newInstalledHome();
    writeSettings(
      home,
      `{"env":{"statusLine":"legacy"},"statusLine":{"type":"command","command":"~/.claude/old-main-line.sh"},"model":"opus-4"}\n`,
    );

    configureModel(home, true);

    const after = readFileSync(settingsPath(home), 'utf8');
    expect(after).toContain('"env":{"statusLine":"legacy"}');
    const settings = JSON.parse(after);
    expect(settings.env).toEqual({ statusLine: 'legacy' });
    expect(settings.statusLine).toEqual({
      command: MAIN_COMMAND,
      type: 'command',
    });
    expect(settings.model).toBe('opus-4');
  });
});
