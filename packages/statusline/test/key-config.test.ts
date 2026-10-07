import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { ITEMS } from '../src/render/index.js';
import { mainKeyValue, subagentKeyValue, readKeyConfig } from '../src/resolve.js';
import {
  createHomes,
  settingsCommand,
  settingsPath,
} from './fixtures.js';

// The Goal's canonical bytes, typed in full — the golden the writer is pinned
// against. The program itself is the prefix; decisions ride argv as flags.
const GOLDEN_MAIN = `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --layout='{model effort}' --model=block --effort=dim || true`;

const GOLDEN_SUB = `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --subagent || true`;

const GOLDEN_THEME = `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean || true`;

const GOLDEN_THEME_SWAP = `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean --bar=gauge || true`;

const GOLDEN_THEME_SUB = `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --subagent --theme=lean || true`;

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('configure: golden key values (ruling 1)', () => {
  it('writes the canonical main and subagent key bytes', () => {
    const home = homes.newHome();

    configure({
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });

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
      mainKeyValue(null, '{model effort}', ['--model=block', '--effort=dim']),
    ).toBe(GOLDEN_MAIN);
    expect(subagentKeyValue(null, [])).toBe(GOLDEN_SUB);
  });

  it('writes the Goal theme bytes — theme alone, and theme plus one swap', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean' });

    expect(settingsCommand(home, 'statusLine')).toBe(GOLDEN_THEME);
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(GOLDEN_THEME_SUB);

    const swapped = homes.newHome();
    configure({ home: swapped, theme: 'lean', variants: { bar: 'gauge' } });

    expect(settingsCommand(swapped, 'statusLine')).toBe(GOLDEN_THEME_SWAP);
    expect(settingsCommand(swapped, 'subagentStatusLine')).toBe(
      GOLDEN_THEME_SUB,
    );
    expect(mainKeyValue('lean', null, ['--bar=gauge'])).toBe(GOLDEN_THEME_SWAP);
    expect(subagentKeyValue('lean', [])).toBe(GOLDEN_THEME_SUB);
  });
});

describe('configure: key parse-back roundtrip (contract 2)', () => {
  it('readKeyConfig returns the layout and variants the main key holds', () => {
    const home = homes.newHome();
    const layout = '{cwd branch} {model effort}';
    const variants = { branch: 'last', cwd: 'full', effort: 'dim', model: 'block' };

    configure({ home, layout, variants });

    expect(readKeyConfig(home)).toEqual({ layout, values: variants });
  });

  it('a theme key parses back the theme, no explicit layout, and only its overrides', () => {
    const home = homes.newHome();

    configure({ home, theme: 'lean', variants: { bar: 'gauge' } });

    expect(readKeyConfig(home)).toEqual({
      layout: null,
      theme: 'lean',
      values: { bar: 'gauge' },
    });
  });

  it('a theme key with a custom layout parses the layout back', () => {
    const home = homes.newHome();

    configure({ home, theme: 'quiet', layout: '{model}' });

    expect(readKeyConfig(home)).toEqual({
      layout: '{model}',
      theme: 'quiet',
      values: {},
    });
  });
});

describe('configure: quoting closure (ruling 1)', () => {
  it('every registry item id and variant id writes a key needing no quoting beyond the fixed forms', () => {
    const home = homes.newHome();

    for (const { alternatives, default: def, item } of ITEMS) {
      expect(item, `item id '${item}'`).toMatch(/^[a-z0-9-]+$/);
      for (const alt of alternatives) {
        expect(alt, `variant '${item}=${alt}'`).toMatch(/^[a-z0-9]+$/);

        configure({
          force: true,
          home,
          layout: `{${item}}`,
          variants: { [item]: alt },
        });
        expect(
          settingsCommand(home, 'statusLine'),
          `key for ${item}=${alt}`,
        ).toBe(
          mainKeyValue(
            null,
            `{${item}}`,
            alt === def ? [] : [`--${item}=${alt}`],
          ),
        );
      }
    }
  });
});
