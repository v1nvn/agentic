import { diffLines } from 'diff';
import { z } from 'zod';

export const KINDS = ['call', 'money', 'store', 'check', 'fail'] as const;
const LANGS = ['ts', 'js', 'json', 'bash', 'markup', 'css'] as const;
const VAGUE =
  /\b(more flexible|flexibility|cleaner|more robust|scalable|future[- ]proof|best practice|more maintainable|more elegant)\b/i;
const OPTION_CAPTION = /^<b>\s*option\s+[a-z]\s*[:—-]/i;
const SLUG = /^[a-z][a-z0-9-]*$/;
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
  figure: figure.optional(),
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
    for (const [v, cap] of Object.entries(d.caps ?? {})) {
      if (!viewOk(v)) {
        errors.push(`${where}.caps names "${v}", which is not a live option`);
      }
      conclusionFirst(cap, `${where}.caps.${v}`);
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
      const fa = flow(A);
      if (fa !== '' && fa === flow(B)) {
        errors.push(
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
    if ((q.stake ?? '').includes('<code>')) {
      errors.push(
        `${id}.stake names an internal thing; put it in today and say what the owner sees`,
      );
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
    const pictured = present.length > 0;
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
      const todayCode = 'today' in B ? B.today.code : undefined;
      if (k !== 'today' && todayCode !== undefined && b.code !== undefined) {
        const delta = diffLines(todayCode, b.code);
        const changed = delta
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
      req(
        q.figure.cap,
        `${id}.figure.cap (the caption: its conclusion in <b>…</b>)`,
      );
      conclusionFirst(q.figure.cap, `${id}.figure.cap`);
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
    const D = q.figure?.views ?? {};
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
      if (pictured) {
        const shown =
          o.today === true
            ? q.seq !== undefined || 'today' in B || 'today' in D
            : views.includes(id + o.k) || o.k in B || o.k in D;
        if (!shown) {
          errors.push(
            nm +
              (o.today === true
                ? ' is today, but the picture has no today view'
                : ` has no picture of its own: give it a view in the seq, bodies.${o.k} or a figure view`),
          );
        }
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
          errors.push(
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
    errors.push(
      `${live.length} rulings on one page; past ten, decide the smallest ones yourself`,
    );
  }
  return { errors };
}
