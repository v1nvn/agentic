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

const EXAMPLE = fileURLToPath(new URL('../src/example.page.js', import.meta.url));

const PLAIN_PAGE = `var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Keep the plain door?",
      stake: "About 3 rebuilds a week pay for a second path.",
      today: "Today the builder writes one file through one door.",
      bodies: {
        today: { lang: "js", code: "let a = 1;\\nlet b = 2;" },
        a: { lang: "js", code: "let a = 2;\\nlet b = 2;" },
        b: { lang: "js", code: "let a = 1;\\nlet b = 3;" }
      },
      opts: [
        { k: "a", rec: true, t: "Change a", g: "a is right more often", c: "one more moving part" },
        { k: "b", t: "Change b", g: "b is cheaper here", c: "the test doubles" }
      ]
    }
  }
};`;

const TABLE_PAGE = `var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Ship the ruling as a bare table?",
      stake: "About 3 rulings a month draw an empty box for a table-only answer.",
      today: "Today every ruling draws a picture box, even when no picture earned it.",
      opts: [
        { k: "a", rec: true, t: "Bare table", g: "a table-only ruling renders bare", c: "the row carries the how line", w: "the gain names the file, the row says why" },
        { k: "b", today: true, t: "Keep the box", g: "the frame is always there", c: "an empty bordered box", w: "the empty frame is the cost the owner sees" }
      ]
    }
  }
};`;

const FIGURE_PAGE = `var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Refuse to serve when the start check fails?",
      stake: "About 2 starts a month hide a doubted ledger behind a log line.",
      today: "Today the daemon checks its ledger once and serves either way.",
      figure: {
        cap: "<b>Today a failed check is a log line; the daemon serves anyway.</b>",
        views: {
          today: { html: '<svg viewBox="0 0 200 40"><text x="8" y="24" fill="var(--ink)">start → serve reads</text></svg>' },
          a: {
            cap: "<b>A failed check stops the daemon before its first read.</b>",
            html: '<svg viewBox="0 0 200 40"><text x="8" y="24" fill="var(--o)">start → exit non-zero</text></svg>'
          }
        }
      },
      opts: [
        { k: "a", rec: true, t: "Refuse to serve", g: "the on-call sees the exit, not a log line", c: "one flaky check stops every read" },
        { k: "b", today: true, t: "Keep serving", g: "reads continue through a flaky check", c: "the only sign is a log line" }
      ]
    }
  }
};`;

const RED_PAGE = `var PAGE = {
  title: "A red page",
  sub: "s",
  groups: [{ id: "g", label: "G", rulings: ["G1"] }],
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

describe('the emitted page', () => {
  it('pins the example full HTML', () => {
    expect(buildPage(loadPageFile(EXAMPLE))).toMatchSnapshot();
  });

  it('gives every live ruling one decision card and the merged ruling none', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<div class="decide/g)).toHaveLength(5);
    expect(sectionOf(html, 'G3')).not.toContain('class="decide');
    expect(sectionOf(html, 'G3')).toContain('<p class="lede">Merged into G1. ');
  });

  it('draws a view per live option beside the options, one shown per card', () => {
    const g1 = sectionOf(buildPage(loadPageFile(EXAMPLE)), 'G1');
    expect([...g1.matchAll(/<div class="vw[^"]*" data-view="([^"]+)"/g)].map(m => m[1])).toEqual([
      'today',
      'G1b',
    ]);
    expect(g1.match(/<div class="vw[^"]*" data-view="[^"]+">/g)).toHaveLength(1);
    expect(g1).toContain('<label class="opt" data-pick="G1a" data-look="today">');
    expect(g1).toContain('<label class="opt" data-pick="G1b" data-look="G1b">');
  });

  it('options are one radio group per ruling, the none row included', () => {
    const g1 = sectionOf(buildPage(loadPageFile(EXAMPLE)), 'G1');
    const names = [...g1.matchAll(/<input type="radio" name="([^"]+)"/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names)).toEqual(new Set(['G1']));
  });

  it('opens the view with its caption beside the option disc', () => {
    const g1 = sectionOf(buildPage(loadPageFile(EXAMPLE)), 'G1');
    expect(g1).toContain(
      '<div class="vh"><span class="disc">b</span><p class="vcap"><b>All 20 paid leaf blocks have an owner.</b> The read pays Paul.</p></div>',
    );
  });

  it('adds a Today row only when no option keeps today', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(sectionOf(html, 'G2')).toContain('aria-label="Show today’s picture"');
    expect(sectionOf(html, 'G1')).not.toContain('aria-label="Show today’s picture"');
  });

  it('builds a table-only ruling bare: no view, rows that only pick', () => {
    const dir = pageDir(TABLE_PAGE);
    expect(main([dir, '--no-open'])).toBe(0);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('<div class="decide bare">');
    expect(html).not.toContain('class="view"');
    expect(html).not.toMatch(/class="opt"[^>]*data-look/);
    expect(html).toContain('<span class="w">the gain names the file, the row says why</span>');
  });

  it('a figure ruling inlines its markup and writes nothing beside index.html', () => {
    const dir = pageDir(FIGURE_PAGE);
    expect(main([dir, '--no-open'])).toBe(0);
    expect(readdirSync(dir).sort()).toEqual(['index.html', 'page.js']);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('<div class="fig"><svg viewBox="0 0 200 40"><text x="8" y="24" fill="var(--o)">start → exit non-zero</text></svg></div>');
    expect(html).not.toMatch(/<script src=|https?:\/\/|src="\/|href="\//);
  });
});

function sectionOf(html: string, id: string): string {
  const at = html.indexOf(`<section class="ruling" id="r-${id}">`);
  return html.slice(at, html.indexOf('</section>', at));
}

describe('no folds', () => {
  it('shows every word and every line: no fold, no expander anywhere', () => {
    const html = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toMatch(/<details|<summary|show all \d+ lines|>the rest</);
    expect(sectionOf(html, 'G1')).toContain(
      'called a <b>band</b>. A read pays half its fee to the band, which stops where the reader’s window starts.</p>',
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
    const ran = spawnSync(process.execPath, ['src/index.ts', dir, '--no-open'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
    });
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
