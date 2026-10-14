import { diffLines } from 'diff';
import { z } from 'zod';

const LONG_LINE = 76;
export const KINDS = ['call', 'money', 'store', 'check', 'fail'] as const;
const LANGS = ['ts', 'js', 'json', 'bash', 'markup', 'css'] as const;
const VAGUE =
  /\b(more flexible|flexibility|cleaner|more robust|scalable|future[- ]proof|best practice|more maintainable|more elegant)\b/i;
const SLUG = /^[a-z][a-z0-9-]*$/;
const RULING_ID = /^G\d+$/;
const LETTER = /^[a-z]$/;

const cell = z.union([z.number(), z.string(), z.null()]);

const overlay = z.strictObject({
  a: z.enum(['chg', 'del']).optional(),
  b: z.array(cell).optional(),
  n: z.string().optional(),
  s: z.string().optional(),
  x: z.string().optional(),
});

const step = z.strictObject({
  b: z.array(cell).optional(),
  f: z.number().int(),
  in: z.array(z.string()).optional(),
  k: z.enum(KINDS),
  o: z.record(z.string(), overlay).optional(),
  s: z.string().optional(),
  t: z.number().int(),
  x: z.string().optional(),
});

const seq = z.strictObject({
  cap: z.string().optional(),
  caps: z.record(z.string(), z.string()).optional(),
  lanes: z.array(z.string()).min(2),
  ledger: z.array(z.string()).optional(),
  start: z.array(cell).optional(),
  steps: z.array(step).min(1),
});

const body = z.strictObject({
  cap: z.string().optional(),
  code: z.string().optional(),
  diff: z.boolean().optional(),
  lang: z.enum(LANGS).optional(),
  state: z.enum(['built today', 'plan as written', 'sketch']).optional(),
  what: z.string().optional(),
});

const diagramBody = z.strictObject({
  cap: z.string().optional(),
  text: z.string(),
});

const diagram = z.strictObject({
  cap: z.string().optional(),
  views: z.record(z.string(), diagramBody),
});

const opt = z.strictObject({
  c: z.string().optional(),
  g: z.string().optional(),
  k: z.string().regex(LETTER, {
    message: 'option letter must be one lowercase letter',
  }),
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  rec: z.boolean().optional(),
  t: z.string().optional(),
  today: z.boolean().optional(),
  w: z.string().optional(),
});

const ruling = z.strictObject({
  bodies: z.record(z.string(), body).optional(),
  changed: z.string().optional(),
  diagram: diagram.optional(),
  merged: z.string().regex(RULING_ID).optional(),
  opts: z.array(opt).optional(),
  stake: z.string().optional(),
  seq: seq.optional(),
  title: z.string().optional(),
  today: z.string().optional(),
});

const group = z.strictObject({
  id: z.string().regex(SLUG, { message: 'must be a lowercase slug' }),
  label: z.string().optional(),
  quick: z.boolean().optional(),
  rulings: z
    .array(z.string().regex(RULING_ID, { message: 'must look like G1, G2, …' }))
    .min(1),
});

const pageSchema = z.strictObject({
  eyebrow: z.string().optional(),
  groups: z.array(group).min(1),
  key: z.string().min(1).optional(),
  notes: z.array(z.strictObject({ html: z.string().optional() })).optional(),
  rulings: z.record(
    z.string().regex(RULING_ID, { message: 'must look like G1, G2, …' }),
    ruling,
  ),
  sub: z.string().optional(),
  title: z.string().optional(),
});

export type Opt = z.infer<typeof opt>;
export type Body = z.infer<typeof body>;
export type Diagram = z.infer<typeof diagram>;
export type Overlay = z.infer<typeof overlay>;
export type Ruling = z.infer<typeof ruling>;
export type Seq = z.infer<typeof seq>;
export type Step = z.infer<typeof step>;
export type Page = z.infer<typeof pageSchema>;
export interface Verdict {
  errors: string[];
  warnings: string[];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

function words(t: string): string[] {
  return stripTags(t)
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 0);
}

function overlap(x: string, y: string): number {
  const a = words(x);
  const b = new Set(words(y));
  return a.length === 0 ? 0 : a.filter(w => b.has(w)).length / a.length;
}

export function seqViews(d: Seq, owner: string): string[] {
  function full(v: string): string {
    return LETTER.test(v) ? owner + v : v;
  }
  const vs = new Set<string>();
  for (const st of d.steps) {
    for (const v of st.in ?? []) {
      vs.add(full(v));
    }
    for (const v of Object.keys(st.o ?? {})) {
      vs.add(full(v));
    }
  }
  return [...vs].sort();
}

function flow(q: Ruling): string {
  return q.seq ? q.seq.steps.map(st => st.x ?? '').join('|') : '';
}

function longestLine(code: string): number {
  return code.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
}

export function validatePage(input: unknown): Verdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const at = issue.path.join('.');
      errors.push(at ? `${at}: ${issue.message}` : issue.message);
    }
    return { errors, warnings };
  }
  const P = parsed.data;
  const R = P.rulings;

  function blank(v: unknown): boolean {
    return (
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '')
    );
  }
  function req(v: unknown, what: string): void {
    if (blank(v)) {
      errors.push(`${what} is missing`);
    }
  }
  function conclusionFirst(v: string | undefined, what: string): void {
    if (!blank(v) && !/^\s*<b>/.test(v ?? '')) {
      warnings.push(`${what} should open with its conclusion in <b>…</b>`);
    }
  }
  function optionExists(ref: string): boolean {
    const m = /^(G\d+)([a-z])$/.exec(ref);
    if (!m) {
      return false;
    }
    const target = R[m[1]];
    if (!(m[1] in R) || target.merged !== undefined) {
      return false;
    }
    return (target.opts ?? []).some(x => x.k === m[2]);
  }
  function checkSeq(d: Seq, where: string, owner: string): void {
    const L = d.lanes.length;
    req(d.cap, `${where}.cap (the caption: its conclusion in <b>…</b>)`);
    conclusionFirst(d.cap, `${where}.cap`);
    const nb = (d.ledger ?? []).length;
    if (nb > 0 && d.start?.length !== nb) {
      errors.push(
        `${where}.start must hold one value per ledger column (${nb})`,
      );
    }
    function viewOk(v: string): boolean {
      return optionExists(LETTER.test(v) ? owner + v : v);
    }
    for (const [i, st] of d.steps.entries()) {
      const at = `${where}.steps[${i}]`;
      if (!(st.f >= 0 && st.f < L) || !(st.t >= 0 && st.t < L)) {
        errors.push(`${at} f and t must be lane indexes 0…${L - 1}`);
      }
      req(st.x, `${at}.x (what happens)`);
      if (st.b !== undefined && st.b.length !== nb) {
        errors.push(`${at}.b must hold one value per ledger column (${nb})`);
      }
      for (const v of st.in ?? []) {
        if (!viewOk(v)) {
          errors.push(`${at}.in names "${v}", which is not a live option`);
        }
      }
      for (const [v, ov] of Object.entries(st.o ?? {})) {
        if (!viewOk(v)) {
          errors.push(`${at}.o names "${v}", which is not a live option`);
        }
        if (ov.b !== undefined && ov.b.length !== nb) {
          errors.push(
            `${at}.o.${v}.b must hold one value per ledger column (${nb})`,
          );
        }
      }
    }
    for (const v of Object.keys(d.caps ?? {})) {
      if (!viewOk(v)) {
        errors.push(`${where}.caps names "${v}", which is not a live option`);
      }
    }
  }

  req(P.title, 'PAGE.title');
  req(P.sub, 'PAGE.sub');
  for (const [i, n] of (P.notes ?? []).entries()) {
    req(n.html, `notes[${i}].html`);
  }

  const seen: Record<string, string> = {};
  const gids = new Set<string>();
  for (const g of P.groups) {
    if (gids.has(g.id)) {
      errors.push(`group id "${g.id}" is used twice`);
    }
    gids.add(g.id);
    req(g.label, `group ${g.id}.label`);
    for (const id of g.rulings) {
      if (seen[id]) {
        errors.push(`${id} is in two groups (${seen[id]}, ${g.id})`);
      }
      seen[id] = g.id;
      if (!(id in R)) {
        errors.push(`${id} is in group ${g.id} but not in PAGE.rulings`);
      }
    }
  }
  for (const id of Object.keys(R)) {
    if (!seen[id]) {
      errors.push(`${id} is in PAGE.rulings but in no group`);
    }
  }

  const live = Object.entries(R).filter(([, q]) => q.merged === undefined);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const [ai, A] = live[i];
      const [bj, B] = live[j];
      if (
        A.today !== undefined &&
        B.today !== undefined &&
        Math.min(overlap(A.today, B.today), overlap(B.today, A.today)) > 0.7
      ) {
        warnings.push(
          `${ai}.today and ${bj}.today say nearly the same thing; adapt each to its own ruling: only the parts and terms it needs`,
        );
      }
      const fa = flow(A);
      if (fa !== '' && fa === flow(B)) {
        warnings.push(
          `${ai}.seq and ${bj}.seq draw the same steps; each picture shows only what its ruling turns on`,
        );
      }
    }
  }

  for (const [id, q] of Object.entries(R)) {
    req(q.title, `${id}.title`);
    if (q.merged !== undefined) {
      const target = R[q.merged];
      if (!(q.merged in R)) {
        errors.push(`${id}.merged names ${q.merged}, which is not a ruling`);
      } else if (target.merged !== undefined) {
        errors.push(`${id} is merged into ${q.merged}, which is itself merged`);
      }
      req(q.changed, `${id}.changed (say why it merged)`);
      continue;
    }
    if (!blank(q.title) && !/\?\s*$/.test(stripTags(q.title ?? ''))) {
      errors.push(
        `${id}.title must be the decision as a question, ending in ?`,
      );
    }
    req(q.stake, `${id}.stake (who loses what, how often, who would notice)`);
    req(
      q.today,
      `${id}.today (how this part works today, in plain words, up to where it breaks)`,
    );
    if (!blank(q.stake) && !/\d/.test(stripTags(q.stake ?? ''))) {
      warnings.push(
        `${id}.stake has no number; name a real value from the case`,
      );
    }
    if (!blank(q.stake) && !blank(q.today)) {
      const sw = words(q.stake ?? '');
      const tw = new Set(words(q.today ?? ''));
      if (sw.length > 0 && sw.filter(w => tw.has(w)).length / sw.length > 0.5) {
        warnings.push(
          `${id}.stake and ${id}.today share more than half their words; each fact lives in one block`,
        );
      }
    }
    if ((q.stake ?? '').includes('<code>')) {
      warnings.push(
        `${id}.stake names an internal thing; put it in today and say what the owner sees`,
      );
    }
    const pictures: [string, unknown][] = [
      ['a seq', q.seq],
      ['bodies', q.bodies],
      ['a diagram', q.diagram],
    ];
    const present = pictures.filter(([, v]) => v !== undefined);
    if (present.length > 1) {
      errors.push(
        `${id} has both ${present[0]?.[0]} and ${present[1]?.[0]}; one picture per ruling`,
      );
    }
    if (q.seq !== undefined) {
      checkSeq(q.seq, `${id}.seq`, id);
    }

    const opts = q.opts ?? [];
    const B = q.bodies ?? {};
    for (const [k, b] of Object.entries(B)) {
      if (k !== 'today' && !opts.some(o => o.k === k && o.today !== true)) {
        errors.push(`${id}.bodies.${k} names no live option that is not today`);
      }
      req(b.code, `${id}.bodies.${k}.code`);
      if (b.code !== undefined && longestLine(b.code) > LONG_LINE) {
        warnings.push(
          `${id}.bodies.${k} has a line of ${longestLine(b.code)} characters; a body fits ${LONG_LINE}`,
        );
      }
      const todayCode = 'today' in B ? B.today.code : undefined;
      if (k !== 'today' && todayCode !== undefined && b.code !== undefined) {
        const delta = diffLines(todayCode, b.code);
        const changed = delta
          .filter(p => p.added || p.removed)
          .reduce((a, p) => a + p.count, 0);
        if (changed === 0) {
          warnings.push(
            `${id}.bodies.${k} is identical to today; an option that changes nothing is not an option`,
          );
        } else if (
          b.diff === false &&
          changed >= Math.max(3, 0.5 * todayCode.split('\n').length) &&
          b.code.split('\n')[0] === todayCode.split('\n')[0]
        ) {
          warnings.push(
            `${id}.bodies.${k} differs from today by ${changed} lines; drop diff:false and let the builder show the delta`,
          );
        }
      }
    }
    if (q.diagram !== undefined) {
      req(
        q.diagram.cap,
        `${id}.diagram.cap (the caption: its conclusion in <b>…</b>)`,
      );
      conclusionFirst(q.diagram.cap, `${id}.diagram.cap`);
      for (const [k, v] of Object.entries(q.diagram.views)) {
        const at = `${id}.diagram.views.${k}`;
        if (k !== 'today' && !opts.some(o => o.k === k && o.today !== true)) {
          errors.push(`${at} names no live option that is not today`);
        }
        req(v.text, `${at}.text (the mermaid text)`);
      }
    }
    if (opts.length < 2) {
      errors.push(`${id} needs at least two live options, has ${opts.length}`);
    }
    if (opts.length > 4) {
      errors.push(
        `${id} has ${opts.length} live options; four is the limit; split the ruling`,
      );
    }
    const recs = opts.filter(o => o.rec === true).length;
    if (recs !== 1) {
      errors.push(`${id} needs exactly one recommended option, has ${recs}`);
    }
    if (opts.filter(o => o.today === true).length > 1) {
      errors.push(`${id}: only one option can be today`);
    }
    const views = q.seq !== undefined ? seqViews(q.seq, id) : [];
    const D = q.diagram?.views ?? {};
    const letters = new Set<string>();
    for (const o of opts) {
      const nm = id + o.k;
      if (o.k === 'n') {
        errors.push(
          `${id}: letter n is reserved for the "none of these fit" answer`,
        );
      }
      if (letters.has(o.k)) {
        errors.push(`${id}: letter ${o.k} is used twice`);
      }
      letters.add(o.k);
      req(o.t, `${nm}.t (the option's title)`);
      req(o.g, `${nm}.g (gain)`);
      req(o.c, `${nm}.c (cost)`);
      const shown =
        o.today === true
          ? q.seq !== undefined || 'today' in B || 'today' in D
          : views.includes(id + o.k) || o.k in B || o.k in D;
      if (!shown) {
        errors.push(
          nm +
            (o.today === true
              ? ' is today, but the ruling has no seq, no bodies.today and no diagram view'
              : ` has no picture of its own: give it a view in the seq, bodies.${o.k} or a diagram view`),
        );
      }
      for (const [kind, text] of [
        ['gain', o.g],
        ['cost', o.c],
      ] as const) {
        if (blank(text)) {
          continue;
        }
        const hit = VAGUE.exec(text ?? '');
        if (hit) {
          warnings.push(
            `${nm} ${kind} uses a word the owner cannot check ("${hit[0]}")`,
          );
        }
      }
      const needs = typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
      for (const n of needs) {
        if (!optionExists(n)) {
          errors.push(
            `${nm}.needs "${n}" is not a live option on this page (write it like "G7a")`,
          );
        }
      }
    }
  }

  if (live.length > 10) {
    warnings.push(
      `${live.length} rulings on one page; past ten, decide the smallest ones yourself`,
    );
  }
  return { errors, warnings };
}
