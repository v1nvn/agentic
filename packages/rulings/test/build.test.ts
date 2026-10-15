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
  it('pins the example full HTML: sidebar, sections, views, verdict tails, notes, merged note', () => {
    const { html, hasDiagram } = buildPage(loadPageFile(EXAMPLE));
    expect(hasDiagram).toBe(false);
    expect(html).toMatchSnapshot();
    expect(html).toContain('<nav class="side"');
    expect(html).toContain('href="#r-G4"');
    expect(html).toContain('id="r-G1"');
    expect(html).toContain('G3 is merged into this ruling.');
    expect(html).toContain('Not rulings: two findings are decided.');
    expect(html).toMatch(/class="views"/);
    expect(html).not.toMatch(/class="compare"/);
    const viewBlocks =
      html.match(/<section class="view[^"]*"[^>]*>[\s\S]*?<\/section>/g) ?? [];
    expect(viewBlocks).toHaveLength(8);
    expect(viewBlocks.filter(b => b.includes('gc gain'))).toHaveLength(6);
    const todayBlocks = viewBlocks.filter(b => b.includes('view today'));
    expect(todayBlocks).toHaveLength(3);
    expect(todayBlocks[0]).toContain('gc gain');
    expect(todayBlocks[1]).not.toContain('gc gain');
    expect(todayBlocks[2]).not.toContain('gc gain');
    const g2b = viewBlocks.find(b => b.includes('data-pick="G2b"'));
    expect(g2b?.indexOf('class="stage"')).toBeLessThan(g2b?.indexOf('class="how"'));
    expect(g2b?.indexOf('class="how"')).toBeLessThan(g2b?.indexOf('gc gain'));
    expect(g2b?.indexOf('gc gain')).toBeLessThan(g2b?.indexOf('gc cost'));
    expect(html.match(/★ recommended/g)).toHaveLength(4);
  });

  it('references nothing external: the example carries no diagram, no scripts', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toContain('<script src=');
    expect(html).not.toContain('window.mermaid');
    expect(html).not.toMatch(/https?:\/\/|src="\/|href="\//);
  });
});

describe('the language pass', () => {
  it('names the recommendation and the pick, never "my pick"', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/class="star">★ recommended</g)).toHaveLength(3);
    expect(html).toContain('>accept ★ recommended</button>');
    expect(html.match(/<span class="pmark">✓ picked<\/span>/g)).toHaveLength(6);
    expect(html).not.toContain('my pick');
  });

  it('prints the none button without chat syntax', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain('>none of these fit</button>');
    expect(html).not.toContain('· n');
  });

  it('carries the merged sentence once, in the merged ruling’s own section', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/Same money question as G1/g)).toHaveLength(1);
    expect(html.match(/G3 is merged into this ruling\./g)).toHaveLength(1);
  });

  it('shapes every today card like an option card: vhead wrapping vtt', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<div class="vhead">/g)).toHaveLength(8);
    expect(html.match(/<div class="vhead"><div class="vtt">/g)).toHaveLength(2);
    expect(html).not.toContain('<div class="vhead"><span class="vt">');
  });

  it('speaks to the reader: no engine vocabulary in captions and placeholders', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toMatch(/The engine|diff: false|rides the answer/);
    expect(html.match(/placeholder="note for G\d[a-z]?"/g)).toHaveLength(6);
  });

  it('draws mono structure at exactly two sizes', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).toContain('--mono-s: 11px');
    expect(css).toContain('--mono-l: 12.5px');
    expect(css).not.toMatch(/[\d.]+px[^;{}]*var\(--mono\)/);
  });

  it('fills a bodies tag letter only when its view is picked', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).not.toMatch(/\.body\.of-option \.tag \.lt \{[^}]*background/);
    expect(css).toMatch(
      /\[aria-pressed="true"\] \.body \.tag \.lt \{[^}]*background: var\(--o\)/,
    );
  });

  it('carries no dead mermaid max-width rule', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).not.toMatch(/\.mermaid svg/);
  });
});

describe('the interactive chrome', () => {
  it('keys persistence on the page key and wires pick, none, quick, notes, composer', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain('<body data-key="rulings-testril-pr251">');
    expect(html).toContain('data-pick="G1a"');
    expect(html).toContain('data-pick="G2b"');
    expect(html).toContain('data-needs="G1a"');
    expect(html).toContain('data-none="G1"');
    expect(html).toContain('data-picks="G1a"');
    expect(html).toContain('id="picks"');
    expect(html).toContain('id="rulings-notes"');
    expect(html).toContain('id="copy-answer"');
    expect(html).toContain('localStorage.getItem');
    expect(html).toContain('data-note="G2a"');
    expect(html).toContain('data-unpick=');
    expect(html).toContain('IntersectionObserver');
    expect(html).toContain('onotes');
  });

  it('emits the resting bar, the narrow tab, the ruled counter and the wayfinding pill', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain('id="rulings-bar"');
    expect(html).toContain('id="bar-tab"');
    expect(html).toContain('aria-controls="rulings-bar-in"');
    expect(html).toContain('id="ruled-count"');
    expect(html).toContain('0 of 3 ruled');
    expect(html).toMatch(/<a class="where" id="rulings-where"[^>]* hidden>/);
    expect(html).not.toContain('max-height: 120px');
  });

  it('emits a page without key with the composer and no storage key', () => {
    const dir = pageDir(PLAIN_PAGE);
    expect(main([dir, '--no-open'])).toBe(0);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).not.toMatch(/<body data-key/);
    expect(html).toContain('data-pick="G1a"');
    expect(html).toContain('id="copy-answer"');
  });

  it('carries the theme cut: no param reading, no data-theme anywhere', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toContain('data-theme');
    expect(html).not.toContain('theme=');
    expect(html).toContain('prefers-color-scheme: dark');
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
