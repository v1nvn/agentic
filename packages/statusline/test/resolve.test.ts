import { afterEach, describe, expect, it } from 'vitest';

import {
  isOurMainCommand,
  isOurPanelCommand,
  mainKeyValue,
  panelKeyValue,
  readKeyConfig,
} from '../src/resolve.js';
import { createHomes, writeSettings } from './fixtures.js';

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('readKeyConfig (contract 2)', () => {
  it('an absent or unparseable settings.json reads as no config', () => {
    const home = homes.newHome();
    expect(readKeyConfig(home)).toEqual({ layout: null, values: {} });
    writeSettings(home, '{not json\n');
    expect(readKeyConfig(home)).toEqual({ layout: null, values: {} });
  });

  it('a foreign or absent main key reads as no config', () => {
    const home = homes.newHome();
    writeSettings(home, '{"statusLine":{"type":"command","command":"~/old.sh"}}\n');
    expect(readKeyConfig(home)).toEqual({ layout: null, values: {} });
    writeSettings(home, '{"model":"opus-4"}\n');
    expect(readKeyConfig(home)).toEqual({ layout: null, values: {} });
  });

  it('an ours key reads back its quoted layout and item flags', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue(null, '{model effort}', [
              '--model=block',
              '--effort=dim',
            ]),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(readKeyConfig(home)).toEqual({
      layout: '{model effort}',
      values: { effort: 'dim', model: 'block' },
    });
  });

  it('an ours key without --layout reads as no explicit layout, its flags parsed', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue(null, null, ['--bar=gauge']),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(readKeyConfig(home)).toEqual({
      layout: null,
      values: { bar: 'gauge' },
    });
  });

  it('a theme flag parses as the theme, never as a value; a custom layout beside it parses too', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue('quiet', '{model}', ['--cwd=tail']),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(readKeyConfig(home)).toEqual({
      layout: '{model}',
      theme: 'quiet',
      values: { cwd: 'tail' },
    });
  });

  it('unknown item names survive the parse to surface as drift', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue(null, '{model}', [
              '--model=neon',
              '--flux=pulse',
            ]),
            type: 'command',
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(readKeyConfig(home).values).toEqual({
      flux: 'pulse',
      model: 'neon',
    });
  });
});

describe('the ours predicate (contract 1)', () => {
  it('matches the program prefix plus the ||-true suffix with any flag middle', () => {
    expect(
      isOurMainCommand(mainKeyValue(null, '{model}', ['--model=block'])),
    ).toBe(true);
    expect(
      isOurMainCommand(
        mainKeyValue(null, '{cwd branch}', ['--cwd=full', '--branch=last']),
      ),
    ).toBe(true);
    expect(isOurMainCommand(mainKeyValue(null, null, []))).toBe(true);
    expect(isOurMainCommand(mainKeyValue('lean', null, []))).toBe(true);
  });

  it('rejects foreign commands, the panel key, and anything but flags after the program', () => {
    expect(isOurMainCommand(panelKeyValue(null, []))).toBe(false);
    expect(isOurMainCommand('./old-main.sh')).toBe(false);
    expect(
      isOurMainCommand(
        `FOO=1 ${mainKeyValue(null, '{model}', ['--model=block'])}`,
      ),
    ).toBe(false);
  });

  it('the panel matcher claims only the panel key', () => {
    expect(isOurPanelCommand(panelKeyValue(null, []))).toBe(true);
    expect(isOurPanelCommand(panelKeyValue(null, ['--style=bare']))).toBe(true);
    expect(isOurPanelCommand(panelKeyValue('lean', []))).toBe(true);
    expect(isOurPanelCommand(mainKeyValue(null, null, []))).toBe(false);
    expect(isOurPanelCommand('node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" panel')).toBe(
      false,
    );
  });
});
