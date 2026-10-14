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
  it('pins the example full HTML: toc, sections, stacked views, matrix, notes, merged note', () => {
    const { html, hasDiagram } = buildPage(loadPageFile(EXAMPLE));
    expect(hasDiagram).toBe(true);
    expect(html).toMatchSnapshot();
    expect(html).toContain('<nav class="toc"');
    expect(html).toContain('href="#r-G4"');
    expect(html).toContain('id="r-G1"');
    expect(html).toContain('G3 is merged into this ruling.');
    expect(html).toContain('Not rulings: two findings are decided.');
    expect(html).toMatch(/class="views"/);
    expect(html).toMatch(/class="compare"/);
  });

  it('carries exactly one external reference, the vendored mermaid, relatively', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<script src=/g)).toHaveLength(1);
    expect(html).toContain('<script src="mermaid.min.js"></script>');
    expect(html).not.toMatch(/https?:\/\/|src="\/|href="\//);
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
    expect(readdirSync(dir).sort()).toEqual([
      'index.html',
      'mermaid.min.js',
      'page.js',
    ]);
  });

  it('carries no timestamp, absolute path or generated marker', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
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

  it('prints warnings but still emits', () => {
    const text = readFileSync(EXAMPLE, 'utf8').replace(
      'a read of 10 blocks',
      'a read of ten blocks',
    );
    const dir = pageDir(text);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    let said = '';
    try {
      expect(main([dir, '--no-open'])).toBe(0);
      said = err.mock.calls.flat().join('\n');
    } finally {
      err.mockRestore();
    }
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
    expect(said).toMatch(/has no number/);
  });
});

describe('a page without diagram rulings', () => {
  it('references nothing external and copies no mermaid', () => {
    const dir = pageDir(PLAIN_PAGE);
    expect(main([dir, '--no-open'])).toBe(0);
    expect(readdirSync(dir).sort()).toEqual(['index.html', 'page.js']);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).not.toContain('<script src=');
    expect(html).not.toContain('window.mermaid');
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
