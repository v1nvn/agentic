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

describe('the example carries all three kinds', () => {
  it('validates green with a seq, a bodies and a diagram ruling', () => {
    const P = example();
    expect(P.rulings.G1.seq).toBeTruthy();
    expect(P.rulings.G2.bodies).toBeTruthy();
    expect(P.rulings.G4.diagram).toBeTruthy();
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
  it('pins the today block: shown once, what label, cap caption, no diff', () => {
    const P = example();
    const html = bodiesToday(P.rulings.G2);
    expect(html).toMatchSnapshot();
    expect(html).toContain('The quiet walk core runs on every command, today.');
    expect(html).not.toContain('diff vs today');
    expect(html).toContain('class="view today"');
  });

  it('pins the option diff: its own body only, prism tokens, needs chip', () => {
    const P = example();
    const html = bodiesOption(P.rulings.G2, 'G2a');
    expect(html).toMatchSnapshot();
    expect(html).toContain('token keyword');
    expect(html).toContain('diff vs today');
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

describe('diagram view', () => {
  it('pins the today view and an option view: container, escaped text, cap, head', () => {
    const P = example();
    expect(diagramView(P.rulings.G4, 'today')).toMatchSnapshot();
    const a = diagramView(P.rulings.G4, 'G4a');
    expect(a).toMatchSnapshot();
    expect(a).toContain('class="mermaid"');
    expect(a).toContain(
      'Option a: the daemon re-arms its windows from Postgres on start.',
    );
  });

  it('emits exactly one mermaid container per view', () => {
    const P = example();
    const all = ['today', 'G4a', 'G4b']
      .map(v => diagramView(P.rulings.G4, v))
      .join('');
    expect(all.match(/class="mermaid"/g)).toHaveLength(3);
  });

  it('boots mermaid on the system theme alone', () => {
    const boot = mermaidBoot();
    expect(boot).toContain('prefers-color-scheme: dark');
    expect(boot).not.toContain('data-theme');
    expect(boot).toContain(".run({ querySelector: '.mermaid' })");
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
