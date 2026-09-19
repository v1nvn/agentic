import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import multiTick from '../assets/ticks/multi.json' with { type: 'json' };
import { catalog } from '../src/catalog.js';
import { runtimeRenderer, type RenderSpec } from '../src/payloads.js';
import {
  createWizard,
  type WizardDeps,
  type WizardOutcome,
} from '../src/wizard.js';
import {
  DATA_REL,
  createHomes,
  installRuntime,
  settingsPath,
  writeSettings,
} from './fixtures.js';
import { DEFAULT_NOW } from './runtime.js';

const RUNTIME_DIR = fileURLToPath(
  new URL('../../../plugins/statusline-lab/runtime', import.meta.url),
);
const DEFAULT_LAYOUT = /^export DEFAULT_LAYOUT='(.*)'$/m.exec(
  readFileSync(join(RUNTIME_DIR, 'lib.sh'), 'utf8'),
)?.[1];
if (DEFAULT_LAYOUT === undefined) {
  throw new Error('lib.sh declares no DEFAULT_LAYOUT');
}
const DEFAULT_LAYOUT_ITEMS = DEFAULT_LAYOUT.replaceAll('}', '')
  .replaceAll('{', '')
  .split(' ')
  .filter(word => word !== '');
const MULTI_TICK = multiTick as unknown as {
  tasks: ReadonlyArray<{ id?: string }>;
};

interface Recorded {
  readonly frames: string[];
  readonly specs: RenderSpec[];
}

function fakeDeps(keys: readonly string[]): {
  readonly deps: WizardDeps;
  readonly recorded: Recorded;
} {
  const frames: string[] = [];
  const specs: RenderSpec[] = [];
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
      preview: (spec: RenderSpec) => {
        specs.push(spec);
        return '';
      },
    },
    recorded: { frames, specs },
  };
}

const homes = createHomes();

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
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

function seedMainScript(home: string, raw: string): void {
  const file = join(home, DATA_REL, 'statusline-command.sh');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, raw);
}

function mainScript(home: string): string {
  return join(home, DATA_REL, 'statusline-command.sh');
}

afterEach(() => {
  homes.dispose();
});

async function runWizard(
  keys: readonly string[],
  home = newInstalledHome(),
): Promise<{ home: string; outcome: WizardOutcome; recorded: Recorded }> {
  const { deps, recorded } = fakeDeps(keys);
  const outcome = await createWizard({ home, now: DEFAULT_NOW }, deps);
  return { home, outcome, recorded };
}

// The wizard spawns one full-line preview per draw (layout = the wizard's
// layout) plus one sample per alternative of the focused item (layout = that
// item alone) and one panel preview.
function lineSpecs(
  specs: readonly RenderSpec[],
  layout: string,
): RenderSpec[] {
  return specs.filter(spec => spec.env.STATUSLINE_LAB_LAYOUT === layout);
}

function panelSpecs(specs: readonly RenderSpec[]): RenderSpec[] {
  return specs.filter(spec => spec.bin.endsWith('/subagent.sh'));
}

function lastLine(specs: readonly RenderSpec[], layout: string): RenderSpec {
  const lines = lineSpecs(specs, layout);
  if (lines.length === 0) {
    throw new Error('no line preview was spawned');
  }
  return lines[lines.length - 1];
}

function focusedItems(specs: readonly RenderSpec[]): string[] {
  const seen: string[] = [];
  for (const spec of specs) {
    const layout = spec.env.STATUSLINE_LAB_LAYOUT;
    if (layout !== undefined && /^{\w+}$/.test(layout)) {
      seen.push(layout.slice(1, -1));
    }
  }
  return seen;
}

describe('wizard: offered items', () => {
  it('offers the items of the default layout in order — style is not one of them', async () => {
    const walk = await runWizard([...Array(15).fill('j')]);

    expect([...new Set(focusedItems(walk.recorded.specs))]).toEqual(
      DEFAULT_LAYOUT_ITEMS,
    );
  });

  it('offers exactly the items of the layout in an existing script', async () => {
    const home = newInstalledHome();
    seedMainScript(
      home,
      [
        '#!/bin/bash',
        'export STATUSLINE_LAB_MODEL=block',
        `export STATUSLINE_LAB_LAYOUT='{model effort}'`,
        'exit 0',
      ].join('\n') + '\n',
    );

    const { recorded } = await runWizard(['j'], home);

    expect([...new Set(focusedItems(recorded.specs))]).toEqual([
      'model',
      'effort',
    ]);
    expect(lineSpecs(recorded.specs, '{model effort}')).toHaveLength(2);
  });
});

describe('wizard: the initial preview', () => {
  it('spawns the installed runtime with the draft as STATUSLINE_LAB_* env', async () => {
    const home = newInstalledHome();
    const { recorded } = await runWizard(['\x1b[B'], home);

    const line = lastLine(recorded.specs, DEFAULT_LAYOUT);
    expect(line.bin).toBe(
      join(
        home,
        '.claude',
        'plugins',
        'cache',
        'agentic',
        'statusline-lab',
        '0.19.0',
        'runtime',
        'statusline.sh',
      ),
    );
    expect(line.env.COLUMNS).toBe('80');
    expect(line.env.HOME).toBe(home);
    expect(line.env.NOW).toBe(DEFAULT_NOW);
    expect(line.env.STATUSLINE_LAB_LAYOUT).toBe(DEFAULT_LAYOUT);
    expect(line.env.STATUSLINE_LAB_MODEL).toBe('plain');
    expect(line.env.STATUSLINE_LAB_BAR).toBe('flat');
    // A fixture preview is anchored and pointed at a materialized demo repo,
    // never the raw file: the git segments need a live repo to render.
    const preview = JSON.parse(line.stdin) as {
      prompt_cache: { expires_at: number };
      workspace: { current_dir: string };
    };
    expect(preview.workspace.current_dir).toMatch(/\/demo\/atlas-web$/);
    expect(preview.prompt_cache.expires_at).toBe(Number(DEFAULT_NOW) + 1920);
    expect(recorded.frames.length).toBeGreaterThan(0);
  });

  it('seeds the draft from the exports of the generated script', async () => {
    const home = newInstalledHome();
    seedMainScript(
      home,
      [
        '#!/bin/bash',
        'export STATUSLINE_LAB_MODEL=block',
        `export STATUSLINE_LAB_LAYOUT='{model effort}'`,
        'exit 0',
      ].join('\n') + '\n',
    );

    const { recorded } = await runWizard(['\x1b[B'], home);

    const line = lastLine(recorded.specs, '{model effort}');
    expect(line.env.STATUSLINE_LAB_MODEL).toBe('block');
    expect(line.env.STATUSLINE_LAB_EFFORT).toBe('plain');
  });
});

describe('wizard: capture preference (contract 7)', () => {
  it('renders the captures verbatim when they exist', async () => {
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

    const { recorded } = await runWizard(['\x1b[B'], home);

    expect(lastLine(recorded.specs, DEFAULT_LAYOUT).stdin).toBe(main);
    // The panel rides the captured tasks (empty — the fixture carries three
    // rows) with the wizard width injected over the captured 120.
    expect(JSON.parse(panelSpecs(recorded.specs)[0]?.stdin ?? '')).toEqual({
      columns: 80,
      tasks: [],
    });
  });
});

describe('wizard: agent-panel preview', () => {
  it('spawns the installed subagent.sh once per draw on the anchored multi tick', async () => {
    const home = newInstalledHome();
    const { recorded } = await runWizard(['\x1b[B'], home);

    const panels = panelSpecs(recorded.specs);
    const draws = lineSpecs(recorded.specs, DEFAULT_LAYOUT).length;
    expect(draws).toBeGreaterThan(1);
    expect(panels).toHaveLength(draws);

    const panel = panels[0];
    expect(panel?.env).toEqual({
      COLUMNS: '80',
      HOME: home,
      NOW: DEFAULT_NOW,
    });

    const tick = JSON.parse(panel?.stdin ?? '') as {
      columns: number;
      tasks: ReadonlyArray<{ id?: string; startTime?: number }>;
    };
    expect(tick.columns).toBe(80);
    expect(tick.tasks.map(task => task.id)).toEqual(
      MULTI_TICK.tasks.map(task => task.id),
    );
    const now = Number(DEFAULT_NOW);
    expect(tick.tasks[0]?.startTime).toBeLessThan(now);
    expect(tick.tasks[0]?.startTime).toBeGreaterThan(now - 3600);
  });
});

describe('wizard: movement keys', () => {
  it('down and j step through items; up and k step back', async () => {
    const down = await runWizard([...Array(5).fill('\x1b[B')]);
    expect(focusedItems(down.recorded.specs).slice(-1)).toEqual(['status']);

    const j = await runWizard([...Array(5).fill('j')]);
    expect(focusedItems(j.recorded.specs).slice(-1)).toEqual(['status']);

    const up = await runWizard(['\x1b[B', '\x1b[B', '\x1b[A']);
    expect(focusedItems(up.recorded.specs).slice(-1)).toEqual(['effort']);

    const k = await runWizard(['\x1b[B', 'k']);
    expect(focusedItems(k.recorded.specs).slice(-1)).toEqual(['model']);
  });

  it('wraps in both directions', async () => {
    const off = await runWizard(['\x1b[A']);
    expect(focusedItems(off.recorded.specs).slice(-1)).toEqual(['rate']);

    const on = await runWizard([...Array(15).fill('j')]);
    expect(focusedItems(on.recorded.specs).slice(-1)).toEqual(['model']);
  });
});

describe('wizard: variant cycling', () => {
  it('right and l advance; left and h go back', async () => {
    const right = await runWizard(['\x1b[C']);
    expect(
      lastLine(right.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_MODEL,
    ).toBe('block');

    const l = await runWizard(['l']);
    expect(
      lastLine(l.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_MODEL,
    ).toBe('block');

    const left = await runWizard(['\x1b[C', '\x1b[D']);
    expect(
      lastLine(left.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_MODEL,
    ).toBe('plain');

    const h = await runWizard(['h']);
    expect(
      lastLine(h.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_MODEL,
    ).toBe('zen');
  });

  it('s hides an item that offers none', async () => {
    const hidden = await runWizard([...Array(11).fill('j'), 's']);
    expect(
      lastLine(hidden.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_COST,
    ).toBe('none');
  });

  it('s is inert on an item with no none alternative', async () => {
    const inert = await runWizard(['s']);
    expect(
      lastLine(inert.recorded.specs, DEFAULT_LAYOUT).env.STATUSLINE_LAB_MODEL,
    ).toBe('plain');
  });
});

describe('wizard: width preview', () => {
  it('starts previews at 80 columns', async () => {
    const { recorded } = await runWizard(['\x1b[B']);
    expect(lastLine(recorded.specs, DEFAULT_LAYOUT).env.COLUMNS).toBe('80');
  });

  it('w steps 80 to 120 to 200 and wraps back to 80', async () => {
    const three = await runWizard(['w', 'w', 'w']);
    const widths = lineSpecs(three.recorded.specs, DEFAULT_LAYOUT).map(
      spec => spec.env.COLUMNS,
    );
    const rungs = widths.filter((width, at) => width !== widths[at - 1]);
    expect(rungs).toEqual(['80', '120', '200', '80']);
  });
});

describe('wizard: save (the TTY mode of contract 3)', () => {
  it('writes both scripts and both settings keys through the configure writer; catalog stars follow', async () => {
    const home = newInstalledHome();

    const { outcome } = await runWizard(['l', '\r'], home);

    expect(outcome).toBe('saved');
    const main = readFileSync(mainScript(home), 'utf8');
    expect(main).toContain('export STATUSLINE_LAB_MODEL=block');
    expect(main).toContain(`export STATUSLINE_LAB_LAYOUT='${DEFAULT_LAYOUT}'`);
    expect(main.endsWith('exit 0\n')).toBe(true);
    expect(
      readFileSync(join(home, DATA_REL, 'subagent-statusline.sh'), 'utf8'),
    ).not.toContain('export STATUSLINE_LAB_');

    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8'));
    expect(settings.statusLine).toEqual({
      command: `~/${join(DATA_REL, 'statusline-command.sh')}`,
      type: 'command',
    });
    expect(settings.subagentStatusLine).toEqual({
      command: `~/${join(DATA_REL, 'subagent-statusline.sh')}`,
      type: 'command',
    });

    expect(catalog({ home }).split('\n')).toContain(
      'model: plain | block* | pill | zen',
    );
  });

  // Fix round 1 flipped this pin on purpose: a refused save used to return
  // 'saved'; it now reports failure so the outcome and exit code tell the truth.
  it('a foreign settings key fails the save — a failure outcome, nothing written', async () => {
    const home = newInstalledHome();
    const seed = `${JSON.stringify(
      { statusLine: { command: './old-main.sh', type: 'command' } },
      null,
      2,
    )}\n`;
    writeSettings(home, seed);

    const { outcome, recorded } = await runWizard(['\r'], home);

    expect(outcome).toBe('save-failed');
    const last = recorded.frames[recorded.frames.length - 1] ?? '';
    expect(last).toContain('statusLine');
    expect(last).toContain('--force');
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
    expect(existsSync(mainScript(home))).toBe(false);
  });
});

describe('wizard: cancel', () => {
  it('q mid-walk writes nothing', async () => {
    const home = newInstalledHome();
    const { outcome } = await runWizard(['l', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(mainScript(home))).toBe(false);
    expect(existsSync(settingsPath(home))).toBe(false);
  });

  it('Ctrl-C (\\x03) behaves like q', async () => {
    const home = newInstalledHome();
    const { outcome } = await runWizard(['\x03'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(mainScript(home))).toBe(false);
  });

  it('a closed key stream cancels — the adapter owning the TTY died', async () => {
    const home = newInstalledHome();
    const { outcome } = await runWizard([], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(mainScript(home))).toBe(false);
  });

  it('leaves a pre-existing generated script byte-untouched after draft edits', async () => {
    const home = newInstalledHome();
    const dotted = [
      '#!/bin/bash',
      'export STATUSLINE_LAB_MODEL=block',
      `export STATUSLINE_LAB_LAYOUT='{model}'`,
      'exit 0',
    ].join('\n') + '\n';
    seedMainScript(home, dotted);

    const { outcome } = await runWizard(['h', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(readFileSync(mainScript(home), 'utf8')).toBe(dotted);
  });
});

describe('wizard: preview honesty', () => {
  it('the initial preview equals a bare spawn of the installed runtime under the same env', async () => {
    const home = newInstalledHome();
    const { recorded } = await runWizard(['\x1b[B'], home);

    const spec = lastLine(recorded.specs, DEFAULT_LAYOUT);
    const rendered = runtimeRenderer(spec);
    expect(rendered).toContain('Opus');

    const manual = spawnSync('bash', [spec.bin], {
      input: spec.stdin,
      env: {
        PATH: process.env.PATH ?? '',
        ...spec.env,
        LC_ALL: 'C',
        TZ: 'UTC',
      },
      timeout: 30_000,
    });
    expect(manual.status).toBe(0);
    expect(rendered).toBe(manual.stdout.toString('utf8'));
  });
});
