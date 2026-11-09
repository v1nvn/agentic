import { diffLines } from 'diff';
import { z } from 'zod';

export const KINDS = ['call', 'money', 'store', 'check', 'fail'] as const;
const LANGS = ['ts', 'js', 'json', 'bash', 'markup', 'css'] as const;
const VAGUE =
  /\b(more flexible|flexibility|cleaner|more robust|scalable|future[- ]proof|best practice|more maintainable|more elegant)\b/i;
const OPTION_CAPTION = /^<b>\s*option\s+[a-z]\s*[:—-]/i;
const ANCHOR = /[\w./-]+\.[a-z]{1,5}:\d+/i;
const RULING_ID = /^G\d+$/;
const LETTER = /^[a-z]$/;
const VOID_TAGS = new Set([
  'area',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'source',
  'track',
  'wbr',
]);
const PAINTED_ATTR =
  /\b(?:style|fill|stroke|color|stop-color|flood-color)\s*=\s*("[^"]*"|'[^']*')/gi;
const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i;
const EXTERNAL_REF =
  /\b(?:src|href|xlink:href)\s*=\s*["']?\s*(?!data:)(?:[a-z][a-z0-9+.-]*:|\/\/)|url\(\s*["']?\s*(?:https?:|\/\/)/i;

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
  in: z.array(z.string()).min(1).optional(),
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

const figureView = z.strictObject({
  cap: z.string().optional(),
  html: z.string(),
});

const figure = z.strictObject({
  cap: z.string().optional(),
  views: z.record(z.string(), figureView),
});

const opt = z.strictObject({
  k: z.string().regex(LETTER, {
    message: 'option letter must be one lowercase letter',
  }),
  rec: z.boolean().optional(),
  t: z.string().optional(),
  today: z.boolean().optional(),
});

const cut = z.strictObject({
  k: z.string().regex(LETTER, {
    message: 'option letter must be one lowercase letter',
  }),
  t: z.string().optional(),
  why: z.string().optional(),
});

export const MARKS = ['gain', 'mixed', 'cost'] as const;

const row = z.strictObject({
  label: z.string().optional(),
  marks: z.record(z.string(), z.tuple([z.enum(MARKS), z.string()])),
  on: z.enum(['stake', 'beyond']),
});

const ruling = z.strictObject({
  after: z.string().regex(RULING_ID).optional(),
  bodies: z.record(z.string(), body).optional(),
  changed: z.string().optional(),
  cut: z.array(cut).optional(),
  figure: figure.optional(),
  must: z.array(z.string()).optional(),
  opts: z.array(opt).optional(),
  rows: z.array(row).optional(),
  ruled: z.string().regex(LETTER).optional(),
  seq: seq.optional(),
  stake: z.string().optional(),
  title: z.string().optional(),
  why: z.string().optional(),
});

const pageSchema = z.strictObject({
  decided: z.array(z.string()).optional(),
  eyebrow: z.string().optional(),
  key: z.string().min(1).optional(),
  rulings: z.record(
    z.string().regex(RULING_ID, { message: 'must look like G1, G2, …' }),
    ruling,
  ),
  sub: z.string().optional(),
  title: z.string().optional(),
});

export type Opt = z.infer<typeof opt>;
export type Row = z.infer<typeof row>;
export type Body = z.infer<typeof body>;
export type Figure = z.infer<typeof figure>;
export type Overlay = z.infer<typeof overlay>;
export type Ruling = z.infer<typeof ruling>;
export type Seq = z.infer<typeof seq>;
export type Step = z.infer<typeof step>;
export type Page = z.infer<typeof pageSchema>;
export interface Verdict {
  errors: string[];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

function unclosedTag(html: string): string | undefined {
  const open: string[] = [];
  for (const [, close, name, self] of html.matchAll(
    /<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g,
  )) {
    const tag = name.toLowerCase();
    if (self === '/' || (close === '' && VOID_TAGS.has(tag))) {
      continue;
    }
    if (close === '') {
      open.push(tag);
      continue;
    }
    const top = open.pop();
    if (top !== tag) {
      return top === undefined
        ? `</${tag}> closes nothing`
        : `</${tag}> closes <${top}>`;
    }
  }
  const last = open.at(-1);
  return last === undefined ? undefined : `<${last}> is never closed`;
}

export function figureFaults(html: string): string[] {
  const faults: string[] = [];
  if (/<script\b/i.test(html) || /\son[a-z]+\s*=/i.test(html)) {
    faults.push('runs script; a figure is static markup');
  }
  if (/<style\b/i.test(html)) {
    faults.push(
      'carries a <style> block, which restyles the whole page; style inline',
    );
  }
  if (EXTERNAL_REF.test(html)) {
    faults.push('loads from outside the page; inline it or use a data: URI');
  }
  for (const [, value] of html.matchAll(PAINTED_ATTR)) {
    if (LITERAL_COLOUR.test(value)) {
      faults.push(
        "paints a literal colour, which steps outside the page's tokens; use them (var(--ink), var(--o), …)",
      );
      break;
    }
  }
  const tag = unclosedTag(html);
  if (tag !== undefined) {
    faults.push(`breaks the page layout: ${tag}`);
  }
  return faults;
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

export function validatePage(input: unknown): Verdict {
  const errors: string[] = [];
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const at = issue.path.join('.');
      errors.push(at ? `${at}: ${issue.message}` : issue.message);
    }
    return { errors };
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
    const t = (v ?? '').trim();
    if (t === '') {
      return;
    }
    if (!t.startsWith('<b>')) {
      errors.push(`${what} must open with its conclusion in <b>…</b>`);
    } else if (OPTION_CAPTION.test(t)) {
      errors.push(
        `${what} opens with an option label; open with the conclusion`,
      );
    }
  }
  function optionExists(ref: string): boolean {
    const m = /^(G\d+)([a-z])$/.exec(ref);
    if (!m) {
      return false;
    }
    return m[1] in R && (R[m[1]].opts ?? []).some(x => x.k === m[2]);
  }
  function isToday(ref: string): boolean {
    const m = /^(G\d+)([a-z])$/.exec(ref);
    return (
      m !== null &&
      m[1] in R &&
      (R[m[1]].opts ?? []).some(x => x.k === m[2] && x.today === true)
    );
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
      const ref = LETTER.test(v) ? owner + v : v;
      return optionExists(ref) && !isToday(ref);
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
          errors.push(
            `${at}.in names "${v}", which is not a live option that is not today`,
          );
        }
      }
      for (const [v, ov] of Object.entries(st.o ?? {})) {
        if (!viewOk(v)) {
          errors.push(
            `${at}.o names "${v}", which is not a live option that is not today`,
          );
        }
        if (ov.b !== undefined && ov.b.length !== nb) {
          errors.push(
            `${at}.o.${v}.b must hold one value per ledger column (${nb})`,
          );
        }
      }
    }
    for (const [v, cap] of Object.entries(d.caps ?? {})) {
      if (!viewOk(v)) {
        errors.push(
          `${where}.caps names "${v}", which is not a live option that is not today`,
        );
      }
      conclusionFirst(cap, `${where}.caps.${v}`);
    }
  }

  req(P.title, 'PAGE.title');
  for (const [i, d] of (P.decided ?? []).entries()) {
    req(d, `decided[${i}]`);
  }

  const written = Object.entries(R).filter(([, q]) => q.opts !== undefined);
  for (let i = 0; i < written.length; i++) {
    for (let j = i + 1; j < written.length; j++) {
      const [ai, A] = written[i];
      const [bj, B] = written[j];
      const fa = flow(A);
      if (fa !== '' && fa === flow(B)) {
        errors.push(
          `${ai}.seq and ${bj}.seq draw the same steps; each picture shows only what its ruling turns on`,
        );
      }
    }
  }

  function plain(v: string | undefined, what: string): void {
    const t = v ?? '';
    if (t.includes('<code>')) {
      errors.push(
        `${what} carries <code>; say what the owner sees, in plain words`,
      );
    }
    const anchor = ANCHOR.exec(stripTags(t));
    if (anchor) {
      errors.push(
        `${what} cites ${anchor[0]}; anchors are your evidence, not the owner's reading`,
      );
    }
  }
  function checkable(v: string | undefined, what: string): void {
    const hit = VAGUE.exec(v ?? '');
    if (hit) {
      errors.push(`${what} uses a word the owner cannot check ("${hit[0]}")`);
    }
  }

  plain(P.sub, 'PAGE.sub');
  for (const [i, d] of (P.decided ?? []).entries()) {
    plain(d, `decided[${i}]`);
  }

  for (const [id, q] of Object.entries(R)) {
    req(q.title, `${id}.title`);
    plain(q.title, `${id}.title`);
    if (!blank(q.title) && !/\?\s*$/.test(stripTags(q.title ?? ''))) {
      errors.push(
        `${id}.title must be the decision as a question, ending in ?`,
      );
    }
    if (q.after !== undefined) {
      const root = R[q.after];
      if (!(q.after in R) || q.after === id) {
        errors.push(
          `${id}.after names ${q.after}, which is not another ruling on this page`,
        );
      } else if (q.opts === undefined && root.ruled !== undefined) {
        errors.push(
          `${id} waits on ${q.after}, which is ruled; write ${id} now, under that pick`,
        );
      } else if (q.opts !== undefined && root.ruled === undefined) {
        errors.push(
          `${id} is written but rests on ${q.after}, which is not ruled; leave ${id} as a title with after until ${q.after} is ruled`,
        );
      }
    }
    if (q.opts === undefined) {
      if (q.after === undefined) {
        errors.push(
          `${id} has no options and waits on nothing; write its options, or name the ruling it waits on in after`,
        );
      }
      const extra = Object.keys(q).filter(k => !['after', 'title'].includes(k));
      if (extra.length > 0) {
        errors.push(
          `${id} waits on ${q.after ?? 'a pick'}; a waiting ruling is a title and after alone, not ${extra.join(', ')}`,
        );
      }
      continue;
    }

    req(q.stake, `${id}.stake (who loses what, on a real value)`);
    plain(q.stake, `${id}.stake`);
    req(q.why, `${id}.why (the recommendation, in the rows' own labels)`);
    plain(q.why, `${id}.why`);
    for (const [i, m] of (q.must ?? []).entries()) {
      req(m, `${id}.must[${i}]`);
      plain(m, `${id}.must[${i}]`);
    }
    plain(q.changed, `${id}.changed`);

    const opts = q.opts;
    const letters = new Set<string>();
    for (const o of [...opts, ...(q.cut ?? [])]) {
      if (o.k === 'n') {
        errors.push(
          `${id}: letter n is reserved for the "none of these fit" answer`,
        );
      }
      if (letters.has(o.k)) {
        errors.push(`${id}: letter ${o.k} is used twice`);
      }
      letters.add(o.k);
      req(o.t, `${id + o.k}.t (the option's title)`);
      plain(o.t, `${id + o.k}.t`);
    }
    for (const c of q.cut ?? []) {
      req(c.why, `${id + c.k}.why (the must it breaks, and how)`);
      plain(c.why, `${id + c.k}.why`);
    }
    if ((q.cut ?? []).length > 0 && (q.must ?? []).length === 0) {
      errors.push(`${id} cuts an option but names no must it breaks`);
    }
    if (
      q.ruled !== undefined &&
      q.ruled !== 'n' &&
      !opts.some(o => o.k === q.ruled)
    ) {
      errors.push(
        `${id}.ruled names ${q.ruled}, which is not one of its options or n`,
      );
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

    const rows = q.rows ?? [];
    if (!rows.some(r => r.on === 'stake')) {
      errors.push(
        `${id} has no row on the stake: what the ruling exists to fix, marked for every option`,
      );
    }
    const costs = new Set<string>();
    for (const [i, r] of rows.entries()) {
      const at = `${id}.rows[${i}]`;
      req(r.label, `${at}.label (an outcome the owner can check)`);
      plain(r.label, `${at}.label`);
      checkable(r.label, `${at}.label`);
      for (const o of opts) {
        const m = o.k in r.marks ? r.marks[o.k] : undefined;
        if (m === undefined) {
          errors.push(
            `${at} has no mark for ${o.k}; every option answers every row`,
          );
          continue;
        }
        req(m[1], `${at}.marks.${o.k} reason`);
        plain(m[1], `${at}.marks.${o.k}`);
        checkable(m[1], `${at}.marks.${o.k}`);
        if (m[0] === 'cost') {
          costs.add(o.k);
        }
      }
      for (const k of Object.keys(r.marks)) {
        if (!opts.some(o => o.k === k)) {
          errors.push(`${at}.marks.${k} names no live option`);
        }
      }
      const marked = opts.filter(o => o.k in r.marks);
      const kinds = new Set(marked.map(o => r.marks[o.k][0]));
      if (kinds.size === 1 && marked.length === opts.length) {
        errors.push(
          `${at} marks every option the same; a row that separates nothing goes`,
        );
      }
    }
    for (const o of opts) {
      if (rows.length > 0 && !costs.has(o.k)) {
        errors.push(
          `${id + o.k} has no cost in any row; name what it costs, or cut it as beaten by another option`,
        );
      }
    }

    const pictures: [string, unknown][] = [
      ['a seq', q.seq],
      ['bodies', q.bodies],
      ['a figure', q.figure],
    ];
    const present = pictures.filter(([, v]) => v !== undefined);
    if (present.length > 1) {
      errors.push(
        `${id} has both ${present[0]?.[0]} and ${present[1]?.[0]}; one picture per ruling`,
      );
    }
    if (q.seq !== undefined) {
      checkSeq(q.seq, `${id}.seq`, id);
      plain(q.seq.cap, `${id}.seq.cap`);
      for (const [k, cap] of Object.entries(q.seq.caps ?? {})) {
        plain(cap, `${id}.seq.caps.${k}`);
      }
    }
    const B = q.bodies ?? {};
    for (const [k, b] of Object.entries(B)) {
      if (k !== 'today' && !opts.some(o => o.k === k && o.today !== true)) {
        errors.push(`${id}.bodies.${k} names no live option that is not today`);
      }
      req(b.code, `${id}.bodies.${k}.code`);
      plain(b.cap, `${id}.bodies.${k}.cap`);
      plain(b.what, `${id}.bodies.${k}.what`);
      const todayCode = 'today' in B ? B.today.code : undefined;
      if (k !== 'today' && todayCode !== undefined && b.code !== undefined) {
        const changed = diffLines(todayCode, b.code)
          .filter(p => p.added || p.removed)
          .reduce((a, p) => a + p.count, 0);
        if (changed === 0) {
          errors.push(
            `${id}.bodies.${k} is identical to today; an option that changes nothing is not an option`,
          );
        }
      }
    }
    if (q.figure !== undefined) {
      conclusionFirst(q.figure.cap, `${id}.figure.cap`);
      plain(q.figure.cap, `${id}.figure.cap`);
      for (const [k, v] of Object.entries(q.figure.views)) {
        const at = `${id}.figure.views.${k}`;
        if (k !== 'today' && !opts.some(o => o.k === k && o.today !== true)) {
          errors.push(`${at} names no live option that is not today`);
        }
        req(v.html, `${at}.html (the figure markup)`);
        for (const f of figureFaults(v.html)) {
          errors.push(`${at}.html ${f}`);
        }
        conclusionFirst(v.cap, `${at}.cap`);
        plain(v.cap, `${at}.cap`);
      }
    }
    if (present.length > 0) {
      const views = q.seq !== undefined ? seqViews(q.seq, id) : [];
      const D = q.figure?.views ?? {};
      for (const o of opts) {
        const shown =
          o.today === true
            ? q.seq !== undefined || 'today' in B || 'today' in D
            : views.includes(id + o.k) || o.k in B || o.k in D;
        if (!shown) {
          errors.push(
            id +
              o.k +
              (o.today === true
                ? ' is today, but the picture has no today view'
                : ` has no picture of its own: give it a view in the seq, bodies.${o.k} or a figure view`),
          );
        }
      }
    }
  }

  const open = written.filter(([, q]) => q.ruled === undefined).length;
  if (open > 10) {
    errors.push(
      `${open} rulings to rule on one page; past ten, decide the smallest ones yourself`,
    );
  }
  return { errors };
}
