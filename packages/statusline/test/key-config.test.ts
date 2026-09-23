import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { readKeyConfig, resolveRuntime } from '../src/resolve.js';
import {
  createHomes,
  installRuntime,
  mainKeyValue,
  settingsCommand,
  settingsPath,
  subagentKeyValue,
} from './fixtures.js';

// Ruling 1's canonical bytes, typed in full — the golden the writer is pinned
// against. Resolver staged into d= first; env assignments hug bash last.
const GOLDEN_MAIN = `d=$(printf '%s\\n' ~/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1); STATUSLINE_LAB_LAYOUT='{model effort}' STATUSLINE_LAB_MODEL=block STATUSLINE_LAB_EFFORT=dim bash "\${d}runtime/statusline.sh" 2>/dev/null || true`;

const GOLDEN_SUB = `d=$(printf '%s\\n' ~/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1); bash "\${d}runtime/subagent.sh" 2>/dev/null || true`;

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

describe('configure: golden key values (ruling 1)', () => {
  it('writes the canonical main and subagent key bytes, and the fixtures composer reproduces them', () => {
    const home = newInstalledHome();

    const result = configure({
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });

    expect(result).toMatchObject({ mode: 'written' });
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      type: 'command',
      command: GOLDEN_MAIN,
    });
    expect(settings.subagentStatusLine).toEqual({
      type: 'command',
      command: GOLDEN_SUB,
    });

    expect(
      mainKeyValue('{model effort}', [
        'STATUSLINE_LAB_MODEL=block',
        'STATUSLINE_LAB_EFFORT=dim',
      ]),
    ).toBe(GOLDEN_MAIN);
    expect(subagentKeyValue).toBe(GOLDEN_SUB);
  });
});

describe('configure: key parse-back roundtrip (contract 2)', () => {
  it('readKeyConfig returns the layout and variants the main key holds', () => {
    const home = newInstalledHome();
    const layout = '{cwd branch} {model effort}';
    const variants = { branch: 'last', cwd: 'full', effort: 'dim', model: 'block' };

    configure({ home, layout, variants });

    expect(readKeyConfig(home)).toEqual({ layout, values: variants });
  });
});

describe('configure: quoting closure (ruling 1)', () => {
  it('every registry item id and variant id writes a key needing no quoting beyond the fixed forms', () => {
    const home = newInstalledHome();
    const runtime = resolveRuntime({ home });
    const configurable = runtime.items.filter(
      item => item.alternatives.length > 0,
    );
    expect(configurable).toHaveLength(runtime.items.length);

    for (const item of runtime.items) {
      expect(item.item, `item id '${item.item}'`).toMatch(/^[a-z0-9]+$/);
      for (const alt of item.alternatives) {
        expect(alt, `variant '${item.item}=${alt}'`).toMatch(/^[a-z0-9]+$/);

        configure({
          force: true,
          home,
          layout: `{${item.item}}`,
          variants: { [item.item]: alt },
        });
        expect(
          settingsCommand(home, 'statusLine'),
          `key for ${item.item}=${alt}`,
        ).toBe(
          mainKeyValue(`{${item.item}}`, [
            `STATUSLINE_LAB_${item.item.toUpperCase()}=${alt}`,
          ]),
        );
      }
    }

    const layout = configurable.map(item => `{${item.item}}`).join(' ');
    const variants = Object.fromEntries(
      configurable.map(item => [item.item, item.alternatives[0]]),
    );
    configure({ force: true, home, layout, variants });
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(
        layout,
        configurable.map(
          item =>
            `STATUSLINE_LAB_${item.item.toUpperCase()}=${item.alternatives[0]}`,
        ),
      ),
    );
  });
});
