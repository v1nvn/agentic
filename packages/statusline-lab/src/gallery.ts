import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PayloadName } from './payloads.js';

import { render } from './ansi.js';
import { materializeDemoRepo } from './demo-repo.js';

export const GALLERY_NOW = 1788870000;

const RUNTIME_ROOT = fileURLToPath(
  new URL('../assets/runtime', import.meta.url),
);
const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));
const FONT_FILE = fileURLToPath(
  new URL('../assets/fonts/FiraCodeNerdFont-Regular.ttf', import.meta.url),
);
const SUBAGENT_WIDTHS: readonly number[] = [80, 40];

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

export function reanchorPayload(
  name: string,
  payload: Loose,
  now: number,
): Loose {
  const anchored = structuredClone(payload);
  const key = name as PayloadName;
  const cache = anchored.prompt_cache;
  if (isObject(cache)) {
    const warmIn = WARM_IN[key];
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
    for (const [limitKey, offset] of Object.entries(RESETS_IN[key])) {
      const limit = limits[limitKey];
      if (isObject(limit)) {
        limit.resets_at = now + offset;
      }
    }
  }
  return anchored;
}

export interface ComponentDeclaration {
  readonly alts: readonly string[];
  readonly pair: readonly [PayloadName, PayloadName];
}

export function readDeclarations(
  componentsDir: string,
): Map<string, ComponentDeclaration> {
  const declared = new Map<string, ComponentDeclaration>();
  for (const file of readdirSync(componentsDir).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    let alts: string[] | undefined;
    let pair: [PayloadName, PayloadName] | undefined;
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
      const pairMatch = /^#\s*payloads:\s*(p[1-4])\s+(p[1-4])\s*$/.exec(line);
      if (pairMatch) {
        pair = [pairMatch[1] as PayloadName, pairMatch[2] as PayloadName];
      }
    }
    declared.set(file.slice(0, -'.sh'.length), {
      alts: alts ?? [],
      pair: pair ?? ['p1', 'p3'],
    });
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

// A fixture payload is static JSON; previews need it anchored to a render
// moment (cache countdown, rate resets) and pointed at a live demo repo so
// the git segments have something to read.
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

function runScript(
  bin: string,
  args: readonly string[],
  stdin: string,
  home: string,
): string {
  const run = spawnSync('bash', [bin, ...args], {
    input: stdin,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: home,
      NOW: String(GALLERY_NOW),
      LC_ALL: 'C',
      TZ: 'UTC',
    },
    timeout: 30_000,
  });
  if (run.status !== 0) {
    throw new Error(`${bin} ${args.join(' ')}: ${run.stderr.toString('utf8')}`);
  }
  return run.stdout.toString('utf8');
}

function subagentRows(columns: number, home: string): string {
  const tick = JSON.parse(
    readFileSync(join(TICKS_DIR, 'multi.json'), 'utf8'),
  ) as { columns: number };
  tick.columns = columns;
  return runScript(
    join(RUNTIME_ROOT, 'bin', 'subagent.sh'),
    [],
    `${JSON.stringify(tick, null, 2)}\n`,
    home,
  )
    .split('\n')
    .filter(line => line !== '')
    .map(line => (JSON.parse(line) as { content: string }).content)
    .join('\n');
}

const CSS = `
*{margin:0;box-sizing:border-box}
body{background:#0b0c10;color:#abb2bf;padding:34px 40px 60px;
  font-family:'NerdLab','FiraCode Nerd Font Mono','FiraCode Nerd Font','JetBrains Mono',monospace;font-size:14px}
h1{font-size:15px;font-weight:600;color:#dcdfe4;letter-spacing:.06em;margin-bottom:4px}
.sub{font-size:11px;color:#5c6370;margin-bottom:26px;letter-spacing:.04em}
nav{position:sticky;top:0;z-index:2;background:#0b0c10;padding:12px 0 10px;margin-bottom:10px;
  border-bottom:1px solid #1c1f27;display:flex;flex-wrap:wrap;gap:6px 18px}
nav a{font-size:11px;color:#7a8199;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;white-space:nowrap}
nav a:hover{color:#dcdfe4}
section{margin-bottom:40px;scroll-margin-top:56px}
h2{font-size:13px;font-weight:600;color:#c5cadb;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.label{font-size:11px;color:#7a8199;letter-spacing:.14em;text-transform:uppercase;margin:20px 0 7px}
.term{background:#121317;border:1px solid #23262f;border-radius:9px;padding:11px 16px;
  line-height:1.55;white-space:pre;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.35);min-height:52px}
.line{white-space:pre}
`;

function fontFace(): string {
  const ttf = readFileSync(FONT_FILE).toString('base64');
  return `@font-face{font-family:'NerdLab';src:url(data:font/ttf;base64,${ttf}) format('truetype')}`;
}

export function buildGallery(): string {
  const home = mkdtempSync(join(tmpdir(), 'statusline-gallery-'));
  try {
    const repoDir = materializeDemoRepo(home);
    const componentsDir = join(RUNTIME_ROOT, 'components');
    const declared = readDeclarations(componentsDir);
    const defaults = readDefaults(join(RUNTIME_ROOT, 'bin', 'lib.sh'));
    const body: string[] = [
      '<h1>statusline lab · components</h1>',
      '<div class="sub">every alternative of every component, rendered on its own — ' +
        'two payload rows per box (p1 / p3 unless the component header names its ' +
        'pair); empty rows mean the payload lacks that data. the suffix ' +
        "'live line uses this' marks the shipped default; name what you want and " +
        'it becomes the pick</div>',
      `<nav>${[...declared.keys()].map(name => `<a href="#c${name}">${name}</a>`).join('')}<a href="#csubagent">subagent</a></nav>`,
    ];
    for (const [comp, declaration] of declared) {
      body.push(
        `<section id="c${comp}"><h2>${comp}</h2><div class="sub">components/${comp}.sh</div>`,
      );
      for (const alt of declaration.alts) {
        const rows = declaration.pair
          .map(payload =>
            runScript(
              join(RUNTIME_ROOT, 'bin', 'statusline.sh'),
              ['--seg', `${comp}=${alt}`],
              fixtureStdin(payload, repoDir, GALLERY_NOW),
              home,
            ),
          )
          .map(row => row.replace(/\n+$/, ''))
          .join('\n');
        const live = defaults.get(comp) === alt ? ' · live line uses this' : '';
        body.push(
          `<div class="label">${comp}=${alt}${live}</div><div class="term">${render(rows)}</div>`,
        );
      }
      body.push('</section>');
    }
    body.push(
      '<section id="csubagent"><h2>subagent rows</h2>',
      '<div class="sub">whole rows from bin/subagent.sh — the layout is fixed, the detail rungs flex with the width</div>',
    );
    for (const columns of SUBAGENT_WIDTHS) {
      body.push(`<div class="sub">${columns} columns</div>`);
      body.push(
        `<div class="term">${render(subagentRows(columns, home))}</div>`,
      );
    }
    body.push('</section>');
    return `<!doctype html><html><head><meta charset='utf-8'><title>statusline lab</title><style>${fontFace()}${CSS}</style></head><body>${body.join('')}</body></html>`;
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
