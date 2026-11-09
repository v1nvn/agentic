import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from '../src/cli.ts';
import { buildPage, loadPageFile, PAGE_FILE } from '../src/page.ts';

const EXAMPLE = fileURLToPath(
  new URL('../src/example.page.js', import.meta.url),
);

const PLAIN_PAGE = `var PAGE = {
  title: "One small ruling",
  rulings: {
    G1: {
      title: "Refuse to serve when the start check fails?",
      stake: "About 2 starts a month hide a doubted ledger behind a log line.",
      opts: [
        { k: "a", rec: true, t: "Refuse to serve" },
        { k: "b", today: true, t: "Keep serving" }
      ],
      rows: [
        { on: "stake", label: "A doubted ledger is seen", marks: { a: ["gain", "The on-call sees the exit."], b: ["cost", "A log line."] } },
        { on: "beyond", label: "Reads during a flaky check", marks: { a: ["cost", "They stop."], b: ["gain", "They continue."] } }
      ],
      why: "a, because <i>a doubted ledger is seen</i>; it pays in <i>reads during a flaky check</i>."
    },
    G2: { title: "Who restarts the daemon after a refusal?", after: "G1" }
  }
};`;

const RULED_PAGE = PLAIN_PAGE.replace(
  'G1: {\n      title',
  'G1: {\n      ruled: "a",\n      title',
).replace(
  'G2: { title: "Who restarts the daemon after a refusal?", after: "G1" }',
  `G2: {
      title: "Who restarts the daemon after a refusal?",
      after: "G1",
      stake: "Each refusal waits for a human; about 2 a month.",
      opts: [{ k: "a", rec: true, t: "The on-call" }, { k: "b", t: "A supervisor" }],
      rows: [{ on: "stake", label: "Time to serve again", marks: { a: ["cost", "Until paged."], b: ["gain", "Seconds."] } },
             { on: "beyond", label: "New moving parts", marks: { a: ["gain", "None."], b: ["cost", "A supervisor to run."] } }],
      why: "a, because <i>new moving parts</i>; it pays in <i>time to serve again</i>."
    }`,
);

const RED_PAGE = `var PAGE = {
  title: "A red page",
  rulings: { G1: { title: "t?", from: "abc123" } }
};`;

const open: string[] = [];
afterEach(() => {
  for (const d of open.splice(0)) rmSync(d, { recursive: true, force: true });
});
function pageDir(text: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rulings-r4-'));
  open.push(dir);
  writeFileSync(join(dir, PAGE_FILE), text);
  return dir;
}

function sectionOf(html: string, id: string): string {
  const at = html.indexOf(`<section class="ruling" id="r-${id}">`);
  return at < 0 ? '' : html.slice(at, html.indexOf('</section>', at));
}
function built(text: string): string {
  const dir = pageDir(text);
  expect(main([dir, '--no-open'])).toBe(0);
  return readFileSync(join(dir, 'index.html'), 'utf8');
}

describe('the emitted page', () => {
  it('pins the example full HTML', () => {
    expect(buildPage(loadPageFile(EXAMPLE))).toMatchSnapshot();
  });

  it('opens with the round map: what to rule now, then what waits on which pick', () => {
    const html = built(PLAIN_PAGE);
    const map = html.slice(
      html.indexOf('<nav class="map"'),
      html.indexOf('</nav>'),
    );
    expect(map).toContain(
      '<span class="lbl">Rule now</span><a class="chip live" href="#r-G1">',
    );
    expect(map).toContain(
      '<span class="lbl">After G1</span><span class="chip">',
    );
    expect(sectionOf(html, 'G2')).toBe('');
  });

  it('moves a ruled ruling into the Ruled lane with its pick, and writes no card for it', () => {
    const html = built(RULED_PAGE);
    expect(html).toContain(
      '<span class="lbl">Ruled</span><span class="chip"><span class="id">G1</span>',
    );
    expect(html).toContain('<span class="got">a, Refuse to serve</span>');
    expect(sectionOf(html, 'G1')).toBe('');
    expect(sectionOf(html, 'G2')).toContain('class="card"');
  });

  it('groups rows on the stake before rows beyond it, whatever order they were written in', () => {
    const rows = /( +\{ on: "stake".*\}),\n( +\{ on: "beyond".*\})\n/;
    const swapped = PLAIN_PAGE.replace(rows, '$2,\n$1\n');
    expect(swapped).not.toBe(PLAIN_PAGE);
    const html = built(swapped);
    const g1 = sectionOf(html, 'G1');
    expect(g1.indexOf('On the stake')).toBeLessThan(
      g1.indexOf('A doubted ledger is seen'),
    );
    expect(g1.indexOf('A doubted ledger is seen')).toBeLessThan(
      g1.indexOf('Beyond the stake'),
    );
  });

  it('gives each ruling one radio group: a pick per option and none', () => {
    const g1 = sectionOf(built(PLAIN_PAGE), 'G1');
    expect(
      [...g1.matchAll(/<input type="radio" name="G1" value="(\w)"/g)].map(
        m => m[1],
      ),
    ).toEqual(['a', 'b', 'n']);
  });

  it('draws a figure as a strip of panels and seq or bodies as one switched view', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(sectionOf(html, 'G6')).toContain(
      '<div class="strip" style="--n:2">',
    );
    expect(sectionOf(html, 'G6')).not.toContain('class="vw"');
    const g2 = sectionOf(html, 'G2');
    expect(
      [...g2.matchAll(/class="vw" data-view="(\w+)"/g)].map(m => m[1]),
    ).toEqual(['today', 'G2a', 'G2b']);
    expect(
      [...g2.matchAll(/class="vw" data-view="\w+"( hidden)?/g)].map(
        m => m[1] ?? '',
      ),
    ).toEqual(['', ' hidden', ' hidden']);
  });

  it('shows a cut option struck, with the must above it', () => {
    const g6 = sectionOf(buildPage(loadPageFile(EXAMPLE)), 'G6');
    expect(g6.indexOf('<p class="must">')).toBeLessThan(
      g6.indexOf('<p class="cut">'),
    );
    expect(g6).toContain('c (<s>A separate report of unowned blocks</s>)');
  });

  it('lists what was decided without the owner after the rulings', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(html.indexOf('Decided without you')).toBeGreaterThan(
      html.indexOf('id="r-G6"'),
    );
  });
});

describe('determinism', () => {
  it('two consecutive builds of the same page are byte-identical', () => {
    const dir = pageDir(readFileSync(EXAMPLE, 'utf8'));
    expect(main([dir, '--no-open'])).toBe(0);
    const first = readFileSync(join(dir, 'index.html'));
    expect(main([dir, '--no-open'])).toBe(0);
    const second = readFileSync(join(dir, 'index.html'));
    expect(second.equals(first)).toBe(true);
    expect(readdirSync(dir).sort()).toEqual(['index.html', 'page.js']);
  });

  it('carries no timestamp, absolute path or generated marker', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toMatch(/20\d\d-\d\d-\d\d|\d{2}:\d\d:\d\d/);
    expect(html).not.toContain(tmpdir());
  });
});

describe('the error door', () => {
  it('prints errors and blocks the emit on a red page', () => {
    const dir = pageDir(RED_PAGE);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    let said = '';
    try {
      expect(main([dir, '--no-open'])).toBe(1);
      said = err.mock.calls.flat().join('\n');
    } finally {
      err.mockRestore();
    }
    expect(existsSync(join(dir, 'index.html'))).toBe(false);
    expect(readdirSync(dir)).toEqual([PAGE_FILE]);
    expect(said).toMatch(/Unrecognized key|from/);
  });
});

describe('a page without figure rulings', () => {
  it('references nothing external and writes nothing beside index.html', () => {
    const dir = pageDir(PLAIN_PAGE);
    expect(main([dir, '--no-open'])).toBe(0);
    expect(readdirSync(dir).sort()).toEqual(['index.html', 'page.js']);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).not.toContain('<script src=');
  });
});

describe('--new', () => {
  it('seeds page.js from the example and builds it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulings-r4-'));
    open.push(dir);
    expect(main([dir, '--new', '--no-open'])).toBe(0);
    expect(readFileSync(join(dir, PAGE_FILE), 'utf8')).toEqual(
      readFileSync(EXAMPLE, 'utf8'),
    );
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
  });

  it('refuses to clobber an existing page.js', () => {
    const dir = pageDir(PLAIN_PAGE);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(main([dir, '--new', '--no-open'])).toBe(1);
    } finally {
      err.mockRestore();
    }
    expect(readFileSync(join(dir, PAGE_FILE), 'utf8')).toBe(PLAIN_PAGE);
  });
});

describe('the bin door', () => {
  it('runs the real entrypoint end to end', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulings-r4-'));
    open.push(dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, PAGE_FILE), PLAIN_PAGE);
    const ran = spawnSync(
      process.execPath,
      ['src/index.ts', dir, '--no-open'],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
      },
    );
    expect(ran.status).toBe(0);
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
  });
});

describe('usage', () => {
  it('requires exactly one page dir and known flags', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(main([])).toBe(1);
      expect(main(['a', 'b'])).toBe(1);
      expect(main(['a', '--wat'])).toBe(1);
      const said = err.mock.calls.flat().join('\n');
      expect(said).toMatch(/unknown flag/);
    } finally {
      err.mockRestore();
    }
  });

  it('names the missing page file', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const missing = mkdtempSync(join(tmpdir(), 'rulings-r4-'));
    open.push(missing);
    let said = '';
    try {
      expect(main([missing])).toBe(1);
      said = err.mock.calls.flat().join('\n');
    } finally {
      err.mockRestore();
    }
    expect(said).toMatch(/page\.js/);
  });
});
