import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
const PANEL_BIN = join(RUNTIME_ROOT, 'bin', 'subagent.sh');
const COMPONENTS_DIR = join(RUNTIME_ROOT, 'components');
const LIB_SH = join(RUNTIME_ROOT, 'bin', 'lib.sh');
const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
const TRAMPOLINE_REL = join('.claude', 'statusline-command.sh');
const WIDTHS: readonly number[] = [80, 120, 200];
const PANEL_AGE_S = 1800;
const APPLY_OFFER = 'apply now? [y/n]';
const KEYMAP =
  'j/k move · h/l design · s none · w width · enter save · q cancel';

export function readDeclarations(
  componentsDir: string,
): Map<string, readonly string[]> {
  const declared = new Map<string, readonly string[]>();
  for (const file of readdirSync(componentsDir).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    let alts: readonly string[] | undefined;
    for (const line of readFileSync(join(componentsDir, file), 'utf8').split(
      '\n',
    )) {
      if (!line.startsWith('#')) {
        break;
      }
      const altMatch = /alternatives:\s*(.+)$/.exec(line);
      if (altMatch) {
        alts = altMatch[1]
          .split('|')
          .map(alt => alt.trim().replace(/\s*\(current\)$/, ''));
      }
    }
    declared.set(file.slice(0, -'.sh'.length), alts ?? []);
  }
  return declared;
}

export function readDefaults(lib: string): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const [, comp, alt] of readFileSync(lib, 'utf8').matchAll(
    /([a-z]+)\) echo ([a-z]+) ;;/g,
  )) {
    defaults.set(comp, alt);
  }
  return defaults;
}

export function wizardComponents(): readonly WizardComponent[] {
  const declared = readDeclarations(COMPONENTS_DIR);
  const match = /^COMPS="(.+)"$/m.exec(readFileSync(RUNTIME_BIN, 'utf8'));
  if (match === null) {
    throw new Error('bin/statusline.sh declares no COMPS order');
  }
  return match[1].split(' ').map(component => ({
    component,
    alternatives: declared.get(component) ?? [],
  }));
}

export function designsCatalog({ home }: { home: string }): string {
  const offered = wizardComponents();
  const current = selectionsWithPicks(home, offered);
  return offered
    .map(
      (entry, at) =>
        `${entry.component}: ${entry.alternatives
          .map(alt => (alt === current[at] ? `${alt}*` : alt))
          .join(' | ')}`,
    )
    .join('\n');
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

type Loose = Record<string, unknown>;

const WARM_IN: Readonly<Record<PayloadName, number | undefined>> = {
  p1: 1920,
  p2: 2400,
  p3: undefined,
  p4: 600,
};
const RESETS_IN: Readonly<
  Record<PayloadName, Readonly<Record<string, number>>>
> = {
  p1: { five_hour: 13830, seven_day: 518400, spend_limit: 950400 },
  p2: { five_hour: 16170, seven_day: 570000 },
  p3: { five_hour: 2090, seven_day: 290000 },
  p4: { five_hour: 15000, seven_day: 540000 },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function reanchorPayload(
  name: PayloadName,
  payload: Loose,
  now: number,
): Loose {
  const anchored = structuredClone(payload);
  const cache = anchored.prompt_cache;
  if (isObject(cache)) {
    const warmIn = WARM_IN[name];
    if (cache.warm === true && warmIn !== undefined) {
      cache.expires_at = now + warmIn;
      cache.last_miss_at = now + warmIn - 3900;
    } else {
      cache.expires_at = now - 10;
      delete cache.last_miss_at;
    }
  }
  const limits = anchored.rate_limits;
  if (isObject(limits)) {
    for (const [limitKey, offset] of Object.entries(RESETS_IN[name])) {
      const limit = limits[limitKey];
      if (isObject(limit)) {
        limit.resets_at = now + offset;
      }
    }
  }
  return anchored;
}

export function fixtureStdin(
  name: PayloadName,
  repoDir: string,
  now: number,
): string {
  const payload = JSON.parse(
    readFileSync(join(PAYLOADS_DIR, `${name}.json`), 'utf8'),
  ) as Loose;
  const anchored = reanchorPayload(name, payload, now);
  (anchored.workspace as { current_dir: string }).current_dir = repoDir;
  return `${JSON.stringify(anchored, null, 2)}\n`;
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

// subagent.sh reads startTime in seconds and divides anything above 2e11 by
// 1000 (a millisecond value); anchoring works on the scale the renderer sees.
function startSeconds(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value > 200_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
}

// The shipped tick is anchored to the render moment — its first row is
// PANEL_AGE_S old — so demo durations never go stale with the fixture.
function demoPanelTick(now: number): Loose {
  const tick = JSON.parse(
    readFileSync(join(TICKS_DIR, 'multi.json'), 'utf8'),
  ) as Loose;
  const tasks = (Array.isArray(tick.tasks) ? tick.tasks : []) as Loose[];
  const anchor = startSeconds(tasks[0]?.startTime);
  const shift = anchor === undefined ? 0 : now - PANEL_AGE_S - anchor;
  return {
    ...tick,
    tasks: tasks.map(task => {
      const start = startSeconds(task.startTime);
      return start === undefined ? task : { ...task, startTime: start + shift };
    }),
  };
}

// subagent.sh answers with one {"id","content"} JSON line per task; the frame
// carries the first row's content.
function firstPanelRow(output: string): string {
  const [row] = output.split('\n');
  if (row === '') {
    return '';
  }
  const content = (JSON.parse(row) as { content?: unknown }).content;
  return typeof content === 'string' ? content : '';
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

function selectionsWithPicks(
  home: string,
  offered: readonly WizardComponent[],
): string[] {
  const defaults = readDefaults(LIB_SH);
  const current = offered.map(
    entry => defaults.get(entry.component) ?? entry.alternatives[0],
  );
  overlayPicks(join(home, DATA_DIR, 'picks'), offered, current);
  return current;
}

export async function createWizard(
  options: WizardOptions,
  deps: WizardDeps,
): Promise<WizardOutcome> {
  const offered = wizardComponents();
  const { cleanup, stdin } = previewStdin(options.payloadPath, options.now);
  try {
    const current = selectionsWithPicks(options.home, offered);
    const panelTick = demoPanelTick(Number(options.now));

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
      const panel = deps
        .preview({
          bin: PANEL_BIN,
          args: [],
          env: env(),
          stdin: `${JSON.stringify({ ...panelTick, columns: WIDTHS[widthAt] }, null, 2)}\n`,
        })
        .replace(/\n+$/, '');
      const rows = offered.map(
        (entry, at) =>
          `${at === focus ? '>' : ' '} ${entry.component.padEnd(9)} ${current[at]}`,
      );
      deps.render(
        [
          `statusline pick · ${WIDTHS[widthAt]} columns (w cycles) · ${basename(options.payloadPath)}`,
          '',
          `  ${line}`,
          `  panel ${firstPanelRow(panel)}`,
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
          'apply skipped — run it anytime: npx -y @v1nvn/statusline-lab apply\n',
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
