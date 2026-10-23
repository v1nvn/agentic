import type { Opt, Ruling } from './schema.ts';

import { bodiesOption, bodiesToday } from './bodies.ts';
import { figureView } from './figure.ts';
import { hueOf, needsOf, type Stage } from './html.ts';
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
    (o.rec === true ? '<span class="tag rec">★ recommended</span>' : '') +
    (o.today === true ? '<span class="tag">as today</span>' : '') +
    needs.map(n => `<span class="tag need">needs ${n}</span>`).join('');
  return (
    `<div class="opt ${hueOf(o.k)}" role="button" tabindex="0" aria-pressed="false" data-pick="${ref}"` +
    (looks ? ` data-look="${o.today === true ? 'today' : ref}"` : '') +
    (needs.length > 0 ? ` data-needs="${needs.join(' ')}"` : '') +
    `><span class="disc">${o.k}</span>` +
    `<div class="ot"><span class="ot-t">${o.t ?? ''}</span>${tags}</div>` +
    (o.w ? `<p class="w">${o.w}</p>` : '') +
    `<p class="g">${o.g ?? ''}</p><p class="c">${o.c ?? ''}</p>` +
    '</div>'
  );
}

const TODAY_ROW =
  '<div class="opt" role="button" tabindex="0" data-look="today" aria-label="Show today’s picture"><span class="disc"></span>' +
  '<div class="ot"><span class="ot-t">Today</span><span class="tag">kept by no option</span></div></div>';

function viewHtml(v: View, shown: boolean): string {
  const hue = v.opt ? ` ${hueOf(v.opt.k)}` : '';
  const disc = v.opt
    ? `<span class="disc${hue}">${v.opt.k}</span>`
    : '<span class="disc"></span>';
  const cap = v.stage.cap || `<b>${v.opt?.t ?? 'Today'}</b>`;
  return (
    `<div class="vw${hue}" data-view="${v.key}"${shown ? '' : ' hidden'}>` +
    `<div class="vh">${disc}<p class="vcap">${cap}</p></div>` +
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
    `<div class="opt" role="button" tabindex="0" aria-pressed="false" data-pick="${id}n">` +
    '<span class="disc">n</span><div class="ot"><span class="ot-t">None of these fit</span></div></div>';
  const rows = base + opts.map(o => optionRow(id, o, looks)).join('') + none;
  const pane = looks
    ? `<div class="view">${views.map((v, i) => viewHtml(v, i === 0)).join('')}</div>`
    : '';
  const foot =
    '<div class="rfoot">' +
    `<textarea class="rnote" data-note="${id}" rows="1" placeholder="Note on ${id} — what your answer should carry" aria-label="note on ${id}"></textarea>` +
    '</div>';
  const shape = !looks ? ' bare' : q.seq !== undefined ? ' wide' : '';
  return `<div class="decide${shape}"><div class="opts">${rows}</div>${pane}${foot}</div>`;
}
