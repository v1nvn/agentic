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
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from '../src/cli.ts';
import { buildPage, loadPageFile, PAGE_FILE } from '../src/page.ts';
import { validatePage } from '../src/schema.ts';
import { El, FakeIO, type FakeEvent } from './dom.ts';

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

function sentencePage(today: string): string {
  return `var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Keep the plain door?",
      stake: "About 3 rebuilds a week pay for a second path.",
      today: ${JSON.stringify(today)},
      bodies: {
        today: { lang: "js", code: "let a = 1;\\nlet b = 2;" },
        a: { lang: "js", code: "let a = 2;\\nlet b = 2;" },
        b: { lang: "js", code: "let a = 1;\\nlet b = 4;" }
      },
      opts: [
        { k: "a", rec: true, t: "Change a", g: "a is right more often", c: "one more moving part" },
        { k: "b", t: "Change b", g: "b is cheaper here", c: "the test doubles" }
      ]
    }
  }
};`;
}

function foldPage(lines: number): string {
  const code = (n: number): string =>
    Array.from({ length: n }, (_, i) => `let v${i} = ${i};`).join('\\n');
  return `var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Keep the plain door?",
      stake: "About 3 rebuilds a week pay for a second path.",
      today: "Today the builder writes one file through one door.",
      bodies: {
        today: { code: "${code(lines)}" },
        a: { diff: false, code: "${code(25)}" },
        b: { code: "let a = 1;\\nlet b = 4;" }
      },
      opts: [
        { k: "a", rec: true, t: "Change a", g: "a is right more often", c: "one more moving part" },
        { k: "b", t: "Change b", g: "b is cheaper here", c: "the test doubles" }
      ]
    }
  }
};`;
}

function fragmentPage(g: string, c = 'one more moving part', w?: string): string {
  return `var PAGE = {
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
        b: { lang: "js", code: "let a = 1;\\nlet b = 4;" }
      },
      opts: [
        { k: "a", rec: true, t: "Change a", g: ${JSON.stringify(g)}, c: ${JSON.stringify(c)}${w === undefined ? '' : `, w: ${JSON.stringify(w)}`} },
        { k: "b", t: "Change b", g: "b is cheaper here", c: "the test doubles" }
      ]
    }
  }
};`;
}

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
  it('pins the example full HTML: sidebar, sections, table, compare, notes, merged note', () => {
    const { html, hasDiagram } = buildPage(loadPageFile(EXAMPLE));
    expect(hasDiagram).toBe(true);
    expect(html).toMatchSnapshot();
    expect(html).toContain('<nav class="side"');
    expect(html).toContain('href="#r-G4"');
    expect(html).toContain('id="r-G1"');
    expect(html).toContain('G3 is merged into this ruling.');
    expect(html).toContain('Not rulings: two findings are decided.');
    expect(html).toMatch(/class="vtable"/);
    expect(html).toMatch(/class="compare"/);
    expect(html).not.toMatch(/class="views"/);
    const wraps = html.match(/<div class="stage-wrap[^"]*"/g) ?? [];
    expect(wraps).toHaveLength(10);
    expect(html.match(/class="vg"/g)).toHaveLength(8);
    expect(html.match(/class="vc"/g)).toHaveLength(8);
    expect(html.match(/class="how"/g)).toHaveLength(2);
    expect(html).not.toContain('class="gc');
    expect(html.indexOf('data-view="G2b" data-pick="G2b" hidden>')).toBeLessThan(
      html.indexOf('class="how"'),
    );
    expect(html.lastIndexOf('class="how"')).toBeGreaterThan(
      html.indexOf('data-view="G4b" data-pick="G4b" hidden>'),
    );
    expect(html.match(/★ recommended/g)).toHaveLength(5);
  });

  it('renders the table once per ruling: one head, one row per option, the none row, the ruling note', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(
      html.match(
        /<div class="vtable"><div class="vhead"><span>option<\/span><span>gain<\/span><span>cost<\/span><\/div>/g,
      ),
    ).toHaveLength(4);
    expect(html.match(/<div class="vrow /g)).toHaveLength(12);
    expect(html.match(/<span class="pmark">✓ picked<\/span>/g)).toHaveLength(12);
    expect(
      html.match(
        /<input class="rnote" data-note="G\d+" placeholder="note for G\d+ — anything its answer should carry" aria-label="note for G\d+">/g,
      ),
    ).toHaveLength(4);
    expect(html).toContain(
      '<div class="vrow o-a" data-view="today" tabindex="0">',
    );
    expect(html).toContain(
      '<div class="vrow o-a" data-view="G2a" data-needs="G1a" tabindex="0">',
    );
    expect(html).toContain('<div class="vrow none" data-pick="G1n">');
    expect(html).toContain(
      '<button type="button" class="lt disc none" data-pick="G1n" aria-label="pick G1n">n</button>',
    );
    expect(html).toContain(
      '<span class="vt">none of these fit<span class="pmark">✓ picked</span></span>',
    );
    expect(html).not.toContain('vhint');
    const g1 = html.slice(html.indexOf('id="r-G1"'), html.indexOf('id="r-G2"'));
    expect(g1.indexOf('data-view="G1b"')).toBeLessThan(
      g1.indexOf('data-pick="G1n"'),
    );
    expect(g1.indexOf('data-pick="G1n"')).toBeLessThan(
      g1.indexOf('data-note="G1"'),
    );
  });

  it('stacks the narrow table: chips wrap under the title, gain and cost below, no head', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const at = css.indexOf('@media (max-width: 640px)');
    const narrow = css.slice(at, css.indexOf('@media', at + 6));
    expect(narrow).toContain('.vhead { display: none; }');
    expect(narrow).toContain('grid-template-columns: 26px minmax(0, 1fr)');
    expect(narrow).toContain('.vrow .vt, .vrow .vg, .vrow .vc { grid-column: 2; min-width: 0; }');
    expect(narrow).toContain('.vchips { display: flex; flex-wrap: wrap; gap: 3px 8px; }');
    expect(html.match(/<span class="vchips">/g)).toHaveLength(5);
  });

  it('renders the merged ruling last on the page, after every live ruling', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const at = (id: string): number => html.indexOf(`id="r-${id}"`);
    expect(at('G1')).toBeLessThan(at('G2'));
    expect(at('G2')).toBeLessThan(at('G4'));
    expect(at('G4')).toBeLessThan(at('G5'));
    expect(at('G5')).toBeLessThan(at('G3'));
  });

  it('carries the pick on the disc and the wrap, the view on the row', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(
      html.match(/<button type="button" class="lt disc o-[ab]" data-pick="/g),
    ).toHaveLength(8);
    expect(html.match(/data-pick="G/g)).toHaveLength(24);
    expect(html).toContain(
      '<div class="stage-wrap o-a" data-view="today" data-pick="G1a">',
    );
    expect(html).toContain(
      '<div class="stage-wrap o-a" data-view="G2a" data-pick="G2a" hidden>',
    );
    expect(html).toContain(
      '<div class="stage-wrap" data-view="today">',
    );
    expect(html).not.toMatch(/class="vrow o-[a-d][^"]*" data-pick/);
    expect(html.match(/class="vrow none" data-pick="G\d+n">/g)).toHaveLength(4);
    expect(
      html.match(
        /<div class="vrow [^"]*" data-view="[^"]*"(?: data-needs="[^"]*")? tabindex="0">/g,
      ),
    ).toHaveLength(8);
  });

  it('puts every view in the DOM with exactly one visible per ruling', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const compares = html.match(/<div class="compare">[\s\S]*?<\/section>/g) ?? [];
    expect(compares).toHaveLength(4);
    for (const compare of compares) {
      const opens = compare.match(/<div class="stage-wrap[^>]*>/g) ?? [];
      expect(opens.filter(o => !o.endsWith(' hidden>'))).toHaveLength(1);
    }
    expect(html.match(/<div class="stage-wrap[^>]* hidden>/g)).toHaveLength(6);
  });

  it('emits no tab strip: the row is the one control, keyboard-reachable', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toMatch(/role="tab"|tablist|tabpanel|class="tabs"|class="tl"|aria-selected/);
  });

  it('references nothing external: the one script tag is the vendored mermaid', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<script src="mermaid.min.js"><\/script>/g)).toHaveLength(1);
    expect(html).toContain('window.mermaid');
    expect(html).not.toMatch(/https?:\/\/|src="\/|href="\//);
  });
});

describe('the folds', () => {
  it('shows two sentences of a three-sentence today and folds the rest', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<p class="today">/g)).toHaveLength(6);
    expect(html).toContain(
      '<p class="today">Paul buys a reader on a leaf. The daemon records an owner for each block it builds, called a <b>band</b>.</p>' +
        '<details class="fold"><summary>the rest</summary><p class="today">A read pays half its fee to the band, which stops where the reader’s window starts.</p></details>',
    );
    expect(html).toContain(
      '<p class="today">Every command first runs through core’s <code>parseQuietly</code>, so a bad flag prints no stack trace. It mutes output and calls <code>exitOverride()</code> on each command.</p>',
    );
    expect(
      html.match(/<details class="fold"><summary>the rest<\/summary>/g),
    ).toHaveLength(3);
  });

  it('renders a two-sentence today whole, without a fold', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain(
      '<p class="today">The window lives only in the daemon’s memory. After a crash the console shows the reader with no window; whoever is on call reads the ledger, rebuilds the range by hand, and the next read pays the band again.</p>',
    );
  });

  it('splits on prose sentences, never inside a code span or an anchor', () => {
    const dir = pageDir(
      sentencePage(
        'First sentence ends here. Second walks a span (<code>a. b</code> is one string) and a link (<a href="#r-G1. a">the ruling</a>). Third sentence pays the fee.',
      ),
    );
    const { html } = buildPage(loadPageFile(join(dir, PAGE_FILE)));
    expect(html).toContain(
      '<p class="today">First sentence ends here. Second walks a span (<code>a. b</code> is one string) and a link (<a href="#r-G1. a">the ruling</a>).</p>',
    );
    expect(html).toContain(
      '<details class="fold"><summary>the rest</summary><p class="today">Third sentence pays the fee.</p></details>',
    );
  });

  it('folds the notes block on its bold lead', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain(
      '<div class="note"><b>Not rulings: two findings are decided.</b> <details class="fold"><summary>the rest</summary> Finding 1 is false:',
    );
  });

  it('renders a note whole when its bold is not the lead', () => {
    const dir = pageDir(
      PLAIN_PAGE.replace(
        '  groups:',
        '  notes: [{ html: "Plain words, then a <b>bold middle</b>, then more plain words." }],\n  groups:',
      ),
    );
    const { html } = buildPage(loadPageFile(join(dir, PAGE_FILE)));
    expect(html).toContain(
      '<div class="note">Plain words, then a <b>bold middle</b>, then more plain words.</div>',
    );
    expect(html).not.toContain('<details class="fold"');
  });

  it('folds a today body past 20 lines behind its count, once, never an option body', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain(
      '<details class="fold"><summary>show all 51 lines</summary><pre>',
    );
    expect(
      html.match(/<details class="fold"><summary>show all /g),
    ).toHaveLength(1);
    expect(html.match(/<pre class="diff">/g)).toHaveLength(1);
  });

  it('folds past 20 lines and not at 20, and the 25-line snapshot option never folds', () => {
    const at = buildPage(loadPageFile(join(pageDir(foldPage(20)), PAGE_FILE)));
    expect(at.html).not.toContain('show all');
    expect(at.html).not.toContain('<details class="fold"');
    expect(at.html).toContain('<pre>let v0 = 0;');
    expect(at.html).toContain('let v24 = 24;</pre>');
    const over = buildPage(loadPageFile(join(pageDir(foldPage(21)), PAGE_FILE)));
    expect(over.html).toContain('let v19 = 19;</pre><details class="fold"><summary>');
    expect(over.html).toContain(
      '<summary>show all 21 lines</summary><pre>let v20 = 20;</pre>',
    );
    expect(over.html.match(/show all/g)).toHaveLength(1);
  });

  it('keeps a token that spans the fold line whole on both sides of the fold', () => {
    const code = [
      ...Array.from({ length: 19 }, (_, i) => `let v${i} = ${i};`),
      '/* one comment starts here',
      '   and only ends here */',
      'let done = 1;',
    ].join('\\n');
    const dir = pageDir(`var PAGE = {
  title: "One small ruling?",
  sub: "What the rebuild owes.",
  groups: [{ id: "one", label: "The only group", rulings: ["G1"] }],
  rulings: {
    G1: {
      title: "Keep the plain door?",
      stake: "About 3 rebuilds a week pay for a second path.",
      today: "Today the builder writes one file through one door.",
      bodies: {
        today: { lang: "ts", code: "${code}" },
        a: { diff: false, code: "let a = 1;\\nlet b = 2;" },
        b: { code: "let a = 1;\\nlet b = 4;" }
      },
      opts: [
        { k: "a", rec: true, t: "Change a", g: "a is right more often", c: "one more moving part" },
        { k: "b", t: "Change b", g: "b is cheaper here", c: "the test doubles" }
      ]
    }
  }
};`);
    const { html } = buildPage(loadPageFile(join(dir, PAGE_FILE)));
    expect(html).toContain(
      '<span class="token comment">/* one comment starts here</span></pre>' +
        '<details class="fold"><summary>show all 22 lines</summary>' +
        '<pre><span class="token comment">   and only ends here */</span>',
    );
  });
});

describe('the today sentence warning', () => {
  it('warns past three sentences and not at three', () => {
    const three = validatePage(
      loadPageFile(join(pageDir(sentencePage('A. B. C.')), PAGE_FILE)),
    );
    expect(three.errors).toEqual([]);
    expect(three.warnings).toEqual([]);
    const four = validatePage(
      loadPageFile(join(pageDir(sentencePage('A. B. C. D.')), PAGE_FILE)),
    );
    expect(four.errors).toEqual([]);
    expect(four.warnings).toEqual([
      'G1.today is 4 sentences; two show before the fold — write it in three',
    ]);
  });
});

describe('the language pass', () => {
  it('names the recommendation and the pick, never "my pick"', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/class="star">★ recommended</g)).toHaveLength(4);
    expect(html).toContain('>accept ★ recommended</button>');
    expect(html).not.toContain('my pick');
  });

  it('prints none of these fit as the table row, without chat syntax', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(
      html.match(/>none of these fit<span class="pmark">/g),
    ).toHaveLength(4);
    expect(html).not.toContain('data-none');
    expect(html).not.toContain('none-btn');
    expect(html).not.toContain('· n');
  });

  it('carries the merged sentence once, in the merged ruling’s own section', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/Same money question as G1/g)).toHaveLength(1);
    expect(html.match(/G3 is merged into this ruling\./g)).toHaveLength(1);
  });

  it('marks the as-today option on its row, nowhere else', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html.match(/<span class="asr">as today<\/span>/g)).toHaveLength(2);
    expect(html).not.toContain('>today</span>');
    expect(html).not.toContain('how it works now');
  });

  it('speaks to the reader: no engine vocabulary in captions and placeholders', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toMatch(/The engine|diff: false|rides the answer/);
    expect(html.match(/placeholder="note for G\d[^"]*"/g)).toHaveLength(4);
    expect(html).not.toMatch(/placeholder="note for G\d[a-z]/);
  });

  it('draws mono structure at exactly two sizes', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).toContain('--mono-s: 11px');
    expect(css).toContain('--mono-l: 12.5px');
    expect(css).not.toMatch(/[\d.]+px[^;{}]*var\(--mono\)/);
  });

  it('names an option once: no letter span anywhere outside the disc', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).not.toContain('<span class="lt">');
  });

  it('carries no dead mermaid max-width rule', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).not.toMatch(/\.mermaid svg/);
  });

  it('keeps the view-card path deleted: no vhead chips row, no gain cost fragments on a view', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    expect(css).not.toMatch(/\.views|\.vtt|\.vmeta|\.gc\b/);
    expect(html).not.toContain('<div class="vtt">');
  });
});

describe('the verdict fragment warning', () => {
  it('warns past 90 stripped characters and not at 90', () => {
    const fit = validatePage(
      loadPageFile(join(pageDir(fragmentPage('a'.repeat(90))), PAGE_FILE)),
    );
    expect(fit.errors).toEqual([]);
    expect(fit.warnings).toEqual([]);
    const over = validatePage(
      loadPageFile(join(pageDir(fragmentPage('a'.repeat(91))), PAGE_FILE)),
    );
    expect(over.errors).toEqual([]);
    expect(over.warnings).toEqual([
      'G1a gain is 91 characters; a table fragment fits 90',
    ]);
  });

  it('measures the fragment stripped of its tags, not raw', () => {
    const fit = validatePage(
      loadPageFile(join(pageDir(fragmentPage(`<b>${'a'.repeat(88)}</b>`)), PAGE_FILE)),
    );
    expect(fit.errors).toEqual([]);
    expect(fit.warnings).toEqual([]);
    const over = validatePage(
      loadPageFile(join(pageDir(fragmentPage(`<b>${'a'.repeat(91)}</b>`)), PAGE_FILE)),
    );
    expect(over.errors).toEqual([]);
    expect(over.warnings).toEqual([
      'G1a gain is 91 characters; a table fragment fits 90',
    ]);
  });

  it('warns the cost by its own name', () => {
    const r = validatePage(
      loadPageFile(join(pageDir(fragmentPage('b is cheaper', 'c'.repeat(95))), PAGE_FILE)),
    );
    expect(r.warnings).toEqual([
      'G1a cost is 95 characters; a table fragment fits 90',
    ]);
  });

  it('leaves w alone however long it runs', () => {
    const r = validatePage(
      loadPageFile(
        join(
          pageDir(fragmentPage('b is cheaper', 'one more moving part', 'w'.repeat(200))),
          PAGE_FILE,
        ),
      ),
    );
    expect(r.warnings).toEqual([]);
  });
});

function emittedChrome(html: string) {
  FakeIO.last = null;
  const body = new El('body');
  const key = /<body data-key="([^"]*)">/.exec(html);
  if (key) body.setAttribute('data-key', key[1]);
  const cardEl = (cls: string, pick: string): El => {
    const el = new El('div', cls.split(/\s+/).filter(Boolean));
    if (pick !== '') el.setAttribute('data-pick', pick);
    el.parent = body;
    return el;
  };
  const discs = [...html.matchAll(/<button type="button" class="lt disc ([^"]*)" data-pick="([^"]+)"/g)].map(
    m => ({ at: m.index, el: cardEl(m[1], m[2]) }),
  );
  const wraps = [
    ...html.matchAll(
      /<div class="stage-wrap(?: ([^"]*))?" data-view="[^"]*"(?: data-pick="([^"]+)")?(?: hidden)?>/g,
    ),
  ].map(m => ({ at: m.index, el: cardEl(m[1] ?? '', m[2] ?? '') }));
  const noneRows = [
    ...html.matchAll(/<div class="vrow none" data-pick="([^"]+)">/g),
  ].map(m => ({ at: m.index, el: cardEl('vrow none', m[1]) }));
  const cards = [...discs, ...wraps, ...noneRows]
    .sort((a, b) => a.at - b.at)
    .map(c => c.el)
    .filter(el => el.getAttribute('data-pick') !== null);
  const needsRows = [
    ...html.matchAll(
      /<div class="vrow ([^"]*)" data-view="[^"]*"(?: data-needs="([^"]*)")? tabindex="0">/g,
    ),
  ].map(m => {
    const el = new El('div', ['vrow', ...m[1].split(/\s+/).filter(Boolean)]);
    const disc = new El('button', ['lt', 'disc']);
    disc.setAttribute(
      'data-pick',
      /<button type="button" class="lt disc ([^"]*)" data-pick="([^"]+)"/
        .exec(html.slice(m.index))![2],
    );
    el.appendChild(disc);
    if (m[2] !== undefined) el.setAttribute('data-needs', m[2]);
    el.parent = body;
    return el;
  });
  const noteIns = [
    ...html.matchAll(/<input class="rnote" data-note="([^"]+)"/g),
  ].map(m => {
    const el = new El('input');
    el.setAttribute('data-note', m[1]);
    return el;
  });
  const links = [
    ...html.matchAll(
      /<a class="rl[^"]*" href="#r-([^"]+)"><span class="gid">[^<]*<\/span><span class="t">([^<]*)<\/span>/g,
    ),
  ].map(m => {
    const el = new El('a', ['rl']);
    el.setAttribute('href', `#r-${m[1]}`);
    const t = new El('span', ['t']);
    t.textContent = m[2];
    el.appendChild(t);
    return el;
  });
  const secs = [...html.matchAll(/<section class="ruling" id="([^"]+)">/g)].map(
    m => {
      const el = new El('section');
      el.setAttribute('id', m[1]);
      return el;
    },
  );
  function byId(id: string, tag: string, classes: string[] = []): El | null {
    if (!html.includes(`id="${id}"`)) return null;
    const el = new El(tag, classes);
    el.setAttribute('id', id);
    return el;
  }
  const bar = byId('rulings-bar', 'footer', ['bar']);
  const barIn = byId('rulings-bar-in', 'div');
  const sum = byId('picks', 'div');
  const notesIn = byId('rulings-notes', 'textarea');
  const copyBtn = byId('copy-answer', 'button');
  const count = byId('ruled-count', 'div', ['scount']);
  const tabMatch = /class="bar-tab" id="([^"]+)" aria-expanded="([^"]*)" aria-controls="([^"]+)">/.exec(
    html,
  );
  const tab = tabMatch
    ? (() => {
        const el = new El('button', ['bar-tab']);
        el.setAttribute('id', tabMatch[1]);
        el.setAttribute('aria-expanded', tabMatch[2]);
        el.setAttribute('aria-controls', tabMatch[3]);
        return el;
      })()
    : null;
  const where = /<a class="where" id="([^"]+)" hidden>/.exec(html)
    ? byId('rulings-where', 'a', ['where'])
    : null;
  where?.setAttribute('hidden', '');
  const withIds = [bar, barIn, sum, notesIn, copyBtn, count, tab, where];
  const idMap = new Map(
    withIds.filter((e): e is El => e !== null).map(e => [e.id, e]),
  );
  const listeners: Record<string, ((e: FakeEvent) => void)[]> = {};
  const doc = {
    body,
    addEventListener(t: string, h: (e: FakeEvent) => void): void {
      (listeners[t] ??= []).push(h);
    },
    getElementById(id: string): El | null {
      return idMap.get(id) ?? null;
    },
    querySelectorAll(sel: string): El[] {
      switch (sel) {
        case '[data-pick]':
          return cards;
        case '[data-needs]':
          return needsRows;
        case '.rnote':
          return noteIns;
        case '.side a.rl':
          return links;
        case 'section[id]':
          return secs;
        default:
          return [];
      }
    },
    querySelector(sel: string): El | null {
      const m = /^\[data-pick="(.+)"\]$/.exec(sel);
      return m
        ? (cards.find(c => c.getAttribute('data-pick') === m[1]) ?? null)
        : null;
    },
  };
  const storage = new Map<string, string>();
  const sandbox = {
    document: doc,
    IntersectionObserver: FakeIO,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    localStorage: {
      getItem: (k: string): string | null => storage.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        storage.set(k, v);
      },
    },
    setTimeout,
    clearTimeout,
    window: {
      getSelection: (): { toString(): string } => ({ toString: () => '' }),
      IntersectionObserver: FakeIO,
      innerHeight: 900,
    },
  };
  const start = html.lastIndexOf('<script>');
  const code = html.slice(
    start + '<script>'.length,
    html.lastIndexOf('</script>'),
  );
  vm.runInNewContext(code, sandbox);
  const io = FakeIO.last as FakeIO | null;
  return {
    bar,
    barIn,
    click(el: El): void {
      for (const h of listeners.click ?? []) h({ target: el, detail: 1 });
    },
    clickCard(pick: string): El | undefined {
      const card = cards.find(c => c.getAttribute('data-pick') === pick);
      if (card !== undefined) this.click(card);
      return card;
    },
    count,
    io,
    link: (id: string): El | undefined =>
      links.find(l => l.getAttribute('href') === `#r-${id}`),
    section: (id: string): El | undefined =>
      secs.find(s => s.id === `r-${id}`),
    storage,
    sum,
    tab,
    where,
    wraps: wraps.map(w => w.el),
  };
}

describe('the interactive chrome', () => {
  it('keys persistence on the page key and wires pick, none, quick, notes, composer', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    expect(html).toContain('<body data-key="rulings-testril-pr251">');
    expect(html).toContain('data-pick="G1a"');
    expect(html).toContain('data-pick="G2b"');
    expect(html).toContain('data-needs="G1a"');
    expect(html).toContain('data-pick="G1n"');
    expect(html).toContain('data-picks="G1a"');
    expect(html).toContain('id="picks"');
    expect(html).toContain('id="rulings-notes"');
    expect(html).toContain('id="copy-answer"');
    expect(html).toContain('localStorage.getItem');
    expect(html).toContain('data-note="G2"');
    expect(html).toContain('data-unpick=');
    expect(html).toContain('IntersectionObserver');
    expect(html).toContain('onotes');
  });

  it('boots the emitted chrome into a resting bar, a counting tab, an honest counter and a hidden pill', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const page = emittedChrome(html);
    const bar = page.bar;
    const tab = page.tab;
    const count = page.count;
    if (bar === null || tab === null || count === null) {
      throw new Error('fixture: the emitted panel ids');
    }
    expect(bar.classes.contains('rest')).toBe(true);
    expect(tab.textContent).toBe('no picks yet');
    expect(tab.getAttribute('aria-controls')).toBe(page.barIn?.id);
    expect(count.textContent).toBe('0 of 4 ruled');
    expect(page.sum?.innerHTML).toContain('no picks yet — pick a letter');
    expect(page.where?.getAttribute('hidden')).toBe('');
    expect(html).not.toContain('max-height: 120px');

    const io = page.io;
    const g1 = page.section('G1');
    if (io === null || g1 === undefined) throw new Error('fixture: spy band');
    io.cb([{ target: g1, isIntersecting: true }]);
    expect(page.where?.getAttribute('hidden')).toBeNull();
    expect(page.where?.getAttribute('href')).toBe('#r-G1');
    expect(page.where?.textContent).toContain(
      'Who owns a leaf block inside its reader’s window?',
    );

    const g2a = page.clickCard('G2a');
    expect(g2a).toBeDefined();
    expect(bar.classes.contains('rest')).toBe(false);
    expect(count.textContent).toBe('1 of 4 ruled');
    expect(page.sum?.innerHTML).toContain('needs G1a');
    page.clickCard('G1a');
    expect(count.textContent).toBe('2 of 4 ruled');
    expect(page.sum?.innerHTML).not.toContain('needs G1a');
    expect(page.link('G1')?.classes.contains('ruled')).toBe(true);
  });

  it('carries the stage-wrap picks into the chrome and picks from the shown picture', () => {
    const { html } = buildPage(loadPageFile(EXAMPLE));
    const page = emittedChrome(html);
    expect(page.wraps).toHaveLength(10);
    expect(
      page.wraps
        .map(w => w.getAttribute('data-pick'))
        .filter((p): p is string => p !== null),
    ).toEqual(['G1a', 'G1b', 'G2a', 'G2b', 'G4a', 'G4b', 'G5b', 'G5a']);
    const shown = page.wraps.find(w => w.getAttribute('data-pick') === 'G2b');
    if (shown === undefined) throw new Error('fixture: the G2b stage wrap');
    expect(shown.getAttribute('aria-pressed')).toBe('false');
    page.click(shown);
    expect(shown.getAttribute('aria-pressed')).toBe('true');
    expect(page.count?.textContent).toBe('1 of 4 ruled');
    expect(page.sum?.innerHTML).toContain('G2b');
    page.click(shown);
    expect(shown.getAttribute('aria-pressed')).toBe('false');
    expect(page.count?.textContent).toBe('0 of 4 ruled');
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
