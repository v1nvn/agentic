import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { bodiesOption, bodiesToday } from '../src/bodies.ts';
import { figureView } from '../src/figure.ts';
import { seqView } from '../src/seq.ts';
import { validatePage, type Page, type Ruling } from '../src/schema.ts';
import { pageCss } from '../src/style.ts';

function example(): Page {
  const text = readFileSync(
    fileURLToPath(new URL('../src/example.page.js', import.meta.url)),
    'utf8',
  );
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(text, ctx);
  return structuredClone(ctx.PAGE) as Page;
}

describe('the example page', () => {
  it('validates green with two seq rulings, a bodies ruling, a table-only ruling and a figure ruling', () => {
    const P = example();
    expect(P.rulings.G1.seq).toBeTruthy();
    expect(P.rulings.G2.bodies).toBeTruthy();
    expect(P.rulings.G4.seq).toBeTruthy();
    expect(P.rulings.G4.figure).toBeFalsy();
    expect(P.rulings.G5.seq).toBeFalsy();
    expect(P.rulings.G5.bodies).toBeFalsy();
    expect(P.rulings.G5.figure).toBeFalsy();
    expect(P.rulings.G6.figure).toBeTruthy();
    expect(validatePage(P).errors).toEqual([]);
  });
});

describe('seq view', () => {
  it('pins the today stage: lanes, ledger, start row, legend, no tags, no verdict', () => {
    const P = example();
    const html = seqView(P.rulings.G1, 'G1', 'today');
    expect(html).toMatchSnapshot();
    expect(html).toContain('class="balh"');
    expect(html).toContain('>start</text>');
    expect(html).not.toContain('tg-');
    expect(html).not.toContain('data-pick');
    expect(html).not.toContain('class="vg"');
  });

  it('pins the option stage: overlay expansion, changed tag, band, per-view cap', () => {
    const P = example();
    const html = seqView(P.rulings.G1, 'G1', 'G1b');
    expect(html).toMatchSnapshot();
    expect(html).toContain('tg-changed');
    expect(html).toContain('class="band"');
    expect(html).toContain('what this option changes');
    expect(html).toContain('All 20 paid leaf blocks have an owner.');
  });

  it('renders today’s option-only step as a quiet ghost row, not a gap', () => {
    const P = example();
    const nums = (html: string): string[] =>
      [...html.matchAll(/class="num"[^>]*>(\d+)<\/text>/g)].map(m => m[1]);
    const today = seqView(P.rulings.G4, 'G4', 'today');
    expect(nums(today)).toEqual(['1', '2', '3', '4']);
    expect(today).toContain('class="ghost"');
    expect(today).toContain('only in a');
    const a = seqView(P.rulings.G4, 'G4', 'G4a');
    expect(a).not.toContain('class="ghost"');
    expect(nums(a)).toEqual(['2', '3', '4']);
    expect(nums(seqView(P.rulings.G1, 'G1', 'G1b'))).toEqual(['2', '5']);
  });

  it('draws only an option’s delta rows, at their true chain numbers', () => {
    const P = example();
    const html = seqView(P.rulings.G1, 'G1', 'G1b');
    expect(html).toContain('bands [30, 40) and [40, 50)');
    expect(html).toContain('holder half goes to Paul’s leaf band');
    expect(html).not.toContain('pays 2,400 for the reader');
    expect(html).not.toContain('reader rows land [40, 50)');
    expect(html).not.toContain('reads leaf rows [40, 50) and pays');
    const nums = [...html.matchAll(/class="num"[^>]*>(\d+)<\/text>/g)].map(
      m => m[1],
    );
    expect(nums).toEqual(['2', '5']);
  });

  it('omits the svg aria-label when no caption resolves', () => {
    const q: Ruling = {
      opts: [
        { c: 'c', g: 'g', k: 'a', rec: true, t: 'a' },
        { c: 'c', g: 'g', k: 'b', t: 'b' },
      ],
      seq: {
        lanes: ['l', 'r'],
        steps: [{ f: 0, k: 'call', t: 1, x: 'hi' }],
      },
    };
    expect(seqView(q, 'G9', 'G9a')).not.toContain('aria-label');
    expect(seqView(q, 'G9', 'today')).not.toContain('aria-label');
  });

  it('threads the ledger through undrawn steps so drawn balances are true', () => {
    const q: Ruling = {
      opts: [
        { c: 'c', g: 'g', k: 'a', rec: true, t: 'a' },
        { c: 'c', g: 'g', k: 'b', t: 'b' },
      ],
      seq: {
        lanes: ['l', 'r'],
        ledger: ['n'],
        start: [0],
        steps: [
          { f: 0, k: 'store', t: 1, x: 'base write', b: [5] },
          {
            f: 0,
            k: 'call',
            t: 1,
            x: 'tweak',
            o: { a: { x: 'tweaked for a' }, b: { x: 'tweaked' } },
          },
          { f: 1, k: 'check', t: 0, x: 'read', o: { b: { b: [null] } } },
        ],
      },
    };
    const html = seqView(q, 'G9', 'G9b');
    expect(html).not.toContain('base write');
    expect(html).toMatch(
      />read<\/text>(?:<\/g>)+<text class="bal"[^>]*>5<\/text>/,
    );
  });

  it('draws new and gone tags for in and del overlays', () => {
    const P = example();
    const s = P.rulings.G1.seq;
    if (!s) throw new Error('fixture: G1.seq');
    s.steps[0].in = ['b'];
    s.steps[2].o = { b: { a: 'del' } };
    expect(validatePage(P).errors).toEqual([]);
    const html = seqView(P.rulings.G1, 'G1', 'G1b');
    expect(html).toContain('tg-new');
    expect(html).toContain('tg-gone');
    expect(html).toContain('class="gone"');
    expect(html).toContain('class="strike"');
  });
});

describe('bodies view', () => {
  it('pins the today stage: shown once, what label, cap cites the real quiet, no diff', () => {
    const P = example();
    const html = bodiesToday(P.rulings.G2);
    expect(html).toMatchSnapshot();
    expect(html).toContain('The quiet walk core runs on every command, today.');
    expect(html).toContain('<code>core/src/cli.ts:139-189</code>');
    expect(html).not.toContain('diff vs today');
    expect(html).toContain('<div class="body is-today">');
    expect(html).toContain('<div class="tag"><span>built today</span>');
    expect(html).not.toContain('<span class="lt">');
    expect(html).not.toContain('data-pick');
  });

  it('pins the option diff: its own body only, prism tokens, needs chip, collapsed runs', () => {
    const P = example();
    const html = bodiesOption(P.rulings.G2, 'G2a');
    expect(html).toMatchSnapshot();
    expect(html).toContain('token keyword');
    expect(html).toContain('diff vs today');
    expect(html).toContain('<div class="tag"><span>planned</span><span class="dleg">diff vs today</span>');
    expect(html).not.toContain('<span class="lt">');
    expect(html).toContain('⋯ 33 unchanged lines');
    expect(html).not.toContain('The quiet walk core runs on every command');
  });

  it('pins the sketch body: state chip, no diff', () => {
    const P = example();
    const html = bodiesOption(P.rulings.G2, 'G2b');
    expect(html).toMatchSnapshot();
    expect(html).toContain('sketch — feasibility not checked');
    expect(html).not.toContain('diff vs today');
    expect(html).not.toContain('<span class="lt">');
  });

  it('collapses unchanged runs at seven lines, not six', () => {
    function diffCase(lineCount: number): string {
      const lines = Array.from({ length: lineCount }, (_, i) => `v${i}();`);
      const after = [...lines.slice(0, -1), `v${lineCount - 1}(1);`].join('\n');
      const q: Ruling = {
        bodies: {
          a: { lang: 'js', code: after },
          today: { lang: 'js', code: lines.join('\n') },
        },
        opts: [{ c: 'c', g: 'g', k: 'a', t: 't' }],
      };
      return bodiesOption(q, 'G9a');
    }
    expect(diffCase(8)).toContain('unchanged lines');
    expect(diffCase(7)).not.toContain('unchanged lines');
  });
});

describe('figure view', () => {
  it('pins the today stage and an option stage: markup inserted as written, cap', () => {
    const q = example().rulings.G6;
    expect(figureView(q, 'today')).toMatchSnapshot();
    const a = figureView(q, 'G6a');
    expect(a).toMatchSnapshot();
    expect(a).toContain('<div class="stage figure"><div class="fig"><div class="rcpt"');
    expect(a).not.toContain('data-pick');
  });
});

describe('the picture surfaces', () => {
  it('scopes the today measure to the head paragraph so it cannot land on a view', () => {
    expect(pageCss).toMatch(/p\.today\s*\{[^}]*max-width: 68ch/);
    expect(pageCss).not.toMatch(/(^|\})\s*\.today\s*\{/);
  });

  it('names each seq svg by its own view caption, not the ruling base cap', () => {
    const P = example();
    expect(seqView(P.rulings.G1, 'G1', 'G1b')).toContain(
      'aria-label="All 20 paid leaf blocks have an owner. The read pays Paul."',
    );
    expect(seqView(P.rulings.G1, 'G1', 'today')).toContain(
      'aria-label="Today 10 paid leaf blocks have no owner. A read of them pays no holder."',
    );
  });

  it('carries the changes legend key only on a view that changes rows', () => {
    const P = example();
    expect(seqView(P.rulings.G1, 'G1', 'G1b')).toContain(
      'what this option changes',
    );
    expect(seqView(P.rulings.G1, 'G1', 'today')).not.toContain(
      'what this option changes',
    );
    const q: Ruling = {
      opts: [
        { c: 'c', g: 'g', k: 'a', rec: true, t: 'a' },
        { c: 'c', g: 'g', k: 'b', t: 'b' },
      ],
      seq: {
        lanes: ['l', 'r'],
        steps: [{ f: 0, k: 'call', o: { a: { x: 'only a changes' } }, t: 1, x: 'hi' }],
      },
    };
    expect(seqView(q, 'G9', 'G9a')).toContain('what this option changes');
    expect(seqView(q, 'G9', 'G9b')).not.toContain('what this option changes');
    expect(seqView(q, 'G9', 'today')).not.toContain('what this option changes');
  });
});

describe('page styles and theme door', () => {
  it('fetches nothing on open: no imports, no urls, system fonts only', () => {
    expect(pageCss).not.toMatch(/@import|url\(/i);
    expect(pageCss).not.toMatch(/Newsreader|Public Sans|JetBrains|googleapis/);
    expect(pageCss).toContain('system-ui');
  });

  it('dark mode is the media query alone: no param door, no override block', () => {
    expect(pageCss).toContain('prefers-color-scheme: dark');
    expect(pageCss).not.toContain('data-theme');
  });

  it('styles the table and the compare box, not the old view cards or a tab strip', () => {
    expect(pageCss).toMatch(/\.vtable \{[^}]*border: 1px solid var\(--rule\)/);
    expect(pageCss).toMatch(/\.compare \{[^}]*border: 1px solid var\(--rule\)/);
    expect(pageCss).toMatch(/\.compare \.stage \{ border: 0/);
    expect(pageCss).not.toMatch(/\.views|\.vtt|\.vmeta|\.gc \.|\.tabs|\.tl\b/);
  });
});

