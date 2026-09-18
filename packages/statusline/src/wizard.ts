import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { apply } from './apply.js';
import { DATA_DIR } from './capture.js';
import { materializeDemoRepo } from './demo-repo.js';
import { fixtureStdin, readDeclarations, readDefaults } from './gallery.js';
import { PAYLOAD_NAMES, type PayloadName } from './payloads.js';

export interface WizardComponent {
  readonly alternatives: readonly string[];
  readonly component: string;
}

export type WizardPayloadSource = 'capture' | 'fixture' | 'path';

export interface WizardPayloadChoice {
  readonly path: string;
  readonly source: WizardPayloadSource;
}

export interface WizardPayloadInput {
  readonly home: string;
  readonly payload?: string;
}

export interface WizardRender {
  readonly args: readonly string[];
  readonly bin: string;
  readonly env: Readonly<Record<'COLUMNS' | 'HOME' | 'NOW', string>>;
  readonly stdin: string;
}

export interface WizardDeps {
  preview(spec: WizardRender): string;
  readKeys(): AsyncGenerator<string>;
  render(frame: string): void;
}

export type WizardOutcome = 'cancelled' | 'saved';

export interface WizardOptions {
  readonly home: string;
  readonly now: string;
  readonly payloadPath: string;
}

const RUNTIME_ROOT = fileURLToPath(
  new URL('../assets/runtime', import.meta.url),
);
const RUNTIME_BIN = join(RUNTIME_ROOT, 'bin', 'statusline.sh');
const COMPONENTS_DIR = join(RUNTIME_ROOT, 'components');
const LIB_SH = join(RUNTIME_ROOT, 'bin', 'lib.sh');
const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TRAMPOLINE_REL = join('.claude', 'statusline-command.sh');
const WIDTHS: readonly number[] = [80, 120, 200];
const APPLY_OFFER = 'apply now? [y/n]';
const KEYMAP =
  'j/k move · h/l design · s none · w width · enter save · q cancel';

export function wizardComponents(): readonly WizardComponent[] {
  const declared = readDeclarations(COMPONENTS_DIR);
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_BIN, 'utf8'));
  if (match === null) {
    throw new Error('bin/statusline.sh declares no COMPS order');
  }
  return match[1].split(' ').map(component => ({
    component,
    alternatives: declared.get(component)?.alts ?? [],
  }));
}

export function resolveWizardPayload({
  home,
  payload,
}: WizardPayloadInput): WizardPayloadChoice {
  if (payload !== undefined) {
    if ((PAYLOAD_NAMES as readonly string[]).includes(payload)) {
      return { path: join(PAYLOADS_DIR, `${payload}.json`), source: 'fixture' };
    }
    return { path: payload, source: 'path' };
  }
  const captured = join(home, DATA_DIR, 'payloads', 'latest.json');
  if (existsSync(captured)) {
    return { path: captured, source: 'capture' };
  }
  return { path: join(PAYLOADS_DIR, 'p1.json'), source: 'fixture' };
}

function fixtureNameOf(path: string): PayloadName | undefined {
  if (dirname(path) !== PAYLOADS_DIR) {
    return undefined;
  }
  const name = basename(path, '.json');
  return (PAYLOAD_NAMES as readonly string[]).includes(name)
    ? (name as PayloadName)
    : undefined;
}

// A capture or one-off file renders verbatim; a shipped fixture is anchored
// to the render moment and pointed at a freshly materialized demo repo so
// the git segments preview. The repo is torn down with the wizard.
function previewStdin(
  payloadPath: string,
  now: string,
): { cleanup: () => void; stdin: string } {
  const fixture = fixtureNameOf(payloadPath);
  if (fixture === undefined) {
    return {
      cleanup: () => undefined,
      stdin: readFileSync(payloadPath, 'utf8'),
    };
  }
  const demoHome = mkdtempSync(join(tmpdir(), 'statusline-wizard-'));
  return {
    cleanup: () => {
      rmSync(demoHome, { recursive: true, force: true });
    },
    stdin: fixtureStdin(fixture, materializeDemoRepo(demoHome), Number(now)),
  };
}

export function runtimeRenderer(spec: WizardRender): string {
  const run = spawnSync('bash', [spec.bin, ...spec.args], {
    input: spec.stdin,
    env: {
      PATH: process.env.PATH ?? '',
      ...spec.env,
      LC_ALL: 'C',
      TZ: 'UTC',
    },
    timeout: 30_000,
  });
  if (run.status !== 0) {
    throw new Error(`render failed: ${run.stderr.toString('utf8')}`);
  }
  const stdout = run.stdout.toString('utf8');
  const warn = run.stderr.toString('utf8').trim();
  return warn === '' ? stdout : `${stdout}${warn}\n`;
}

function overlayPicks(
  picksPath: string,
  offered: readonly WizardComponent[],
  current: string[],
): void {
  if (!existsSync(picksPath)) {
    return;
  }
  for (const line of readFileSync(picksPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const comp = line.slice(0, eq);
    const alt = line.slice(eq + 1);
    const at = offered.findIndex(entry => entry.component === comp);
    if (at >= 0 && offered[at].alternatives.includes(alt)) {
      current[at] = alt;
    }
  }
}

export async function createWizard(
  options: WizardOptions,
  deps: WizardDeps,
): Promise<WizardOutcome> {
  const offered = wizardComponents();
  const { cleanup, stdin } = previewStdin(options.payloadPath, options.now);
  try {
    const defaults = readDefaults(LIB_SH);
    const current: string[] = offered.map(
      entry => defaults.get(entry.component) ?? entry.alternatives[0],
    );
    overlayPicks(join(options.home, DATA_DIR, 'picks'), offered, current);

    let focus = 0;
    let widthAt = 0;

    function env(): WizardRender['env'] {
      return {
        COLUMNS: String(WIDTHS[widthAt]),
        HOME: options.home,
        NOW: options.now,
      };
    }

    function lineSpec(): WizardRender {
      return {
        bin: RUNTIME_BIN,
        args: offered.map((entry, at) => `${entry.component}=${current[at]}`),
        env: env(),
        stdin,
      };
    }

    function cycle(delta: number): void {
      const alts = offered[focus].alternatives;
      const at = alts.indexOf(current[focus]);
      current[focus] = alts[(at + delta + alts.length) % alts.length];
    }

    function step(key: string): void {
      if (key === '\x1b[B' || key === 'j') {
        focus = (focus + 1) % offered.length;
      } else if (key === '\x1b[A' || key === 'k') {
        focus = (focus + offered.length - 1) % offered.length;
      } else if (key === '\x1b[C' || key === 'l') {
        cycle(1);
      } else if (key === '\x1b[D' || key === 'h') {
        cycle(-1);
      } else if (key === 's') {
        if (offered[focus].alternatives.includes('none')) {
          current[focus] = 'none';
        }
      } else if (key === 'w') {
        widthAt = (widthAt + 1) % WIDTHS.length;
      }
    }

    function draw(): void {
      const focused = offered[focus];
      const samples = focused.alternatives.map(alt =>
        deps
          .preview({
            bin: RUNTIME_BIN,
            args: ['--seg', `${focused.component}=${alt}`],
            env: env(),
            stdin,
          })
          .replace(/\n+$/, ''),
      );
      const line = deps.preview(lineSpec()).replace(/\n+$/, '');
      const rows = offered.map(
        (entry, at) =>
          `${at === focus ? '>' : ' '} ${entry.component.padEnd(9)} ${current[at]}`,
      );
      deps.render(
        [
          `statusline pick · ${WIDTHS[widthAt]} columns (w cycles) · ${basename(options.payloadPath)}`,
          '',
          `  ${line}`,
          '',
          `${focused.component}: ${focused.alternatives.join(' | ')}`,
          ...focused.alternatives.map(
            (alt, at) =>
              `  ${alt === current[focus] ? '*' : ' '} ${samples[at]}`,
          ),
          '',
          ...rows,
          '',
          KEYMAP,
        ].join('\n'),
      );
    }

    async function finish(
      keys: AsyncGenerator<string>,
    ): Promise<WizardOutcome> {
      const picksPath = join(options.home, DATA_DIR, 'picks');
      mkdirSync(dirname(picksPath), { recursive: true });
      writeFileSync(
        picksPath,
        `${offered.map((entry, at) => `${entry.component}=${current[at]}`).join('\n')}\n`,
      );
      if (existsSync(join(options.home, TRAMPOLINE_REL))) {
        deps.render('picks saved — the next paint honors them\n');
        return 'saved';
      }
      deps.render(`picks saved\nno trampoline installed — ${APPLY_OFFER} `);
      const answer = await keys.next();
      if (answer.done || answer.value !== 'y') {
        deps.render(
          'apply skipped — run it anytime: npx -y @v1nvn/statusline apply\n',
        );
        return 'saved';
      }
      const { steps } = apply({ home: options.home });
      const refused = steps.filter(step => step.action === 'refuse');
      if (refused.length > 0) {
        const targets = refused.map(step => step.target).join(', ');
        deps.render(
          `apply: ${targets} refused (foreign) — rerun with apply --force to adopt\n`,
        );
        return 'saved';
      }
      deps.render('applied — live on the next paint\n');
      return 'saved';
    }

    const keys = deps.readKeys();
    draw();
    for await (const key of keys) {
      if (key === '\r') {
        return await finish(keys);
      }
      if (key === 'q' || key === '\x03') {
        break;
      }
      step(key);
      draw();
    }
    deps.render('cancelled — picks untouched\n');
    return 'cancelled';
  } finally {
    cleanup();
  }
}
