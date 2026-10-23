import type { Opt, Ruling } from './schema.ts';

import { bodiesOption, bodiesToday } from './bodies.ts';
import { figureView } from './figure.ts';
import { needsOf, type Stage } from './html.ts';
import { seqView } from './seq.ts';

interface View {
  key: string;
  opt: Opt | undefined;
  stage: Stage;
}

function stageOf(q: Ruling, id: string, key: string): Stage | undefined {
  if (q.seq !== undefined) {
    return seqView(q, id, key);
  }
  if (q.bodies !== undefined) {
    return key === 'today' ? bodiesToday(q) : bodiesOption(q, key);
  }
  return figureView(q, key);
}

function viewsOf(q: Ruling, id: string): View[] {
  const opts = q.opts ?? [];
  const keys = [
    'today',
    ...opts.filter(o => o.today !== true).map(o => id + o.k),
  ];
  return keys.flatMap(key => {
    const stage = stageOf(q, id, key);
    const opt =
      key === 'today'
        ? opts.find(o => o.today === true)
        : opts.find(o => id + o.k === key);
    return stage === undefined ? [] : [{ key, opt, stage }];
  });
}

function optionRow(id: string, o: Opt, looks: boolean): string {
  const ref = id + o.k;
  const needs = needsOf(o);
  const tags =
    (o.rec === true ? '<span class="tag rec">recommended</span>' : '') +
    (o.today === true ? '<span class="tag">as today</span>' : '') +
    needs.map(n => `<span class="tag need">needs ${n}</span>`).join('');
  return (
    `<label class="opt" data-pick="${ref}"` +
    (looks ? ` data-look="${o.today === true ? 'today' : ref}"` : '') +
    (needs.length > 0 ? ` data-needs="${needs.join(' ')}"` : '') +
    `><input type="radio" name="${id}" value="${o.k}">` +
    `<span class="disc">${o.k}</span>` +
    `<span class="ot"><span class="ot-t">${o.t ?? ''}</span>${tags}</span>` +
    (o.w ? `<span class="w">${o.w}</span>` : '') +
    `<span class="g">${o.g ?? ''}</span><span class="c">${o.c ?? ''}</span>` +
    '</label>'
  );
}

const TODAY_ROW =
  '<button type="button" class="opt" data-look="today" aria-label="Show today’s picture"><span class="disc"></span>' +
  '<span class="ot"><span class="ot-t">Today</span><span class="tag">kept by no option</span></span></button>';

function viewHtml(v: View, shown: boolean): string {
  const cap = v.stage.cap || `<b>${v.opt?.t ?? 'Today'}</b>`;
  return (
    `<div class="vw" data-view="${v.key}"${shown ? '' : ' hidden'}>` +
    `<div class="vh"><span class="disc">${v.opt?.k ?? ''}</span><p class="vcap">${cap}</p></div>` +
    `<div class="pic">${v.stage.body}</div></div>`
  );
}

export function decideHtml(q: Ruling, id: string): string {
  const opts = q.opts ?? [];
  const views = viewsOf(q, id);
  const looks = views.length > 0;
  const base =
    views[0]?.key === 'today' && views[0].opt === undefined ? TODAY_ROW : '';
  const none =
    `<label class="opt" data-pick="${id}n">` +
    `<input type="radio" name="${id}" value="n"><span class="disc">n</span>` +
    '<span class="ot"><span class="ot-t">None of these fit</span></span></label>';
  const rows = base + opts.map(o => optionRow(id, o, looks)).join('') + none;
  const pane = looks
    ? `<div class="view">${views.map((v, i) => viewHtml(v, i === 0)).join('')}</div>`
    : '';
  const foot =
    '<div class="rfoot">' +
    `<label class="nlabel" for="note-${id}">Note on ${id}</label>` +
    `<textarea class="rnote" id="note-${id}" name="note-${id}" data-note="${id}" rows="1"></textarea>` +
    '</div>';
  const shape = !looks ? ' bare' : q.seq !== undefined ? ' wide' : '';
  return `<div class="decide${shape}"><div class="opts">${rows}</div>${pane}${foot}</div>`;
}
