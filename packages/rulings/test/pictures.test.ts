import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { bodiesOption, bodiesToday } from '../src/bodies.ts';
import { diagramView, mermaidBoot } from '../src/diagram.ts';
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
  it('validates green with two seq rulings and a bodies ruling, no diagram', () => {
    const P = example();
    expect(P.rulings.G1.seq).toBeTruthy();
    expect(P.rulings.G2.bodies).toBeTruthy();
    expect(P.rulings.G4.seq).toBeTruthy();
    expect(P.rulings.G4.diagram).toBeFalsy();
    expect(validatePage(P).errors).toEqual([]);
  });
});

describe('seq view', () => {
  it('pins the today view: lanes, ledger, start row, legend, no tags', () => {
    const P = example();
    const html = seqView(P.rulings.G1, 'G1', 'today');
    expect(html).toMatchSnapshot();
    expect(html).toContain('class="balh"');
    expect(html).toContain('>start</text>');
    expect(html).not.toContain('tg-');
  });

  it('pins the option view: overlay expansion, changed tag, band, per-view cap', () => {
    const P = example();
    const html = seqView(P.rulings.G1, 'G1', 'G1b');
    expect(html).toMatchSnapshot();
    expect(html).toContain('tg-changed');
    expect(html).toContain('class="band"');
    expect(html).toContain('what this option changes');
    expect(html).toContain(
      'Option b: all 20 paid leaf blocks have an owner.',
    );
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
  it('pins the today block: shown once, what label, cap cites the real quiet, no diff', () => {
    const P = example();
    const html = bodiesToday(P.rulings.G2);
    expect(html).toMatchSnapshot();
    expect(html).toContain('The quiet walk core runs on every command, today.');
    expect(html).toContain('<code>core/src/cli.ts:139-189</code>');
    expect(html).not.toContain('diff vs today');
    expect(html).toContain('class="view today"');
  });

  it('pins the option diff: its own body only, prism tokens, needs chip, collapsed runs', () => {
    const P = example();
    const html = bodiesOption(P.rulings.G2, 'G2a');
    expect(html).toMatchSnapshot();
    expect(html).toContain('token keyword');
    expect(html).toContain('diff vs today');
    expect(html).toContain('⋯ 33 unchanged lines');
    expect(html).toContain('needs G1a');
    expect(html).not.toContain('The quiet walk core runs on every command');
  });

  it('pins the sketch body: state chip, no diff', () => {
    const P = example();
    const html = bodiesOption(P.rulings.G2, 'G2b');
    expect(html).toMatchSnapshot();
    expect(html).toContain('sketch — feasibility not checked');
    expect(html).not.toContain('diff vs today');
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

function diagramRuling(): Ruling {
  return {
    opts: [
      { c: 'c', g: 'g', k: 'a', rec: true, t: 'Re-arm on start' },
      { c: 'c', g: 'g', k: 'b', t: 'Re-arm in the read' },
    ],
    diagram: {
      cap: '<b>Today a crash loses the window.</b>',
      views: {
        today: {
          text: 'flowchart TD\n  R[daemon restarts] --> L[window lost]',
        },
        a: {
          cap: '<b>Option a: the daemon re-arms from Postgres.</b>',
          text: 'flowchart TD\n  R[daemon restarts] --> S[window read from Postgres] --> A[the read pays the band]',
        },
        b: {
          text: 'flowchart TD\n  R[daemon restarts] --> C[the read re-arms the window] --> A[the read pays the band]',
        },
      },
    },
  };
}

describe('diagram view', () => {
  it('pins the today view and an option view: container, escaped text, cap, head', () => {
    const q = diagramRuling();
    expect(diagramView(q, 'today')).toMatchSnapshot();
    const a = diagramView(q, 'G4a');
    expect(a).toMatchSnapshot();
    expect(a).toContain('class="mermaid"');
    expect(a).toContain('--&gt;');
    expect(a).toContain('Option a: the daemon re-arms from Postgres.');
  });

  it('emits exactly one mermaid container per view', () => {
    const q = diagramRuling();
    const all = ['today', 'G4a', 'G4b'].map(v => diagramView(q, v)).join('');
    expect(all.match(/class="mermaid"/g)).toHaveLength(3);
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
      'aria-label="Option b: all 20 paid leaf blocks have an owner. The read pays Paul."',
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

describe('the mermaid boot', () => {
  interface Draw {
    sel: string;
    seen: string[];
    hadProcessed: boolean[];
  }

  // The boot ships as static script text, so its behavior is tested by
  // running the real bytes in a vm: a fake matchMedia, a fake mermaid that
  // stamps each container as processed, and the containers it renders.
  function bootedOn(dark: boolean) {
    const authored = ['flowchart TD\n  A --> B', 'flowchart TD\n  C --> D'];
    const nodes = authored.map(src => {
      const attrs: Record<string, string> = {};
      return {
        attrs,
        textContent: src,
        setAttribute(n: string, v: string): void {
          attrs[n] = v;
        },
        removeAttribute(n: string): void {
          delete attrs[n];
        },
      };
    });
    const inits: unknown[] = [];
    const draws: Draw[] = [];
    let flip: ((e: { matches: boolean }) => void) | null = null;
    const mq = {
      matches: dark,
      addEventListener(_t: string, fn: (e: { matches: boolean }) => void) {
        flip = fn;
      },
    };
    const queries: string[] = [];
    const sandbox = {
      document: { querySelectorAll: (sel: string) => sel === '.mermaid' ? nodes : [] },
      window: {
        matchMedia(q: string): typeof mq {
          queries.push(q);
          return mq;
        },
        mermaid: {
          initialize(cfg: unknown): void {
            inits.push(cfg);
          },
          run({ querySelector }: { querySelector: string }): void {
            draws.push({
              sel: querySelector,
              seen: nodes.map(n => n.textContent),
              hadProcessed: nodes.map(n => 'data-processed' in n.attrs),
            });
            nodes.forEach(n => {
              n.setAttribute('data-processed', 'yes');
              n.textContent = '<svg>rendered</svg>';
            });
          },
        },
      },
    };
    const code = mermaidBoot()
      .replace(/^<script>\n/, '')
      .replace(/<\/script>$/, '');
    vm.runInNewContext(code, sandbox);
    return {
      draws,
      inits,
      queries,
      flipTo(d: boolean): void {
        mq.matches = d;
        flip?.({ matches: d });
      },
    };
  }

  it('boots every container under the system theme alone', () => {
    const m = bootedOn(false);
    expect(m.queries).toEqual(['(prefers-color-scheme: dark)']);
    expect(m.inits).toEqual([{ startOnLoad: false, theme: 'default' }]);
    expect(m.draws).toHaveLength(1);
    expect(m.draws[0].sel).toBe('.mermaid');
    expect(m.draws[0].seen).toEqual([
      'flowchart TD\n  A --> B',
      'flowchart TD\n  C --> D',
    ]);
    expect(bootedOn(true).inits).toEqual([{ startOnLoad: false, theme: 'dark' }]);
  });

  it('re-renders from the authored source when the scheme flips, without reload', () => {
    const m = bootedOn(false);
    m.flipTo(true);
    expect(m.inits[1]).toEqual({ startOnLoad: false, theme: 'dark' });
    expect(m.draws).toHaveLength(2);
    expect(m.draws[1].seen).toEqual([
      'flowchart TD\n  A --> B',
      'flowchart TD\n  C --> D',
    ]);
    expect(m.draws[1].hadProcessed).toEqual([false, false]);
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
});

describe('vendored mermaid', () => {
  it('ships an unmodified classic-script bundle under the size stop', () => {
    const text = readFileSync(
      fileURLToPath(new URL('../src/vendor/mermaid.min.js', import.meta.url)),
      'utf8',
    );
    expect(text).toMatch(
      /^\/\/ vendored: mermaid@\d+\.\d+\.\d+ dist\/mermaid\.min\.js \(unmodified upstream build[^)]*\)/,
    );
    expect(text).toContain('globalThis["mermaid"]');
    expect(text.length).toBeLessThan(5_000_000);
  });
});
