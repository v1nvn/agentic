import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  isOurMainCommand,
  mainKeyValue,
  readKeyConfig,
  resolveRuntime,
  subagentKeyValue,
} from '../src/resolve.js';
import {
  RUNTIME_SOURCE,
  createHomes,
  installRuntime,
  writeSettings,
} from './fixtures.js';

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('resolveRuntime', () => {
  it('resolves the newest cache version, version-sorted not lexicographic', () => {
    const home = homes.newHome();
    installRuntime(home, '0.9.0');
    installRuntime(home, '0.10.0');
    const newest = installRuntime(home, '0.19.0');

    // 0.9.0 wins lexicographically; only a version sort picks 0.19.0.
    expect(resolveRuntime({ home }).dir).toBe(newest);
  });

  it('throws the install hint when no cache version exists', () => {
    const home = homes.newHome();
    writeSettings(home, '{"model":"opus-4"}\n');

    expect(() => resolveRuntime({ home })).toThrowError(/install/);
    expect(() => resolveRuntime({ home })).toThrowError(/statusline-lab/);
  });

  it('reads the menu and default layout off the resolved runtime', () => {
    const home = homes.newHome();
    installRuntime(home);

    const runtime = resolveRuntime({ home });
    const comps = /^COMPS="(.+)"$/m.exec(
      readFileSync(join(RUNTIME_SOURCE, 'statusline.sh'), 'utf8'),
    )?.[1];
    const layout = /^export DEFAULT_LAYOUT='(.*)'$/m.exec(
      readFileSync(join(RUNTIME_SOURCE, 'lib.sh'), 'utf8'),
    )?.[1];
    expect(comps).toBeDefined();
    expect(layout).toBeDefined();

    expect(runtime.items.map(item => item.item)).toEqual(comps?.split(' '));
    expect(
      runtime.items.find(item => item.item === 'model')?.alternatives,
    ).toEqual(['plain', 'block', 'pill', 'zen']);
    expect(runtime.defaultLayout).toBe(layout);
  });
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

  it('an ours key reads back its layout and assignments', () => {
    const home = homes.newHome();
    writeSettings(
      home,
      `${JSON.stringify(
        {
          statusLine: {
            command: mainKeyValue('{model effort}', [
              'STATUSLINE_LAB_MODEL=block',
              'STATUSLINE_LAB_EFFORT=dim',
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
});

describe('the ours predicate (contract 1)', () => {
  it('matches the resolver prefix plus statusline suffix with any middle', () => {
    expect(
      isOurMainCommand(
        mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=block']),
      ),
    ).toBe(true);
    expect(
      isOurMainCommand(
        mainKeyValue('{cwd branch}', [
          'STATUSLINE_LAB_CWD=full',
          'STATUSLINE_LAB_BRANCH=last',
        ]),
      ),
    ).toBe(true);
  });

  it('rejects foreign commands, the subagent key, and a prefixed d= statement', () => {
    expect(isOurMainCommand(subagentKeyValue)).toBe(false);
    expect(isOurMainCommand('./old-main.sh')).toBe(false);
    expect(
      isOurMainCommand(
        `FOO=1 ${mainKeyValue('{model}', ['STATUSLINE_LAB_MODEL=block'])}`,
      ),
    ).toBe(false);
  });
});
