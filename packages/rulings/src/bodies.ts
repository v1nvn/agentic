import { diffLines } from 'diff';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-typescript.js';

import type { Body, Ruling } from './schema.ts';

import { esc, optOf } from './html.ts';

const LANG_ALIAS: Record<string, string> = {
  bash: 'bash',
  css: 'css',
  js: 'javascript',
  json: 'json',
  markup: 'markup',
  ts: 'typescript',
};

function hlBlock(code: string, lang: string | undefined): string {
  const name = lang === undefined ? undefined : LANG_ALIAS[lang];
  const grammar = name === undefined ? undefined : Prism.languages[name];
  if (name === undefined || grammar === undefined) {
    return esc(code);
  }
  try {
    return Prism.highlight(code, grammar, name);
  } catch {
    return esc(code);
  }
}

interface Row {
  s: 'add' | 'ctx' | 'del' | 'ell';
  t: string;
}

const RUN = 7;
const TODAY_FOLD = 20;

function diffHtml(
  before: string,
  after: string,
  lang: string | undefined,
): string {
  const rows: Row[] = [];
  for (const part of diffLines(before, after)) {
    for (const line of part.value.replace(/\n$/, '').split('\n')) {
      rows.push({
        s: part.added ? 'add' : part.removed ? 'del' : 'ctx',
        t: line,
      });
    }
  }
  const out: Row[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].s === 'ctx') {
      let j = i;
      while (j < rows.length && rows[j].s === 'ctx') {
        j++;
      }
      if (j - i >= RUN) {
        out.push(
          rows[i],
          { s: 'ell', t: `⋯ ${j - i - 2} unchanged lines` },
          rows[j - 1],
        );
        i = j;
        continue;
      }
    }
    out.push(rows[i]);
    i++;
  }
  return out
    .map(r => {
      if (r.s === 'add') {
        return `<span class="dl add">${hlBlock(r.t, lang)}</span>`;
      }
      if (r.s === 'del') {
        return `<span class="dl del">${hlBlock(r.t, lang)}</span>`;
      }
      if (r.s === 'ell') {
        return `<span class="dl ell">${esc(r.t)}</span>`;
      }
      return `<span class="dl ctx">${hlBlock(r.t, lang)}</span>`;
    })
    .join('');
}

// The today code alone folds past 20 lines; option bodies render whole.
function todayPre(code: string, lang: string | undefined): string {
  const lines = code.split('\n');
  if (lines.length <= TODAY_FOLD) {
    return `<pre>${hlBlock(code, lang)}</pre>`;
  }
  return (
    `<pre>${hlBlock(lines.slice(0, TODAY_FOLD).join('\n'), lang)}</pre>` +
    `<details class="fold"><summary>show all ${lines.length} lines</summary>` +
    `<pre>${hlBlock(lines.slice(TODAY_FOLD).join('\n'), lang)}</pre></details>`
  );
}

function bodyHtml(
  b: Body,
  letter: string,
  isToday: boolean,
  todayCode?: string,
): string {
  const asDiff = !isToday && todayCode !== undefined && b.diff !== false;
  const state =
    b.state === 'sketch'
      ? '<span class="state-chip">sketch — feasibility not checked</span>'
      : `<span>${b.state ?? (isToday ? 'built today' : 'planned')}</span>`;
  return (
    `<div class="body ${isToday ? 'is-today' : 'of-option'}"><div class="tag">` +
    (letter ? `<span class="lt">${letter}</span>` : '') +
    state +
    (asDiff ? '<span class="dleg">diff vs today</span>' : '') +
    (b.what ? `<b>${b.what}</b>` : '') +
    '</div>' +
    (isToday
      ? todayPre(b.code ?? '', b.lang)
      : asDiff
        ? `<pre class="diff">${diffHtml(todayCode ?? '', b.code ?? '', b.lang)}</pre>`
        : `<pre>${hlBlock(b.code ?? '', b.lang)}</pre>`) +
    (b.cap ? `<p class="bcap">${b.cap}</p>` : '') +
    '</div>'
  );
}

export function bodiesToday(q: Ruling): string {
  const B = q.bodies;
  if (B === undefined || !('today' in B)) {
    return '';
  }
  const todayLetter = (q.opts ?? []).find(o => o.today === true)?.k ?? '';
  const w = optOf(q, 'today')?.w;
  return (
    `<div class="stage"><div class="bodies">${bodyHtml(B.today, todayLetter, true)}</div>` +
    (w ? `<p class="how">${w}</p>` : '') +
    '</div>'
  );
}

export function bodiesOption(q: Ruling, view: string): string {
  const B = q.bodies;
  if (B === undefined) {
    return '';
  }
  const letter = view.slice(-1);
  if (!(letter in B)) {
    return '';
  }
  const todayCode = 'today' in B ? B.today.code : undefined;
  const w = optOf(q, view)?.w;
  return (
    `<div class="stage"><div class="bodies">${bodyHtml(B[letter], letter, false, todayCode)}</div>` +
    (w ? `<p class="how">${w}</p>` : '') +
    '</div>'
  );
}
