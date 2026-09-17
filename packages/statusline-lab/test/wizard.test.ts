import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import p2 from '../assets/payloads/p2.json' with { type: 'json' };
import { capture } from '../src/capture.js';
import {
  createWizard,
  resolveWizardPayload,
  runtimeRenderer,
  wizardComponents,
  type WizardDeps,
  type WizardOutcome,
  type WizardRender,
} from '../src/wizard.js';
import {
  TRAMPOLINE_COMMAND,
  TRAMPOLINE_MARKER,
  createHomes,
  settingsPath,
  snapshotTree,
  trampolinePath,
  writeSettings,
  writeTrampoline,
} from './fixtures.js';
import {
  DEFAULT_NOW,
  PICKS_PATH,
  createDemoHome,
  renderStatusline,
} from './runtime.js';

const RUNTIME_COPY_BIN = fileURLToPath(
  new URL('../assets/runtime/bin/statusline.sh', import.meta.url),
);
const COMPONENTS_DIR = fileURLToPath(
  new URL('../assets/runtime/components', import.meta.url),
);
const LIB_SH = fileURLToPath(
  new URL('../assets/runtime/bin/lib.sh', import.meta.url),
);
const P1_FIXTURE = fileURLToPath(
  new URL('../assets/payloads/p1.json', import.meta.url),
);
const P3_FIXTURE = fileURLToPath(
  new URL('../assets/payloads/p3.json', import.meta.url),
);

// The runtime's own COMPS order (bin/statusline.sh CLUSTERS, bin/lib.sh) — the
// wizard lists components in the order the line renders them.
const CANONICAL_COMPS = [
  'model',
  'effort',
  'state',
  'cwd',
  'branch',
  'status',
  'ahead',
  'pr',
  'bar',
  'tokens',
  'cache',
  'cost',
  'duration',
  'lines',
  'rate',
  'style',
];

// The draft rides to the runtime as comp=alt argv, never as a half-written
// picks file — a bare invocation and an all-defaults argv land on the same
// line (read_picks defaults), so argv is the honest preview channel and a
// cancelled walk cannot leak draft state onto disk.
const DEFAULT_ARGS = [
  'model=plain',
  'effort=plain',
  'state=none',
  'cwd=init',
  'branch=initials',
  'status=counts',
  'ahead=none',
  'pr=none',
  'bar=flat',
  'tokens=full',
  'cache=hit',
  'cost=plain',
  'duration=clock',
  'lines=none',
  'rate=none',
  'style=plain',
];
const DEFAULT_PICKS = `${DEFAULT_ARGS.join('\n')}\n`;

const WALK_ARGS = [
  'model=block',
  'effort=plain',
  'state=none',
  'cwd=init',
  'branch=initials',
  'status=counts',
  'ahead=none',
  'pr=none',
  'bar=flat',
  'tokens=full',
  'cache=hit',
  'cost=none',
  'duration=clock',
  'lines=none',
  'rate=none',
  'style=plain',
];
const WALK_PICKS = `${WALK_ARGS.join('\n')}\n`;

const OFFER = 'apply now? [y/n]';

interface OfferedComponent {
  readonly component: string;
  readonly alternatives: readonly string[];
}

function offered(): readonly OfferedComponent[] {
  return wizardComponents();
}

interface Recorded {
  readonly frames: string[];
  readonly specs: WizardRender[];
}

function fakeDeps(keys: readonly string[]): {
  deps: WizardDeps;
  recorded: Recorded;
} {
  const frames: string[] = [];
  const specs: WizardRender[] = [];
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
      preview: (spec: WizardRender) => {
        specs.push(spec);
        return '';
      },
    },
    recorded: { frames, specs },
  };
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

async function runWizard(
  keys: readonly string[],
  home = homes.newHome(),
): Promise<{ home: string; outcome: WizardOutcome; recorded: Recorded }> {
  const { deps, recorded } = fakeDeps(keys);
  const outcome = await createWizard(
    { home, now: DEFAULT_NOW, payloadPath: P1_FIXTURE },
    deps,
  );
  return { home, outcome, recorded };
}

function lineSpecs(specs: readonly WizardRender[]): WizardRender[] {
  return specs.filter(spec => spec.args[0] !== '--seg');
}

function lastLine(specs: readonly WizardRender[]): WizardRender {
  const lines = lineSpecs(specs);
  if (lines.length === 0) {
    throw new Error('no line preview was spawned');
  }
  return lines[lines.length - 1];
}

function segmentAlternatives(
  specs: readonly WizardRender[],
  comp: string,
): Set<string> {
  return new Set(
    specs
      .filter(spec => spec.args[0] === '--seg')
      .map(spec => spec.args[1] ?? '')
      .filter(arg => arg.startsWith(`${comp}=`))
      .map(arg => arg.slice(comp.length + 1)),
  );
}

function focusedComponents(specs: readonly WizardRender[]): string[] {
  return specs
    .filter(spec => spec.args[0] === '--seg')
    .map(spec => (spec.args[1] ?? '').split('=')[0]);
}

// Independent parse of the shipped component headers — the wizard's offered
// set is cross-checked against this, not against itself.
function headerAlternatives(): Map<string, readonly string[]> {
  const declared = new Map<string, readonly string[]>();
  for (const file of readdirSync(COMPONENTS_DIR).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    for (const line of readFileSync(join(COMPONENTS_DIR, file), 'utf8').split(
      '\n',
    )) {
      if (!line.startsWith('#')) {
        break;
      }
      const match = /alternatives:\s*(.+)$/.exec(line);
      if (match) {
        declared.set(
          file.slice(0, -'.sh'.length),
          match[1]
            .split('|')
            .map(alt => alt.trim().replace(/\s*\(current\)$/, '')),
        );
      }
    }
  }
  return declared;
}

function libDefaults(): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const [, comp, alt] of readFileSync(LIB_SH, 'utf8').matchAll(
    /([a-z]+)\) echo ([a-z]+) ;;/g,
  )) {
    defaults.set(comp, alt);
  }
  return defaults;
}

describe('wizard: offered components', () => {
  it('lists every component in the runtime COMPS order', () => {
    expect(offered().map(entry => entry.component)).toEqual(CANONICAL_COMPS);
  });

  it('offers exactly the alternatives each component header declares', () => {
    const declared = headerAlternatives();
    for (const entry of offered()) {
      expect(entry.alternatives).toEqual(declared.get(entry.component));
    }
  });

  it('starts every component on its lib.sh default, which is itself offered', () => {
    const defaults = libDefaults();
    for (const entry of offered()) {
      expect(entry.alternatives).toContain(defaults.get(entry.component));
    }
  });
});

describe('wizard: payload selection', () => {
  it('pins an explicit fixture name to the shipped payload', () => {
    expect(
      resolveWizardPayload({ home: homes.newHome(), payload: 'p3' }),
    ).toEqual({
      path: P3_FIXTURE,
      source: 'fixture',
    });
  });

  it('passes an explicit path through untouched — captures and one-offs', () => {
    const path = join(tmpdir(), 'lab-capture.json');
    expect(
      resolveWizardPayload({ home: homes.newHome(), payload: path }),
    ).toEqual({
      path,
      source: 'path',
    });
  });

  it('treats a non-fixture p-name as a path — only p1..p4 are fixtures', () => {
    expect(
      resolveWizardPayload({ home: homes.newHome(), payload: 'p9' }),
    ).toEqual({
      path: 'p9',
      source: 'path',
    });
  });

  it('falls back to the p1 fixture on a bare home', () => {
    expect(resolveWizardPayload({ home: homes.newHome() })).toEqual({
      path: P1_FIXTURE,
      source: 'fixture',
    });
  });

  it('never feeds a tick to the main-line wizard — ticks fall through to p1', () => {
    const home = homes.newHome();
    capture({ home, stdin: '{"columns": 120, "tasks": []}' });
    expect(resolveWizardPayload({ home })).toEqual({
      path: P1_FIXTURE,
      source: 'fixture',
    });
  });

  it('a latest capture wins over the shipped fixture', () => {
    const home = homes.newHome();
    const filed = capture({ home, stdin: JSON.stringify(p2) });
    expect(resolveWizardPayload({ home })).toEqual({
      path: filed.path,
      source: 'capture',
    });
  });
});

describe('wizard: the initial preview', () => {
  it('spawns the runtime copy with the default draft as argv', async () => {
    const home = homes.newHome();
    const { recorded } = await runWizard(['\x1b[B'], home);

    const line = lastLine(recorded.specs);
    expect(line.bin).toBe(RUNTIME_COPY_BIN);
    expect(line.args).toEqual(DEFAULT_ARGS);
    expect(line.env.HOME).toBe(home);
    expect(line.env.NOW).toBe(DEFAULT_NOW);
    expect(line.env.COLUMNS).toBe('80');
    expect(line.stdin).toBe(readFileSync(P1_FIXTURE, 'utf8'));
    expect(recorded.frames.length).toBeGreaterThan(0);
  });

  it('renders every offered alternative of the focused component as samples', async () => {
    const { recorded } = await runWizard(['\x1b[B', '\x1b[A']);

    expect(segmentAlternatives(recorded.specs, 'model')).toEqual(
      new Set(headerAlternatives().get('model')),
    );
  });
});

describe('wizard: movement keys', () => {
  it('down and j step through components; up and k step back', async () => {
    const down = await runWizard([...Array(5).fill('\x1b[B')]);
    expect(focusedComponents(down.recorded.specs).slice(-1)).toEqual([
      'status',
    ]);

    const j = await runWizard([...Array(5).fill('j')]);
    expect(focusedComponents(j.recorded.specs).slice(-1)).toEqual(['status']);

    const up = await runWizard(['\x1b[B', '\x1b[B', '\x1b[A']);
    expect(focusedComponents(up.recorded.specs).slice(-1)).toEqual(['effort']);

    const k = await runWizard(['\x1b[B', 'k']);
    expect(focusedComponents(k.recorded.specs).slice(-1)).toEqual(['model']);
  });

  it('wraps in both directions', async () => {
    const off = await runWizard(['\x1b[A']);
    expect(focusedComponents(off.recorded.specs).slice(-1)).toEqual(['style']);

    const on = await runWizard([...Array(16).fill('j')]);
    expect(focusedComponents(on.recorded.specs).slice(-1)).toEqual(['model']);
  });
});

describe('wizard: alternative cycling', () => {
  it('right and l advance; left and h go back', async () => {
    const right = await runWizard(['\x1b[C']);
    expect(lastLine(right.recorded.specs).args).toContain('model=block');

    const l = await runWizard(['l']);
    expect(lastLine(l.recorded.specs).args).toContain('model=block');

    const left = await runWizard(['\x1b[C', '\x1b[D']);
    expect(lastLine(left.recorded.specs).args).toContain('model=plain');

    const h = await runWizard(['h']);
    expect(lastLine(h.recorded.specs).args).toContain('model=zen');
  });

  it('s hides a component that offers none', async () => {
    const toCost = [...Array(11).fill('j'), 's'];
    const hidden = await runWizard(toCost);
    expect(lastLine(hidden.recorded.specs).args).toContain('cost=none');
  });

  it('s is inert on a component with no none alternative', async () => {
    const inert = await runWizard(['s']);
    expect(lastLine(inert.recorded.specs).args).toContain('model=plain');
    expect(lastLine(inert.recorded.specs).args).not.toContain('model=none');
  });
});

describe('wizard: width preview', () => {
  // COLUMNS is the only width channel and the rungs themselves land in unit 8
  // — these pins hold the pass-through mechanics, never wrapped bytes.
  it('starts previews at 80 columns', async () => {
    const { recorded } = await runWizard(['\x1b[B']);
    expect(lastLine(recorded.specs).env.COLUMNS).toBe('80');
  });

  it('w steps 80 to 120 to 200 and wraps back to 80', async () => {
    const one = await runWizard(['w']);
    expect(lastLine(one.recorded.specs).env.COLUMNS).toBe('120');

    const two = await runWizard(['w', 'w']);
    expect(lastLine(two.recorded.specs).env.COLUMNS).toBe('200');

    const three = await runWizard(['w', 'w', 'w']);
    const widths = lineSpecs(three.recorded.specs).map(
      spec => spec.env.COLUMNS,
    );
    const rungs = widths.filter((width, at) => width !== widths[at - 1]);
    expect(rungs).toEqual(['80', '120', '200', '80']);
  });
});

describe('wizard: end-to-end walk', () => {
  it('writes byte-pinned picks and the next paint honors them', async () => {
    const home = homes.newHome();
    writeTrampoline(home, `${TRAMPOLINE_MARKER}\nstale body\n`);

    const keys = [
      '\x1b[C',
      ...Array(5).fill('\x1b[B'),
      ...Array(6).fill('j'),
      's',
      '\r',
    ];
    const { outcome, recorded } = await runWizard(keys, home);

    expect(outcome).toBe('saved');
    expect(readFileSync(join(home, PICKS_PATH), 'utf8')).toBe(WALK_PICKS);
    expect(lastLine(recorded.specs).args).toEqual(WALK_ARGS);
    expect(recorded.frames.some(frame => frame.includes(OFFER))).toBe(false);
    expect(Object.keys(snapshotTree(home)).sort()).toEqual([
      '.claude/plugins/data/statusline-agentic/picks',
      '.claude/statusline-command.sh',
    ]);

    const demo = createDemoHome();
    try {
      const picked = renderStatusline({
        payload: 'p1',
        home,
        repoDir: demo.repoDir,
      });
      expect(picked.status).toBe(0);
      expect(picked.stderr).toBe('');
      expect(picked.stdout.toString('utf8')).toContain('Opus');
      expect(picked.stdout.toString('utf8')).toContain('\u001b[48;5;61m');
      expect(picked.stdout.toString('utf8')).not.toContain('$3.87');

      const control = renderStatusline({
        payload: 'p1',
        home: homes.newHome(),
        repoDir: demo.repoDir,
      });
      expect(control.stdout.toString('utf8')).toContain('$3.87');
      expect(control.stdout.equals(picked.stdout)).toBe(false);
    } finally {
      rmSync(demo.home, { recursive: true, force: true });
    }
  });
});

describe('wizard: cancel', () => {
  it('q mid-walk writes nothing', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard(['\x1b[C', 'q'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(join(home, PICKS_PATH))).toBe(false);
  });

  it('Ctrl-C (\\x03) behaves like q', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard(['\x03'], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(join(home, PICKS_PATH))).toBe(false);
  });

  it('a closed key stream cancels — the adapter owning the TTY died', async () => {
    const home = homes.newHome();
    const { outcome } = await runWizard([], home);

    expect(outcome).toBe('cancelled');
    expect(existsSync(join(home, PICKS_PATH))).toBe(false);
  });

  it('leaves a pre-existing picks file byte-untouched after draft edits', async () => {
    const home = homes.newHome();
    const picksFile = join(home, PICKS_PATH);
    mkdirSync(dirname(picksFile), { recursive: true });
    const dotted = DEFAULT_PICKS.replace('style=plain', 'style=dots');
    writeFileSync(picksFile, dotted);

    const { outcome } = await runWizard(
      ['\x1b[C', ...Array(11).fill('j'), 's', 'q'],
      home,
    );

    expect(outcome).toBe('cancelled');
    expect(readFileSync(picksFile, 'utf8')).toBe(dotted);
  });
});

describe('wizard: preview honesty', () => {
  it('the live initial preview equals a bare runtime spawn under the same env', async () => {
    const home = homes.newHome();
    const { recorded } = await runWizard(['\x1b[B'], home);

    const spec = lastLine(recorded.specs);
    const rendered = runtimeRenderer(spec);
    expect(rendered).toContain('Opus');

    const manual = spawnSync('bash', [RUNTIME_COPY_BIN], {
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

describe('wizard: apply offer', () => {
  it('offers apply when no trampoline exists; y installs it', async () => {
    const home = homes.newHome();
    const { outcome, recorded } = await runWizard(['\r', 'y'], home);

    expect(outcome).toBe('saved');
    expect(readFileSync(join(home, PICKS_PATH), 'utf8')).toBe(DEFAULT_PICKS);
    expect(recorded.frames.some(frame => frame.includes(OFFER))).toBe(true);

    const trampoline = readFileSync(trampolinePath(home), 'utf8');
    expect(trampoline.split('\n')[0]).toBe(TRAMPOLINE_MARKER);
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8')) as {
      statusLine: { command: string };
      subagentStatusLine: { command: string };
    };
    expect(settings.statusLine.command).toBe(TRAMPOLINE_COMMAND);
    expect(settings.subagentStatusLine.command).toBe(TRAMPOLINE_COMMAND);
  });

  it('y on a refused key reports the refusal — never a both-live claim', async () => {
    const home = homes.newHome();
    writeSettings(
      home,
      '{"statusLine":{"type":"command","command":"./old.sh"}}',
    );
    const { outcome, recorded } = await runWizard(['\r', 'y'], home);

    expect(outcome).toBe('saved');
    expect(readFileSync(join(home, PICKS_PATH), 'utf8')).toBe(DEFAULT_PICKS);
    const settings = JSON.parse(readFileSync(settingsPath(home), 'utf8')) as {
      statusLine: { command: string };
    };
    expect(settings.statusLine.command).toBe('./old.sh');

    const last = recorded.frames[recorded.frames.length - 1] ?? '';
    expect(last).toContain('refused');
    expect(last).toContain('statusLine');
    expect(last).not.toContain('both lines go live');

    const clean = await runWizard(['\r', 'y']);
    const cleanLast =
      clean.recorded.frames[clean.recorded.frames.length - 1] ?? '';
    expect(cleanLast).toContain('applied');
    expect(cleanLast).not.toContain('refused');
  });

  it('n skips apply — no trampoline, no settings touch', async () => {
    const home = homes.newHome();
    const { outcome, recorded } = await runWizard(['\r', 'n'], home);

    expect(outcome).toBe('saved');
    expect(recorded.frames.some(frame => frame.includes(OFFER))).toBe(true);
    expect(existsSync(trampolinePath(home))).toBe(false);
    expect(existsSync(settingsPath(home))).toBe(false);
    expect(readFileSync(join(home, PICKS_PATH), 'utf8')).toBe(DEFAULT_PICKS);
  });

  it('a present trampoline suppresses the offer; foreign bytes stay put', async () => {
    const home = homes.newHome();
    const foreign = '#!/bin/sh\necho live main line\n';
    const foreignSettings =
      '{"statusLine":{"type":"command","command":"./old.sh"}}';
    writeTrampoline(home, foreign);
    writeSettings(home, foreignSettings);

    const { outcome, recorded } = await runWizard(['\r'], home);

    expect(outcome).toBe('saved');
    expect(recorded.frames.some(frame => frame.includes(OFFER))).toBe(false);
    expect(readFileSync(trampolinePath(home), 'utf8')).toBe(foreign);
    expect(readFileSync(settingsPath(home), 'utf8')).toBe(foreignSettings);
    expect(readFileSync(join(home, PICKS_PATH), 'utf8')).toBe(DEFAULT_PICKS);
  });
});
