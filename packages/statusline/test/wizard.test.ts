import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import multiTick from '../assets/ticks/multi.json' with { type: 'json' };
import { configure, layoutItems } from '../src/configure.js';
import {
  previewSources,
  renderPreview,
  type PreviewRender,
  type PreviewSurfaces,
} from '../src/payloads.js';
import { DATA_DIR } from '../src/render/capture.js';
import { ITEMS } from '../src/render/index.js';
import { mainKeyValue, panelKeyValue } from '../src/resolve.js';
import { type ThemeName } from '../src/themes.js';
import {
  createWizard,
  opensWizard,
  type WizardDeps,
  type WizardOutcome,
  type WizardOptions,
} from '../src/wizard.js';
import {
  THEMES,
  createHomes,
  settingsCommand,
  settingsPath,
  writeSettings,
} from './fixtures.js';
import { DEFAULT_NOW } from './runtime.js';

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
const MULTI_TICK = multiTick as unknown as {
  tasks: ReadonlyArray<{ id?: string; startTime?: number }>;
};
const RENDER_MJS =
  'node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs"';
const ITEM_IDS = ITEMS.map(item => item.item);

interface Recorded {
  readonly frames: string[];
  readonly bags: PreviewRender[];
}

// One canned surface per theme bar — a bag that rides the name alone — so
// frame pins name the theme a bar came from; every other bag renders as its
// layout when it carries one, and as its override set when it does not.
function fakeDeps(keys: readonly string[]): {
  readonly deps: WizardDeps;
  readonly recorded: Recorded;
} {
  const frames: string[] = [];
  const bags: PreviewRender[] = [];
  async function* readKeys(): AsyncGenerator<string> {
    for (const key of keys) {
      yield key;
    }
  }
  return {
    deps: {
      readKeys,
      render: (frame: string) => {
        frames.push(frame);
      },
      preview: (bag: PreviewRender): PreviewSurfaces => {
        bags.push(bag);
        const overrides = bag.values ?? {};
        if (
          bag.theme !== undefined &&
          bag.layout === undefined &&
          Object.keys(overrides).length === 0
        ) {
          return { line: `bar:${bag.theme}`, panel: `panel:${bag.theme}` };
        }
        const label = bag.layout ?? `@${bag.theme}`;
        return {
          line: `line:${label}`,
          panel: `panel:${JSON.stringify(overrides)}`,
        };
      },
    },
    recorded: { frames, bags },
  };
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

async function runWizard(
  keys: readonly string[],
  home = homes.newHome(),
  options: Partial<WizardOptions> = {},
): Promise<{ home: string; outcome: WizardOutcome; recorded: Recorded }> {
  const { deps, recorded } = fakeDeps(keys);
  const outcome = await createWizard(
    { home, now: DEFAULT_NOW, ...options },
    deps,
  );
  return { home, outcome, recorded };
}

function seedCapture(
  home: string,
  surface: 'main' | 'tick',
  body: string,
): void {
  const file = join(home, DATA_DIR, 'captures', `${surface}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

function labelLine(frame: string, name: ThemeName): string {
  return (
    frame
      .split('\n')
      .find(part => part.includes(`${name}: ${THEMES[name].summary}`)) ?? ''
  );
}

function focusedThemes(frame: string): ThemeName[] {
  return THEME_NAMES.filter(name => labelLine(frame, name).startsWith('>'));
}

// A theme bar bag: the name alone, no layout, no picks.
function themeBags(recorded: Recorded, name: ThemeName): PreviewRender[] {
  return recorded.bags.filter(
    bag =>
      bag.theme === name &&
      bag.layout === undefined &&
      Object.keys(bag.values ?? {}).length === 0,
  );
}

// The refine pass's full render: the name plus the overrides, no layout.
function lastFullBag(recorded: Recorded): PreviewRender {
  const bag = [...recorded.bags]
    .reverse()
    .find(candidate => candidate.layout === undefined);
  if (bag === undefined) {
    throw new Error('no full-theme bag rendered');
  }
  return bag;
}

function focusedItems(recorded: Recorded): string[] {
  const seen: string[] = [];
  for (const bag of recorded.bags) {
    if (bag.layout !== undefined && /^{\w+}$/.test(bag.layout)) {
      seen.push(bag.layout.slice(1, -1));
    }
  }
  return seen;
}

function refineRow(frame: string, item: string): string {
  const re = new RegExp(`^[> ] ${item}\\s`);
  return frame.split('\n').find(line => re.test(line)) ?? '';
}

function rungs<T>(values: readonly T[]): T[] {
  return values.filter((value, at) => value !== values[at - 1]);
}

describe('wizard: the gate', () => {
  it('opens for a bare configure on a TTY and nothing else', () => {
    expect(opensWizard({}, true)).toBe(true);
    expect(opensWizard({}, false)).toBe(false);
    expect(opensWizard({ theme: 'lean' }, true)).toBe(false);
    expect(opensWizard({ layout: '{model}' }, true)).toBe(false);
    expect(opensWizard({ variants: { model: 'block' } }, true)).toBe(false);
  });
});

describe('wizard: pass one — the theme pass', () => {
  it('previews each theme by its name alone — no compiled picks ride the bag', async () => {
    const { recorded } = await runWizard([]);

    expect(recorded.bags).toHaveLength(5);
    const frame = recorded.frames[0] ?? '';
    for (const name of THEME_NAMES) {
      const bags = themeBags(recorded, name);
      expect(bags, name).toHaveLength(1);
      expect(bags[0]?.theme, name).toBe(name);
      expect(bags[0]?.layout, name).toBeUndefined();
      expect(bags[0]?.values, name).toEqual({});
      expect(frame, name).toContain(`${name}: ${THEMES[name].summary}`);
    }
    const bars = THEME_NAMES.map(name => frame.indexOf(`bar:${name}`));
    expect(bars.every(at => at >= 0)).toBe(true);
    expect([...bars].sort((a, b) => a - b)).toEqual(bars);
    expect(focusedThemes(frame)).toEqual([THEME_NAMES[0]]);
    expect(frame).toContain(`panel:${THEME_NAMES[0]}`);
  });

  it('j/k and the arrows move focus with wrap', async () => {
    const down = await runWizard(['j']);
    expect(focusedThemes(down.recorded.frames[1] ?? '')).toEqual(['classic']);
    expect(down.recorded.frames[1] ?? '').toContain('panel:classic');

    const up = await runWizard(['k']);
    expect(focusedThemes(up.recorded.frames[1] ?? '')).toEqual(['custom']);

    const wrapped = await runWizard([...Array(5).fill('j')]);
    expect(focusedThemes(wrapped.recorded.frames[5] ?? '')).toEqual(['quiet']);

    const arrowDown = await runWizard(['\x1b[B']);
    expect(focusedThemes(arrowDown.recorded.frames[1] ?? '')).toEqual([
      'classic',
    ]);

    const arrowUp = await runWizard(['\x1b[A']);
    expect(focusedThemes(arrowUp.recorded.frames[1] ?? '')).toEqual(['custom']);
  });

  it('w cycles the width the bars render at — line bag and tick columns, 80 to 120 to 200 and wrap', async () => {
    const { recorded } = await runWizard(['w', 'w', 'w']);

    const quiet = themeBags(recorded, 'quiet');
    expect(quiet).toHaveLength(4);
    const widths = quiet.map(bag => bag.width ?? 200);
    expect(rungs(widths)).toEqual([80, 120, 200, 80]);
    const columns = quiet.map(
      bag => (JSON.parse(bag.tick) as { columns?: number }).columns,
    );
    expect(rungs(columns)).toEqual([80, 120, 200, 80]);
  });
});

describe('wizard: pass two — refinement over the theme name', () => {
  it('enter on a theme picks it — the draft rides the name with no overrides, q cancels with nothing written', async () => {
    const home = homes.newHome();
    const { outcome, recorded } = await runWizard(['\r', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
    expect(focusedItems(recorded).length).toBeGreaterThan(0);
    const full = lastFullBag(recorded);
    expect(full.theme).toBe('quiet');
    expect(full.values).toEqual({});
    const frame = recorded.frames[1] ?? '';
    expect(focusedThemes(frame)).toEqual([]);
    expect(frame).toContain('line:{model}');
  });

  it("picking custom seeds bare — the samples resolve custom's own picks through the name", async () => {
    const { recorded } = await runWizard(['j', 'j', 'j', 'j', '\r', 'q']);

    const full = lastFullBag(recorded);
    expect(full.theme).toBe('custom');
    expect(full.values).toEqual({});
    const sample = recorded.bags.find(bag => bag.layout === '{model}');
    expect(sample?.theme).toBe('custom');
  });

  it('the refine list offers the theme layout items plus style, each row showing its effective pick', async () => {
    const { recorded } = await runWizard(['\r', 'q']);

    const frame = recorded.frames[1] ?? '';
    for (const item of layoutItems(THEMES.quiet.layout, ITEM_IDS)) {
      expect(refineRow(frame, item), item).not.toBe('');
    }
    expect(refineRow(frame, 'style')).toBe(`  style     bare`);
  });

  it('t returns to pass one with the previous pick still focused', async () => {
    const { recorded } = await runWizard(['j', 'j', '\r', 't', 'q']);

    const frame = recorded.frames.at(-2) ?? '';
    for (const name of THEME_NAMES) {
      expect(frame, name).toContain(`bar:${name}`);
    }
    expect(focusedThemes(frame)).toEqual(['lean']);
  });

  it('j/k and the arrows move item focus over the picked theme layout items', async () => {
    const home = homes.newHome();
    const { recorded } = await runWizard(['\r', 'j', '\x1b[B', 'k', 'q'], home);

    expect([...new Set(focusedItems(recorded))]).toEqual([
      ...layoutItems(THEMES.quiet.layout, ITEM_IDS),
    ]);
    const styleFrame = recorded.frames[3] ?? '';
    expect(styleFrame).toContain('style: plain | dots | dim | bare');
    expect(refineRow(styleFrame, 'style')).toBe(`> style     bare`);
  });

  it('style samples render the panel row — every alternative visible', async () => {
    const { recorded } = await runWizard(['\r', 'j', 'j', 'q']);

    const frame = recorded.frames[3] ?? '';
    for (const alt of ['plain', 'dots', 'dim', 'bare']) {
      expect(frame).toContain(`{"style":"${alt}"}`);
    }
  });

  it('h/l cycle the focused variant; an override lives only while it differs from the theme pick', async () => {
    const home = homes.newHome();
    const model = ITEMS.find(item => item.item === 'model');
    if (model === undefined) {
      throw new Error('registry declares no model item');
    }
    const seeded = THEMES.quiet.variants.model;
    const cycled =
      model.alternatives[
        (model.alternatives.indexOf(seeded) + 1) % model.alternatives.length
      ];

    const forward = await runWizard(['\r', 'l', 'q'], home);
    expect(lastFullBag(forward.recorded).values).toEqual({ model: cycled });

    const back = await runWizard(['\r', 'l', 'h', 'q'], home);
    expect(lastFullBag(back.recorded).values).toEqual({});

    const leanHome = homes.newHome();
    const items = layoutItems(THEMES.lean.layout, ITEM_IDS);
    const hidden = await runWizard(
      ['j', 'j', '\r', ...Array(items.indexOf('cost')).fill('j'), 's', 'q'],
      leanHome,
    );
    expect(lastFullBag(hidden.recorded).values).toEqual({ cost: 'none' });

    const inert = await runWizard(['\r', 's', 'q'], home);
    expect(lastFullBag(inert.recorded).values).toEqual({});
  });

  it('w keeps cycling the width in pass two', async () => {
    const { recorded } = await runWizard(['\r', 'w', 'q']);

    expect(lastFullBag(recorded).width ?? 200).toBe(120);
  });
});

describe('wizard: a theme pick saved', () => {
  it('enter on quiet, then save — the key text is the bare theme spelling, byte-equal to a theme write', async () => {
    const wizardHome = homes.newHome();
    const referenceHome = homes.newHome();
    configure({ home: referenceHome, theme: 'quiet' });

    const { outcome } = await runWizard(['\r', '\r'], wizardHome);

    expect(outcome).toBe('saved');
    expect(settingsCommand(wizardHome, 'statusLine')).toBe(
      `${RENDER_MJS} --theme=quiet || true`,
    );
    expect(settingsCommand(wizardHome, 'subagentStatusLine')).toBe(
      panelKeyValue('quiet', []),
    );
    expect(readFileSync(settingsPath(wizardHome), 'utf8')).toBe(
      readFileSync(settingsPath(referenceHome), 'utf8'),
    );
  });

  it('a lean save that never edited a pick writes the lean name alone', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard(['j', 'j', '\r', '\r'], home);

    expect(outcome).toBe('saved');
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, []),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('lean', []),
    );
  });

  it('a refined save adds exactly the differing pick — lean bar cycled to none', async () => {
    const home = homes.newHome();
    const barAt = layoutItems(THEMES.lean.layout, ITEM_IDS).indexOf('bar');
    const { outcome } = await runWizard(
      ['j', 'j', '\r', ...Array(barAt).fill('j'), 'l', '\r'],
      home,
    );

    expect(outcome).toBe('saved');
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, ['--bar=none']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('lean', []),
    );
  });

  it('cycling back to the theme pick drops the override — the save is the bare spelling', async () => {
    const home = homes.newHome();
    const barAt = layoutItems(THEMES.lean.layout, ITEM_IDS).indexOf('bar');
    const { outcome } = await runWizard(
      ['j', 'j', '\r', ...Array(barAt).fill('j'), 'l', 'h', '\r'],
      home,
    );

    expect(outcome).toBe('saved');
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('lean', null, []),
    );
  });

  it('a style refinement rides both keys — quiet style cycled to plain', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard(['\r', 'j', 'j', 'l', '\r'], home);

    expect(outcome).toBe('saved');
    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('quiet', null, ['--style=plain']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('quiet', ['--style=plain']),
    );
  });

  it('a foreign settings key fails the save — a failure outcome, nothing written', async () => {
    const home = homes.newHome();
    const seed = `${JSON.stringify(
      { statusLine: { command: './old-main.sh', type: 'command' } },
      null,
      2,
    )}\n`;
    writeSettings(home, seed);

    const { outcome, recorded } = await runWizard(['\r', '\r'], home);

    expect(outcome).toBe('save-failed');
    const last = recorded.frames[recorded.frames.length - 1] ?? '';
    expect(last).toContain('statusLine');
    expect(last).toContain('--force');
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
  });

  it('force takes the foreign key over — byte-equal to a forced theme write', async () => {
    const seed = `${JSON.stringify(
      { statusLine: { command: './old-main.sh', type: 'command' } },
      null,
      2,
    )}\n`;
    const wizardHome = homes.newHome();
    const flagged = homes.newHome();
    writeSettings(wizardHome, seed);
    writeSettings(flagged, seed);
    configure({ force: true, home: flagged, theme: 'quiet' });

    const { outcome } = await runWizard(['\r', '\r'], wizardHome, {
      force: true,
    });

    expect(outcome).toBe('saved');
    expect(readFileSync(settingsPath(wizardHome), 'utf8')).toBe(
      readFileSync(settingsPath(flagged), 'utf8'),
    );
  });
});

describe('wizard: cancel', () => {
  it('q and Ctrl-C cancel from pass one — nothing written', async () => {
    for (const keys of [['q'], ['\x03']]) {
      const home = homes.newHome();
      const { outcome } = await runWizard(keys, home);
      expect(outcome).toBe('cancelled');
      expect(existsSync(settingsPath(home))).toBe(false);
      expect(existsSync(join(home, DATA_DIR))).toBe(false);
    }
  });

  it('a closed key stream cancels — the adapter owning the TTY died', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard([], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
  });

  it('a picked-and-edited draft never touches disk when cancelled', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard(['j', 'j', '\r', 'l', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
    expect(existsSync(join(home, DATA_DIR))).toBe(false);
  });
});

describe('wizard: sources', () => {
  it('anchors the fixture to the render moment and a materialized demo repo', async () => {
    const { recorded } = await runWizard(['j']);

    const bag = recorded.bags[0];
    if (bag === undefined) {
      throw new Error('no preview bag rendered');
    }
    const payload = JSON.parse(bag.main) as {
      prompt_cache: { expires_at: number };
      workspace: { current_dir: string };
    };
    expect(payload.workspace.current_dir).toMatch(/\/demo\/atlas-web$/);
    expect(payload.prompt_cache.expires_at).toBe(Number(DEFAULT_NOW) + 1920);
    const tick = JSON.parse(bag.tick) as {
      columns?: number;
      tasks: ReadonlyArray<{ id?: string; startTime?: number }>;
    };
    expect(tick.tasks.map(task => task.id)).toEqual(
      MULTI_TICK.tasks.map(task => task.id),
    );
    const now = Number(DEFAULT_NOW);
    expect(tick.tasks[0]?.startTime).toBeLessThan(now);
    expect(tick.tasks[0]?.startTime).toBeGreaterThan(now - 3600);
  });

  it('renders seeded captures verbatim, the wizard width over the captured tick columns', async () => {
    const home = homes.newHome();
    const main = `${JSON.stringify(
      { model: { display_name: 'Seeded' } },
      null,
      2,
    )}\n`;
    seedCapture(home, 'main', main);
    seedCapture(
      home,
      'tick',
      `${JSON.stringify({ columns: 120, tasks: [] }, null, 2)}\n`,
    );

    const { recorded } = await runWizard(['j'], home);

    const bag = recorded.bags[0];
    if (bag === undefined) {
      throw new Error('no preview bag rendered');
    }
    expect(bag.main).toBe(main);
    expect(JSON.parse(bag.tick)).toEqual({ columns: 80, tasks: [] });
  });
});

describe('wizard: render honesty', () => {
  it('a theme bar bag renders through the resolver — the name alone carries the picks', async () => {
    const { recorded } = await runWizard(['j']);

    const bag = themeBags(recorded, 'lean')[0];
    if (bag === undefined) {
      throw new Error('no lean theme bag rendered');
    }
    const { line } = renderPreview(bag);
    expect(line).toContain('Opus');
    expect(line).toContain('·');
  });

  it('the width the bags carry is the width the renderer renders at', async () => {
    const home = homes.newHome();
    const sources = previewSources(home, Number(DEFAULT_NOW));
    try {
      const bag: PreviewRender = {
        home,
        layout: THEMES.lean.layout,
        main: sources.main,
        now: DEFAULT_NOW,
        tick: sources.tick,
        values: THEMES.lean.variants,
      };

      const at80 = renderPreview({ ...bag, plain: true, width: 80 }).line;
      const at200 = renderPreview({ ...bag, plain: true, width: 200 }).line;
      const unspecified = renderPreview({ ...bag, plain: true }).line;

      expect(at80).not.toBe(at200);
      expect(unspecified).toBe(at200);
    } finally {
      sources.cleanup();
    }
  });
});
