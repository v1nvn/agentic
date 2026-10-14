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

const allText = (r: { errors: string[]; warnings: string[] }) =>
  [...r.errors, ...r.warnings].join('\n');

describe('cut fields reject as unknown keys', () => {
  it.each([
    ['page key', (P: any) => (P.key = 'rulings-example')],
    ['group quick', (P: any) => (P.groups[0].quick = ['G1'])],
    ['ruling when', (P: any) => (P.rulings.G1.when = 'G2a')],
    ['opt withdrawn', (P: any) => (P.rulings.G1.opts[0].withdrawn = 'reason')],
    ['ruling fix', (P: any) => (P.rulings.G1.fix = 'x')],
    ['ruling context', (P: any) => (P.rulings.G1.context = 'x')],
    ['ruling story', (P: any) => (P.rulings.G1.story = 'x')],
    ['ruling odds', (P: any) => (P.rulings.G1.odds = 'x')],
    ['ruling extra', (P: any) => (P.rulings.G1.extra = 'x')],
    ['ruling before', (P: any) => (P.rulings.G1.before = 'x')],
    ['body from', (P: any) => (P.rulings.G2.bodies.today.from = 'src/cli.ts:8')],
  ])('%s', (_name, mutate) => {
    const P = loadExample();
    (mutate as (page: any) => void)(P);
    const r = validatePage(P);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('the grown example parses green', () => {
  it('carries w, cap, what, needs and one merged ruling with zero errors', () => {
    const P = loadExample();
    expect(P.rulings.G2.opts[1].w).toBeTruthy();
    expect(P.rulings.G2.bodies.today.what).toBeTruthy();
    expect(P.rulings.G2.bodies.today.cap).toBeTruthy();
    expect(P.rulings.G2.opts[0].needs).toBe('G1a');
    expect(P.rulings.G3.merged).toBe('G1');
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
  });
});

describe('refinements fire on crafted-red fixtures', () => {
  it('needs exactly one recommended option', () => {
    const P = loadExample();
    delete P.rulings.G1.opts[0].rec;
    expect(allText(validatePage(P))).toContain(
      'G1 needs exactly one recommended option, has 0',
    );
    const Q = loadExample();
    Q.rulings.G1.opts[1].rec = true;
    expect(allText(validatePage(Q))).toContain(
      'G1 needs exactly one recommended option, has 2',
    );
  });

  it('two live options minimum, four maximum', () => {
    const P = loadExample();
    P.rulings.G1.opts = [P.rulings.G1.opts[0]];
    expect(allText(validatePage(P))).toContain(
      'G1 needs at least two live options, has 1',
    );
    const Q = loadExample();
    for (const k of ['c', 'd', 'e']) {
      const clone = structuredClone(Q.rulings.G1.opts[1]);
      clone.k = k;
      delete clone.rec;
      Q.rulings.G1.opts.push(clone);
    }
    expect(allText(validatePage(Q))).toContain('G1 has 5 live options; four is the limit');
  });

  it('at most one option is today', () => {
    const P = loadExample();
    P.rulings.G1.opts[1].today = true;
    expect(allText(validatePage(P))).toContain('G1: only one option can be today');
  });

  it('title ends in a question mark', () => {
    const P = loadExample();
    P.rulings.G1.title = 'Who owns a leaf block inside its reader’s window';
    expect(allText(validatePage(P))).toContain('G1.title must be the decision as a question');
  });

  it('stake carries a digit', () => {
    const P = loadExample();
    P.rulings.G1.stake =
      '<b>In every tree, a read of ten paid leaf blocks pays no owner, and no surface shows it.</b>';
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G1.stake has no number');
  });

  it('stake names no code internal', () => {
    const P = loadExample();
    P.rulings.G1.stake += ' It shows in <code>pool_list</code>.';
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G1.stake names an internal thing');
  });

  it('stake and today share at most half their words', () => {
    const P = loadExample();
    P.rulings.G1.stake = `<b>${P.rulings.G1.today}</b>`;
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G1.stake and G1.today share more than half');
  });

  it('near-duplicate today texts across rulings', () => {
    const P = loadExample();
    P.rulings.G2.today = P.rulings.G1.today;
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('say nearly the same thing');
  });

  it('vague words in gain and cost', () => {
    const P = loadExample();
    P.rulings.G1.opts[0].g = 'cleaner and more robust';
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('uses a word the owner cannot check');
  });

  it('caption opens with its conclusion', () => {
    const P = loadExample();
    P.rulings.G1.seq.cap = 'Today 10 paid leaf blocks have no owner.';
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G1.seq.cap should open with its conclusion');
  });

  it('body lines fit 76 characters', () => {
    const P = loadExample();
    P.rulings.G2.bodies.today.code += `\n${'x'.repeat(80)}`;
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G2.bodies.today has a line of 80 characters');
  });

  it('an option body identical to today changes nothing', () => {
    const P = loadExample();
    P.rulings.G2.bodies.a.code = P.rulings.G2.bodies.today.code;
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('G2.bodies.a is identical to today');
  });

  it('every live option has a picture', () => {
    const P = loadExample();
    delete P.rulings.G2.bodies.b;
    expect(allText(validatePage(P))).toContain('G2b has no picture of its own');
  });

  it('ledger widths match', () => {
    const P = loadExample();
    P.rulings.G1.seq.start = [0, 0];
    expect(allText(validatePage(P))).toContain(
      'G1.seq.start must hold one value per ledger column (3)',
    );
    const Q = loadExample();
    Q.rulings.G1.seq.steps[1].b = [10, 10];
    expect(allText(validatePage(Q))).toContain(
      'G1.seq.steps[1].b must hold one value per ledger column (3)',
    );
  });

  it('ruling ids and group references close', () => {
    const P = loadExample();
    P.groups = [P.groups[0]];
    expect(allText(validatePage(P))).toContain('G2 is in PAGE.rulings but in no group');
    const Q = loadExample();
    Q.groups[1].rulings = ['G9'];
    expect(allText(validatePage(Q))).toContain('G9 is in group code but not in PAGE.rulings');
    const M = loadExample();
    M.groups[0].rulings = ['G1', 'G3', 'G1'];
    expect(allText(validatePage(M))).toContain('G1 is in two groups');
  });

  it('needs references close', () => {
    const P = loadExample();
    P.rulings.G2.opts[0].needs = 'G9z';
    expect(allText(validatePage(P))).toContain(
      'G2a.needs "G9z" is not a live option on this page',
    );
  });

  it('letter n stays reserved', () => {
    const P = loadExample();
    P.rulings.G1.opts[1].k = 'n';
    P.rulings.G1.seq.caps = {};
    expect(allText(validatePage(P))).toContain('letter n is reserved');
  });

  it('a merged ruling names a real, unmerged ruling', () => {
    const P = loadExample();
    P.rulings.G3.merged = 'G9';
    expect(allText(validatePage(P))).toContain(
      'G3.merged names G9, which is not a ruling',
    );
    const Q = loadExample();
    Q.rulings.G4 = { title: 'Chain?', merged: 'G3', changed: 'one too far' };
    Q.groups[0].rulings.push('G4');
    expect(allText(validatePage(Q))).toContain(
      'G4 is merged into G3, which is itself merged',
    );
  });

  it('one picture kind per ruling', () => {
    const P = loadExample();
    P.rulings.G1.bodies = { today: { code: 'x' } };
    expect(allText(validatePage(P))).toContain('G1 has both a seq and bodies');
  });

  it('a body key names a live option that is not today', () => {
    const P = loadExample();
    P.rulings.G2.bodies.z = { code: 'x' };
    expect(allText(validatePage(P))).toContain(
      'G2.bodies.z names no live option that is not today',
    );
  });

  it('seq views name live options', () => {
    const P = loadExample();
    P.rulings.G1.seq.steps[1].o = { z: { x: 'no such view' } };
    expect(allText(validatePage(P))).toContain(
      'G1.seq.steps[1].o names "z", which is not a live option',
    );
  });

  it('step lanes stay in range', () => {
    const P = loadExample();
    P.rulings.G1.seq.steps[0].f = 9;
    expect(allText(validatePage(P))).toContain(
      'G1.seq.steps[0] f and t must be lane indexes 0…3',
    );
  });
});

describe('shape rejects at the schema door', () => {
  it('a bad group id, ruling id, option letter, overlay tag, state and lang all reject', () => {
    const cases: [(P: any) => void, string][] = [
      [(P) => (P.groups[0].id = 'Money'), 'slug'],
      [(P) => (P.rulings.X1 = { title: 'x', stake: 's', today: 't', opts: [] }), 'G1'],
      [(P) => (P.rulings.G1.opts[0].k = 'A'), 'letter'],
      [(P) => (P.rulings.G1.seq.steps[1].o.b.a = 'swap'), 'chg'],
      [(P) => (P.rulings.G2.bodies.b.state = 'dream'), 'state'],
      [(P) => (P.rulings.G2.bodies.today.lang = 'rust'), 'lang'],
      [(P) => (P.rulings.G2.opts[0].needs = 7), 'needs'],
    ];
    for (const [mutate] of cases) {
      const P = loadExample();
      mutate(P);
      expect(validatePage(P).errors.length).toBeGreaterThan(0);
    }
  });

  it('a needs array closes every entry', () => {
    const P = loadExample();
    P.rulings.G2.opts[0].needs = ['G1a', 'G1b'];
    expect(validatePage(P).errors).toEqual([]);
    P.rulings.G2.opts[0].needs = ['G1a', 'G9z'];
    expect(allText(validatePage(P))).toContain('G9z');
  });
});

describe('errors block, warnings print', () => {
  it('an errors page reports errors and no warnings', () => {
    const P = loadExample();
    delete P.rulings.G1.opts[0].rec;
    const r = validatePage(P);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.warnings).toEqual([]);
  });

  it('eleven rulings warn and nothing else errors', () => {
    const P = loadExample();
    for (let i = 4; i <= 12; i++) {
      P.rulings[`G${i}`] = structuredClone(P.rulings.G2);
      P.groups[1].rulings.push(`G${i}`);
    }
    const r = validatePage(P);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toContain('11 rulings on one page; past ten');
  });
});
