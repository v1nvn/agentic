import { diffLines } from 'diff';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-typescript.js';

import type { Body, Ruling } from './schema.ts';

import { esc, type Stage } from './html.ts';

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

function diffHtml(
  before: string,
  after: string,
  lang: string | undefined,
): string {
  return diffLines(before, after)
    .flatMap(part => {
      const kind = part.added ? 'add' : part.removed ? 'del' : 'same';
      return part.value
        .replace(/\n$/, '')
        .split('\n')
        .map(line => `<span class="dl ${kind}">${hlBlock(line, lang)}</span>`);
    })
    .join('');
}

function bodyStage(b: Body, isToday: boolean, todayCode?: string): Stage {
  const asDiff = !isToday && todayCode !== undefined && b.diff !== false;
  const state =
    b.state === 'sketch'
      ? 'sketch (feasibility not checked)'
      : (b.state ?? (isToday ? 'built today' : 'planned'));
  return {
    body:
      `<div class="btag"><span>${state}</span>` +
      (asDiff ? '<span>diff vs today</span>' : '') +
      (b.what ? `<b>${b.what}</b>` : '') +
      '</div>' +
      (asDiff
        ? `<pre class="diff">${diffHtml(todayCode, b.code ?? '', b.lang)}</pre>`
        : `<pre>${hlBlock(b.code ?? '', b.lang)}</pre>`),
    cap: b.cap ?? '',
  };
}

export function bodiesToday(q: Ruling): Stage | undefined {
  const B = q.bodies;
  return B !== undefined && 'today' in B ? bodyStage(B.today, true) : undefined;
}

export function bodiesOption(q: Ruling, view: string): Stage | undefined {
  const B = q.bodies;
  const letter = view.slice(-1);
  if (B === undefined || !(letter in B)) {
    return undefined;
  }
  return bodyStage(B[letter], false, 'today' in B ? B.today.code : undefined);
}
