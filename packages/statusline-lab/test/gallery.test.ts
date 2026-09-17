import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { render, toHtml } from '../src/ansi.js';
import { materializeDemoRepo } from '../src/demo-repo.js';
import { buildGallery, GALLERY_NOW, reanchorPayload } from '../src/gallery.js';

const RUNTIME_ROOT = fileURLToPath(
  new URL('../assets/runtime', import.meta.url),
);
const RUNTIME_BIN = join(RUNTIME_ROOT, 'bin', 'statusline.sh');
const SUBAGENT_BIN = join(RUNTIME_ROOT, 'bin', 'subagent.sh');
const COMPONENTS_DIR = join(RUNTIME_ROOT, 'components');
const LIB_SH = join(RUNTIME_ROOT, 'bin', 'lib.sh');
const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICK = fileURLToPath(
  new URL('../assets/ticks/multi.json', import.meta.url),
);

const SUBAGENT_WIDTHS = [80, 40];

type Loose = { [key: string]: unknown };

interface DemoHome {
  readonly home: string;
  readonly repoDir: string;
}

interface Declaration {
  readonly alts: readonly string[];
  readonly pair: readonly [string, string] | undefined;
}

interface Block {
  readonly label: string;
  readonly block: string;
}

// Header grammar under test: a leading '#' comment block where one line
// declares `alternatives: a (current) | b | c` and an optional later line
// `payloads: p4 p1` overrides the ("p1", "p3") default pair.
function parseDeclarations(): Map<string, Declaration> {
  const declared = new Map<string, Declaration>();
  for (const file of readdirSync(COMPONENTS_DIR).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    let alts: string[] | undefined;
    let pair: [string, string] | undefined;
    for (const line of readFileSync(join(COMPONENTS_DIR, file), 'utf8').split(
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
        pair = [pairMatch[1], pairMatch[2]];
      }
    }
    declared.set(file.slice(0, -'.sh'.length), { alts: alts ?? [], pair });
  }
  return declared;
}

let declaredCache: Map<string, Declaration> | undefined;

function declared(): Map<string, Declaration> {
  declaredCache ??= parseDeclarations();
  return declaredCache;
}

function parseDefaults(): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const [, comp, alt] of readFileSync(LIB_SH, 'utf8').matchAll(
    /([a-z]+)\) echo ([a-z]+) ;;/g,
  )) {
    defaults.set(comp, alt);
  }
  return defaults;
}

function runtimeHas(comp: string, alt: string): boolean {
  const body = readFileSync(join(COMPONENTS_DIR, `${comp}.sh`), 'utf8');
  return new RegExp(`(^|\\n)\\s*seg_${comp}_${alt}\\s*\\(`).test(body);
}

function blocksOf(page: string): Block[] {
  const hits = [...page.matchAll(/<div class="label">([^<]*)<\/div>/g)];
  return hits.map((hit, i) => ({
    label: hit[1] ?? '',
    block: page.slice(
      hit.index ?? 0,
      i + 1 < hits.length ? (hits[i + 1].index ?? page.length) : page.length,
    ),
  }));
}

function bare(label: string): string {
  const cut = label.indexOf(' ·');
  return cut === -1 ? label : label.slice(0, cut);
}

function termBox(rows: readonly string[]): string {
  return `<div class="term">${render(rows.join('\n'))}</div>`;
}

function loadPayload(name: string): Loose {
  return JSON.parse(
    readFileSync(join(PAYLOADS_DIR, `${name}.json`), 'utf8'),
  ) as Loose;
}

function createDemoHome(): DemoHome {
  const home = mkdtempSync(join(tmpdir(), 'statusline-gallery-'));
  return { home, repoDir: materializeDemoRepo(home) };
}

function anchoredStdin(name: string, repoDir: string): string {
  const anchored = reanchorPayload(
    name,
    loadPayload(name),
    GALLERY_NOW,
  ) as Loose;
  (anchored.workspace as { current_dir: string }).current_dir = repoDir;
  return `${JSON.stringify(anchored, null, 2)}\n`;
}

function spawnRuntime(
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
    throw new Error(
      `${bin} ${args.join(' ')}: ${(run.stderr ?? Buffer.alloc(0)).toString('utf8')}`,
    );
  }
  return (run.stdout ?? Buffer.alloc(0)).toString('utf8');
}

const rowCache = new Map<string, string>();

function soloRow(
  comp: string,
  alt: string,
  payload: string,
  demo: DemoHome,
): string {
  const key = `${comp}|${alt}|${payload}`;
  const hit = rowCache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const row = spawnRuntime(
    RUNTIME_BIN,
    ['--seg', `${comp}=${alt}`],
    anchoredStdin(payload, demo.repoDir),
    demo.home,
  ).replace(/\n+$/, '');
  rowCache.set(key, row);
  return row;
}

function subagentRows(columns: number, demo: DemoHome): string {
  const tick = JSON.parse(readFileSync(TICK, 'utf8')) as { columns: number };
  tick.columns = columns;
  return spawnRuntime(
    SUBAGENT_BIN,
    [],
    `${JSON.stringify(tick, null, 2)}\n`,
    demo.home,
  )
    .split('\n')
    .filter(line => line !== '')
    .map(line => (JSON.parse(line) as { content: string }).content)
    .join('\n');
}

function discriminatingAlt(
  comp: string,
  a: string,
  b: string,
  demo: DemoHome,
): { readonly rowA: string; readonly rowB: string } | undefined {
  for (const alt of declared().get(comp)?.alts ?? []) {
    if (!runtimeHas(comp, alt)) {
      continue;
    }
    const rowA = soloRow(comp, alt, a, demo);
    const rowB = soloRow(comp, alt, b, demo);
    if (rowA !== rowB && (rowA !== '' || rowB !== '')) {
      return { rowA, rowB };
    }
  }
  return undefined;
}

let page = '';
let demo: DemoHome | undefined;

beforeAll(() => {
  demo = createDemoHome();
  page = buildGallery();
}, 300_000);

afterAll(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
  }
});

describe('gallery', () => {
  it('renders one labelled block per alternative declared in the runtime headers', () => {
    const map = declared();
    expect(map.size).toBe(16);
    const expected: string[] = [];
    for (const [comp, declaration] of map) {
      expect(declaration.alts.length, comp).toBeGreaterThan(0);
      for (const alt of declaration.alts) {
        expected.push(`${comp}=${alt}`);
      }
    }
    const labels = blocksOf(page).map(block => bare(block.label));
    expect(labels.filter(label => expected.includes(label)).sort()).toEqual(
      [...expected].sort(),
    );
    for (const label of expected) {
      expect(
        labels.filter(seen => seen === label),
        label,
      ).toHaveLength(1);
    }
  });

  it('marks exactly the shipped default alternative as live', () => {
    const defaults = parseDefaults();
    for (const comp of declared().keys()) {
      expect(defaults.has(comp), comp).toBe(true);
    }
    const marked = blocksOf(page).filter(
      block => block.label !== bare(block.label),
    );
    for (const comp of declared().keys()) {
      const live = marked
        .filter(block => bare(block.label).startsWith(`${comp}=`))
        .map(block => bare(block.label));
      expect(live, comp).toEqual([`${comp}=${defaults.get(comp)}`]);
    }
  });

  it('marks the declared-but-unimplemented variants not-adoptable', () => {
    const missing: string[] = [];
    for (const [comp, declaration] of declared()) {
      for (const alt of declaration.alts) {
        if (!runtimeHas(comp, alt)) {
          missing.push(`${comp}=${alt}`);
        }
      }
    }
    expect([...missing].sort()).toEqual([
      'bar=gauge',
      'cache=fuse',
      'rate=strip',
    ]);
    for (const block of blocksOf(page)) {
      expect(block.block.includes('not-adoptable'), block.label).toBe(
        missing.includes(bare(block.label)),
      );
      if (missing.includes(bare(block.label))) {
        expect(block.block, block.label).toContain('<div class="line">');
      }
    }
  });

  it('embeds the converted markup of a real solo render', () => {
    const model = blocksOf(page).find(
      block => bare(block.label) === 'model=block',
    );
    expect(model).toBeDefined();
    const modelRow = soloRow('model', 'block', 'p1', demo!);
    expect(modelRow).not.toBe('');
    expect(model!.block).toContain(
      `<div class="line">${toHtml(modelRow)}</div>`,
    );

    const tokens = blocksOf(page).find(
      block => bare(block.label) === 'tokens=full',
    );
    expect(tokens).toBeDefined();
    const tokensRow = soloRow('tokens', 'full', 'p3', demo!);
    expect(tokensRow).not.toBe('');
    expect(tokens!.block).toContain(
      `<div class="line">${toHtml(tokensRow)}</div>`,
    );
  });

  it('renders the header-declared payload pair, defaulting to p1/p3', () => {
    const annotated = [...declared()].filter(([, d]) => d.pair !== undefined);
    expect(annotated.length).toBeGreaterThan(0);
    for (const [comp, declaration] of annotated) {
      const [a, b] = declaration.pair as [string, string];
      const witness = discriminatingAlt(comp, a, b, demo!);
      expect(witness, comp).toBeDefined();
      expect(page, comp).toContain(termBox([witness!.rowA, witness!.rowB]));
      if (a !== 'p1' || b !== 'p3') {
        const stray = discriminatingAlt(comp, 'p1', 'p3', demo!);
        if (stray !== undefined) {
          expect(page, comp).not.toContain(termBox([stray.rowA, stray.rowB]));
        }
      }
    }
    const plain = [...declared()]
      .filter(([, d]) => d.pair === undefined)
      .map(([comp]) => comp)
      .map(comp => ({
        comp,
        witness: discriminatingAlt(comp, 'p1', 'p3', demo!),
      }))
      .find(entry => entry.witness !== undefined);
    expect(plain).toBeDefined();
    expect(page).toContain(
      termBox([plain!.witness!.rowA, plain!.witness!.rowB]),
    );
  });

  it('is byte-identical across runs and writes nothing under assets', () => {
    const p1Before = readFileSync(join(PAYLOADS_DIR, 'p1.json'));
    const first = buildGallery();
    const second = buildGallery();
    expect(second).toBe(first);
    expect(first, 'temp demo-repo path leaked').not.toContain(
      `${tmpdir()}${sep}`,
    );
    expect(first, 'owner home leaked').not.toContain(homedir());
    expect(readFileSync(join(PAYLOADS_DIR, 'p1.json'))).toEqual(p1Before);
  }, 300_000);

  it('is blind to picks and payloads planted under $HOME', () => {
    const planted = mkdtempSync(join(tmpdir(), 'statusline-blind-'));
    const dataDir = join(
      planted,
      '.claude',
      'plugins',
      'data',
      'statusline-agentic',
    );
    mkdirSync(join(dataDir, 'payloads'), { recursive: true });
    writeFileSync(join(dataDir, 'picks'), 'model=pill\nstyle=dots\n');
    writeFileSync(
      join(dataDir, 'payloads', 'latest.json'),
      '{"poison":true}\n',
    );
    const real = process.env.HOME;
    process.env.HOME = planted;
    try {
      expect(buildGallery()).toBe(page);
    } finally {
      process.env.HOME = real;
      rmSync(planted, { recursive: true, force: true });
    }
  }, 300_000);

  it('embeds subagent rows rendered at two widths', () => {
    for (const columns of SUBAGENT_WIDTHS) {
      const rows = subagentRows(columns, demo!);
      expect(rows).not.toBe('');
      expect(page, String(columns)).toContain(
        `<div class="term">${render(rows)}</div>`,
      );
    }
  });
});

describe('reanchorPayload', () => {
  const NOW = 1_788_800_000;

  it('re-anchors warm cache and rate resets to the render epoch', () => {
    const p1 = reanchorPayload('p1', loadPayload('p1'), NOW) as {
      prompt_cache: { expires_at: number; last_miss_at: number };
      rate_limits: Record<string, { resets_at: number }>;
    };
    expect(p1.prompt_cache.expires_at).toBe(NOW + 1920);
    expect(p1.prompt_cache.last_miss_at).toBe(NOW + 1920 - 3900);
    expect(p1.rate_limits.five_hour.resets_at).toBe(NOW + 13830);
    expect(p1.rate_limits.seven_day.resets_at).toBe(NOW + 518400);
    expect(p1.rate_limits.spend_limit.resets_at).toBe(NOW + 950400);

    const p2 = reanchorPayload('p2', loadPayload('p2'), NOW) as {
      prompt_cache: { expires_at: number };
      rate_limits: Record<string, { resets_at: number }>;
    };
    expect(p2.prompt_cache.expires_at).toBe(NOW + 2400);
    expect(p2.rate_limits.five_hour.resets_at).toBe(NOW + 16170);
    expect(p2.rate_limits.seven_day.resets_at).toBe(NOW + 570000);
  });

  it('re-anchors cold caches without inventing a last-miss', () => {
    const p3 = reanchorPayload('p3', loadPayload('p3'), NOW) as {
      prompt_cache: { expires_at: number };
      rate_limits: Record<string, { resets_at: number }>;
    };
    expect(p3.prompt_cache.expires_at).toBe(NOW - 10);
    expect(p3.prompt_cache).not.toHaveProperty('last_miss_at');
    expect(p3.rate_limits.five_hour.resets_at).toBe(NOW + 2090);
    expect(p3.rate_limits.seven_day.resets_at).toBe(NOW + 290000);
  });

  it('re-anchors only the keys the table names', () => {
    const raw = loadPayload('p4') as {
      rate_limits: Record<string, { resets_at: number }>;
    };
    const p4 = reanchorPayload('p4', loadPayload('p4'), NOW) as {
      prompt_cache: { expires_at: number };
      rate_limits: Record<string, { resets_at: number }>;
    };
    expect(p4.prompt_cache.expires_at).toBe(NOW + 600);
    expect(p4.rate_limits.five_hour.resets_at).toBe(NOW + 15000);
    expect(p4.rate_limits.seven_day.resets_at).toBe(NOW + 540000);
    expect(p4.rate_limits.spend_limit.resets_at).toBe(
      raw.rate_limits.spend_limit.resets_at,
    );
  });
});
