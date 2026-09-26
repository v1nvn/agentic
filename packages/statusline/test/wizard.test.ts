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
import { resolveRuntime } from '../src/resolve.js';
import { type ThemeName } from '../src/themes.js';
import {
  createWizard,
  opensWizard,
  type WizardDeps,
  type WizardOutcome,
  type WizardOptions,
} from '../src/wizard.js';
import {
  DATA_REL,
  THEMES,
  createHomes,
  installRuntime,
  settingsCommand,
  settingsPath,
  subagentKeyValue,
  writeSettings,
} from './fixtures.js';
import { DEFAULT_NOW } from './runtime.js';

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
const MULTI_TICK = multiTick as unknown as {
  tasks: ReadonlyArray<{ id?: string; startTime?: number }>;
};

interface Recorded {
  readonly frames: string[];
  readonly bags: PreviewRender[];
}

function sameValues(
  values: unknown,
  theme: Readonly<Record<string, string>>,
): boolean {
  if (typeof values !== 'object' || values === null) {
    return false;
  }
  const held = values as Record<string, string>;
  return (
    Object.keys(held).length === Object.keys(theme).length &&
    Object.entries(theme).every(([item, alt]) => held[item] === alt)
  );
}

// One canned surface per theme bag, so frame pins name the theme a bar came
// from; every other bag renders as its layout.
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
        const theme = THEME_NAMES.find(
          name =>
            bag.layout === THEMES[name].layout &&
            sameValues(bag.values, THEMES[name].variants),
        );
        if (theme !== undefined) {
          return { line: `bar:${theme}`, panel: `panel:${theme}` };
        }
        return { line: `line:${bag.layout}`, panel: 'panel:draft' };
      },
    },
    recorded: { frames, bags },
  };
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

async function runWizard(
  keys: readonly string[],
  home = newInstalledHome(),
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
  const file = join(home, DATA_REL, 'captures', `${surface}.json`);
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

function themeBags(recorded: Recorded, name: ThemeName): PreviewRender[] {
  return recorded.bags.filter(
    bag =>
      bag.layout === THEMES[name].layout &&
      sameValues(bag.values, THEMES[name].variants),
  );
}

function lastBag(recorded: Recorded, layout: string): PreviewRender {
  const bag = [...recorded.bags]
    .reverse()
    .find(candidate => candidate.layout === layout);
  if (bag === undefined) {
    throw new Error(`no preview bag rendered at layout ${layout}`);
  }
  return bag;
}

function focusedItems(recorded: Recorded): string[] {
  const seen: string[] = [];
  for (const bag of recorded.bags) {
    if (/^{\w+}$/.test(bag.layout)) {
      seen.push(bag.layout.slice(1, -1));
    }
  }
  return seen;
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
  it('stacks the five theme bars in THEMES order, each a live render of its own theme; focus starts on the first', async () => {
    const { recorded } = await runWizard([]);

    expect(recorded.bags).toHaveLength(5);
    const frame = recorded.frames[0] ?? '';
    for (const name of THEME_NAMES) {
      expect(themeBags(recorded, name), name).toHaveLength(1);
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

describe('wizard: pass two — refinement seeded from the pick', () => {
  it('enter on a theme picks it — the draft is the theme itself, q cancels with nothing written', async () => {
    const home = newInstalledHome();
    const { outcome, recorded } = await runWizard(['\r', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
    expect(focusedItems(recorded).length).toBeGreaterThan(0);
    expect(lastBag(recorded, THEMES.quiet.layout).values).toEqual(
      THEMES.quiet.variants,
    );
    const frame = recorded.frames[1] ?? '';
    expect(focusedThemes(frame)).toEqual([]);
    expect(frame).toContain('line:{model}');
  });

  it("picking custom seeds bare — the draft is custom's most-absent set", async () => {
    const { recorded } = await runWizard(['j', 'j', 'j', 'j', '\r', 'q']);

    expect(focusedItems(recorded).length).toBeGreaterThan(0);
    expect(lastBag(recorded, THEMES.custom.layout).values).toEqual(
      THEMES.custom.variants,
    );
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
    const home = newInstalledHome();
    const ids = resolveRuntime({ home }).items.map(item => item.item);
    const { recorded } = await runWizard(['\r', 'j', '\x1b[B', 'k', 'q'], home);

    expect([...new Set(focusedItems(recorded))]).toEqual(
      layoutItems(THEMES.quiet.layout, ids),
    );
    expect(focusedItems(recorded).slice(-1)).toEqual(['cwd']);
  });

  it('h/l cycle the focused variant; s none only where none is offered', async () => {
    const home = newInstalledHome();
    const model = resolveRuntime({ home }).items.find(
      item => item.item === 'model',
    );
    if (model === undefined) {
      throw new Error('registry declares no model item');
    }
    const seeded = THEMES.quiet.variants.model;
    const cycled =
      model.alternatives[
        (model.alternatives.indexOf(seeded) + 1) % model.alternatives.length
      ];

    const forward = await runWizard(['\r', 'l', 'q'], home);
    expect(lastBag(forward.recorded, THEMES.quiet.layout).values.model).toBe(
      cycled,
    );

    const back = await runWizard(['\r', 'l', 'h', 'q'], home);
    expect(lastBag(back.recorded, THEMES.quiet.layout).values.model).toBe(
      seeded,
    );

    const leanHome = newInstalledHome();
    const items = layoutItems(
      THEMES.lean.layout,
      resolveRuntime({ home: leanHome }).items.map(item => item.item),
    );
    const hidden = await runWizard(
      ['j', 'j', '\r', ...Array(items.indexOf('cost')).fill('j'), 's', 'q'],
      leanHome,
    );
    expect(lastBag(hidden.recorded, THEMES.lean.layout).values.cost).toBe(
      'none',
    );

    const inert = await runWizard(['\r', 's', 'q'], home);
    expect(lastBag(inert.recorded, THEMES.quiet.layout).values.model).toBe(
      seeded,
    );
  });

  it('w keeps cycling the width in pass two', async () => {
    const { recorded } = await runWizard(['\r', 'w', 'q']);

    expect(lastBag(recorded, THEMES.quiet.layout).width ?? 200).toBe(120);
  });
});

describe('wizard: a theme pick saved', () => {
  it('enter on lean, then save — the settings text is byte-equal to what configure --theme lean writes', async () => {
    const wizardHome = newInstalledHome();
    const themedHome = newInstalledHome();
    configure({ home: themedHome, theme: 'lean' });

    const { outcome } = await runWizard(['j', 'j', '\r', '\r'], wizardHome);

    expect(outcome).toBe('saved');
    expect(readFileSync(settingsPath(wizardHome), 'utf8')).toBe(
      readFileSync(settingsPath(themedHome), 'utf8'),
    );
    expect(settingsCommand(wizardHome, 'subagentStatusLine')).toBe(
      subagentKeyValue,
    );
  });

  it('a quiet pick seeds the layout too — byte-equal to configure --theme quiet', async () => {
    const wizardHome = newInstalledHome();
    const themedHome = newInstalledHome();
    configure({ home: themedHome, theme: 'quiet' });

    const { outcome } = await runWizard(['\r', '\r'], wizardHome);

    expect(outcome).toBe('saved');
    expect(readFileSync(settingsPath(wizardHome), 'utf8')).toBe(
      readFileSync(settingsPath(themedHome), 'utf8'),
    );
  });

  it('a foreign settings key fails the save — a failure outcome, nothing written', async () => {
    const home = newInstalledHome();
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

  it('force takes the foreign key over — byte-equal to configure --theme quiet --force', async () => {
    const seed = `${JSON.stringify(
      { statusLine: { command: './old-main.sh', type: 'command' } },
      null,
      2,
    )}\n`;
    const wizardHome = newInstalledHome();
    const flagged = newInstalledHome();
    writeSettings(wizardHome, seed);
    writeSettings(flagged, seed);
    configure({ home: flagged, force: true, theme: 'quiet' });

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
      const home = newInstalledHome();
      const { outcome } = await runWizard(keys, home);
      expect(outcome).toBe('cancelled');
      expect(existsSync(settingsPath(home))).toBe(false);
      expect(existsSync(join(home, DATA_REL))).toBe(false);
    }
  });

  it('a closed key stream cancels — the adapter owning the TTY died', async () => {
    const home = newInstalledHome();
    const { outcome } = await runWizard([], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
  });

  it('a picked-and-edited draft never touches disk when cancelled', async () => {
    const home = newInstalledHome();
    const { outcome } = await runWizard(['j', 'j', '\r', 'l', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(settingsPath(home))).toBe(false);
    expect(existsSync(join(home, DATA_REL))).toBe(false);
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
    const home = newInstalledHome();
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
  it('a theme bar bag renders verbatim through the real renderer', async () => {
    const { recorded } = await runWizard(['j']);

    const bag = themeBags(recorded, 'lean')[0];
    if (bag === undefined) {
      throw new Error('no lean theme bag rendered');
    }
    expect(renderPreview(bag).line).toContain('Opus');
  });

  it('the width the bags carry is the width the renderer renders at', async () => {
    const home = newInstalledHome();
    const sources = previewSources(home, Number(DEFAULT_NOW));
    try {
      const bag: PreviewRender = {
        home,
        layout: THEMES.lean.layout,
        main: sources.main,
        now: DEFAULT_NOW,
        runtime: resolveRuntime({ home }),
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
