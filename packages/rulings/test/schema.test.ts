import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import { validatePage } from '../src/schema.ts';

/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures are mutated per field under test */

function loadExample(): any {
  const text = readFileSync(
    fileURLToPath(new URL('../src/example.page.js', import.meta.url)),
    'utf8',
  );
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(text, ctx);
  return structuredClone(ctx.PAGE);
}

const allText = (r: { errors: string[] }) => r.errors.join('\n');

const errorsOf = (P: any) => validatePage(P).errors;

describe('the example', () => {
  it('validates green', () => {
    expect(errorsOf(loadExample())).toEqual([]);
  });
});

describe('the retired fields reject at the schema door', () => {
  it.each([
    ['groups', (P: any) => (P.groups = [])],
    ['notes', (P: any) => (P.notes = [])],
    ['today', (P: any) => (P.rulings.G5.today = 'x')],
    ['g', (P: any) => (P.rulings.G5.opts[0].g = 'x')],
    ['needs', (P: any) => (P.rulings.G5.opts[0].needs = 'G1a')],
    ['merged', (P: any) => (P.rulings.G5.merged = 'G1')],
  ])('%s', (key, edit) => {
    const P = loadExample();
    edit(P);
    expect(allText(validatePage(P))).toContain(key);
  });
});

describe('the scorecard', () => {
  it('every option answers every row', () => {
    const P = loadExample();
    delete P.rulings.G5.rows[1].marks.b;
    expect(allText(validatePage(P))).toContain('G5.rows[1] has no mark for b');
  });

  it('a row that marks every option the same goes', () => {
    const P = loadExample();
    P.rulings.G5.rows[1].marks.b[0] = 'cost';
    expect(allText(validatePage(P))).toContain(
      'G5.rows[1] marks every option the same',
    );
  });

  it('a ruling has a row on the stake', () => {
    const P = loadExample();
    P.rulings.G5.rows[0].on = 'beyond';
    expect(allText(validatePage(P))).toContain('G5 has no row on the stake');
  });

  it('every option carries a cost', () => {
    const P = loadExample();
    P.rulings.G5.rows[1].marks.a = ['mixed', 'Reads stop for a minute.'];
    expect(allText(validatePage(P))).toContain('G5a has no cost in any row');
  });

  it('a mark names a live option', () => {
    const P = loadExample();
    P.rulings.G5.rows[0].marks.z = ['gain', 'x'];
    expect(allText(validatePage(P))).toContain(
      'G5.rows[0].marks.z names no live option',
    );
  });

  it('a mark is gain, mixed or cost', () => {
    const P = loadExample();
    P.rulings.G5.rows[0].marks.a[0] = 'win';
    expect(errorsOf(P).length).toBeGreaterThan(0);
  });

  it('a reason uses words the owner can check', () => {
    const P = loadExample();
    P.rulings.G5.rows[0].marks.a[1] = 'A cleaner start.';
    expect(allText(validatePage(P))).toContain(
      'a word the owner cannot check ("cleaner")',
    );
  });

  it('why is required', () => {
    const P = loadExample();
    delete P.rulings.G5.why;
    expect(allText(validatePage(P))).toContain('G5.why');
  });
});

describe('plain words on the reading line', () => {
  it.each([
    [
      'stake',
      (P: any) => (P.rulings.G5.stake = 'The <code>start_check</code> fails.'),
    ],
    [
      'title',
      (P: any) => (P.rulings.G5.title = 'Does <code>serve</code> stop?'),
    ],
    [
      'option title',
      (P: any) => (P.rulings.G5.opts[0].t = 'Return <code>Err</code>'),
    ],
    [
      'row label',
      (P: any) => (P.rulings.G5.rows[0].label = 'The <code>log</code> line'),
    ],
    [
      'reason',
      (P: any) =>
        (P.rulings.G5.rows[0].marks.a[1] = 'Uses <code>bail!</code>.'),
    ],
    ['why', (P: any) => (P.rulings.G5.why = 'a, because <code>x</code>.')],
    [
      'decided line',
      (P: any) => (P.decided[0] = 'The <code>band</code> is fine.'),
    ],
    [
      'picture caption',
      (P: any) =>
        (P.rulings.G2.bodies.a.cap = 'Drops <code>exitOverride</code>.'),
    ],
  ])('<code> in a %s rejects', (_, edit) => {
    const P = loadExample();
    edit(P);
    expect(allText(validatePage(P))).toContain('carries <code>');
  });

  it('a file:line anchor rejects', () => {
    const P = loadExample();
    P.rulings.G5.rows[0].marks.a[1] = 'As daemon/src/start.rs:41 does.';
    expect(allText(validatePage(P))).toContain('cites daemon/src/start.rs:41');
  });
});

describe('rounds', () => {
  it('a waiting ruling is a title and after alone', () => {
    const P = loadExample();
    P.rulings.G3.stake = 'x';
    expect(allText(validatePage(P))).toContain(
      'a waiting ruling is a title and after alone, not stake',
    );
  });

  it('a ruling without options waits on something', () => {
    const P = loadExample();
    delete P.rulings.G3.after;
    expect(allText(validatePage(P))).toContain(
      'G3 has no options and waits on nothing',
    );
  });

  it('after names another ruling on the page', () => {
    const P = loadExample();
    P.rulings.G3.after = 'G9';
    expect(allText(validatePage(P))).toContain('G3.after names G9');
  });

  it('a written ruling never rests on an unruled one', () => {
    const P = loadExample();
    P.rulings.G5.after = 'G1';
    expect(allText(validatePage(P))).toContain(
      'G5 is written but rests on G1, which is not ruled',
    );
  });

  it('a ruling waiting on a ruled one is written now', () => {
    const P = loadExample();
    P.rulings.G1.ruled = 'a';
    expect(allText(validatePage(P))).toContain(
      'G3 waits on G1, which is ruled',
    );
  });

  it('ruled names one of its options or n', () => {
    const P = loadExample();
    P.rulings.G5.ruled = 'z';
    expect(allText(validatePage(P))).toContain('G5.ruled names z');
  });
});

describe('options', () => {
  it('needs exactly one recommended option', () => {
    const P = loadExample();
    P.rulings.G5.opts[1].rec = true;
    expect(allText(validatePage(P))).toContain(
      'G5 needs exactly one recommended option, has 2',
    );
  });

  it('two live options minimum, four maximum', () => {
    const P = loadExample();
    P.rulings.G5.opts = [P.rulings.G5.opts[0]];
    expect(allText(validatePage(P))).toContain(
      'G5 needs at least two live options, has 1',
    );
  });

  it('a cut option keeps its letter out of reuse', () => {
    const P = loadExample();
    P.rulings.G6.cut[0].k = 'a';
    expect(allText(validatePage(P))).toContain('G6: letter a is used twice');
  });

  it('a cut names the must it breaks', () => {
    const P = loadExample();
    delete P.rulings.G6.must;
    expect(allText(validatePage(P))).toContain(
      'G6 cuts an option but names no must',
    );
  });

  it('letter n stays reserved', () => {
    const P = loadExample();
    P.rulings.G5.opts[1].k = 'n';
    expect(allText(validatePage(P))).toContain('letter n is reserved');
  });

  it('the title is a question', () => {
    const P = loadExample();
    P.rulings.G5.title = 'Refuse on a failed check';
    expect(allText(validatePage(P))).toContain(
      'G5.title must be the decision as a question',
    );
  });

  it('more than ten rulings to rule on one page', () => {
    const P = loadExample();
    for (let i = 10; i < 16; i++)
      P.rulings[`G${i}`] = structuredClone(P.rulings.G5);
    expect(allText(validatePage(P))).toContain(
      '11 rulings to rule on one page',
    );
  });
});

describe('pictures', () => {
  it.each([
    ['<p>ok<script>alert(1)</script></p>', 'runs script'],
    ['<svg><rect onclick="x()"/></svg>', 'runs script'],
    [
      '<style>.vrow { display: none }</style>',
      'carries a <style> block, which restyles the whole page',
    ],
    ['<img src="https://example.com/a.png">', 'loads from outside the page'],
    [
      '<svg><image href="//cdn.example/a.svg"/></svg>',
      'loads from outside the page',
    ],
    ['<svg><rect fill="#1b2130"/></svg>', 'paints a literal colour'],
    [
      '<div style="border: 1px solid rgb(0, 0, 0)">x</div>',
      'paints a literal colour',
    ],
    ['<div><p>left open</div>', 'breaks the page layout: </div> closes <p>'],
    ['<div>x', 'breaks the page layout: <div> is never closed'],
  ])('a figure view %s is refused', (html, said) => {
    const P = loadExample();
    P.rulings.G6.figure.views.a.html = html;
    expect(allText(validatePage(P))).toContain(
      `G6.figure.views.a.html ${said}`,
    );
  });

  it('a figure view using tokens, void tags, self-closing SVG and data: URIs passes', () => {
    const P = loadExample();
    P.rulings.G6.figure.views.a.html =
      '<div style="color: var(--muted)"><img src="data:image/png;base64,AA"><br>' +
      '<svg viewBox="0 0 10 10"><rect fill="var(--o)" width="4" height="4"/></svg></div>';
    expect(validatePage(P).errors).toEqual([]);
  });

  it('a caption that leads with Today passes at a per-view home', () => {
    const P = loadExample();
    P.rulings.G1.seq.caps.b =
      '<b>Today 10 paid leaf blocks have no owner.</b> A read of them pays no holder.';
    expect(validatePage(P).errors).toEqual([]);
  });

  it('two rulings never draw the same steps', () => {
    const P = loadExample();
    P.rulings.G4.seq = structuredClone(P.rulings.G1.seq);
    expect(allText(validatePage(P))).toContain(
      'G1.seq and G4.seq draw the same steps',
    );
  });

  it('an option body identical to today changes nothing', () => {
    const P = loadExample();
    P.rulings.G2.bodies.a.code = P.rulings.G2.bodies.today.code;
    expect(allText(validatePage(P))).toContain(
      'G2.bodies.a is identical to today',
    );
  });

  it('every live option has a picture', () => {
    const P = loadExample();
    delete P.rulings.G2.bodies.b;
    expect(allText(validatePage(P))).toContain('G2b has no picture of its own');
  });

  it('a picture without a today view fails its today option', () => {
    const P = loadExample();
    delete P.rulings.G6.figure.views.today;
    expect(allText(validatePage(P))).toContain(
      'G6b is today, but the picture has no today view',
    );
  });

  it('one picture kind per ruling', () => {
    const P = loadExample();
    P.rulings.G2.figure = structuredClone(P.rulings.G6.figure);
    expect(allText(validatePage(P))).toContain(
      'G2 has both bodies and a figure',
    );
  });

  it('every caption opens with its conclusion', () => {
    const P = loadExample();
    P.rulings.G1.seq.caps.b = 'All 20 paid leaf blocks have an owner.';
    expect(allText(validatePage(P))).toContain(
      'G1.seq.caps.b must open with its conclusion',
    );
  });

  it('a caption opening with the option label rejects', () => {
    const P = loadExample();
    P.rulings.G6.figure.views.a.cap = '<b>Option a: a line</b> is added.';
    expect(allText(validatePage(P))).toContain('opens with an option label');
  });

  it('ledger widths match', () => {
    const P = loadExample();
    P.rulings.G1.seq.steps[1].b = [10];
    expect(allText(validatePage(P))).toContain(
      'G1.seq.steps[1].b must hold one value per ledger column (3)',
    );
  });

  it('step lanes stay in range', () => {
    const P = loadExample();
    P.rulings.G1.seq.steps[0].t = 9;
    expect(allText(validatePage(P))).toContain(
      'G1.seq.steps[0] f and t must be lane indexes 0…3',
    );
  });

  it('seq views name live options that are not today', () => {
    const P = loadExample();
    P.rulings.G1.seq.steps[1].o.a = { x: 'today rewritten' };
    expect(allText(validatePage(P))).toContain(
      'names "a", which is not a live option that is not today',
    );
  });
});
