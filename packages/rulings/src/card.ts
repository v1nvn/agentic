import type { Opt, Row, Ruling } from './schema.ts';

import { bodiesOption, bodiesToday } from './bodies.ts';
import { figureStrip } from './figure.ts';
import { type Stage, stripTags } from './html.ts';
import { seqView } from './seq.ts';

const SIGN = { cost: '✕', gain: '✓', mixed: '–' } as const;
const GROUP = { beyond: 'Beyond the stake', stake: 'On the stake' } as const;

interface View {
  key: string;
  opt: Opt | undefined;
  stage: Stage;
}

function stageOf(q: Ruling, id: string, key: string): Stage | undefined {
  if (q.seq !== undefined) {
    return seqView(q, id, key);
  }
  return key === 'today' ? bodiesToday(q) : bodiesOption(q, key);
}

function viewsOf(q: Ruling, id: string, opts: Opt[]): View[] {
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

function stageHtml(q: Ruling, id: string, opts: Opt[]): string {
  const views = viewsOf(q, id, opts);
  if (views.length === 0) {
    return '';
  }
  const tabs = views
    .map(
      (v, i) =>
        `<button type="button" class="vt" data-view="${v.key}" aria-pressed="${i === 0}">` +
        (v.opt
          ? `<span class="disc">${v.opt.k}</span>${v.key === 'today' ? 'Today' : stripTags(v.opt.t ?? '')}`
          : 'Today') +
        '</button>',
    )
    .join('');
  const panes = views
    .map(
      (v, i) =>
        `<div class="vw" data-view="${v.key}"${i === 0 ? '' : ' hidden'}>` +
        (v.stage.cap ? `<p class="vcap">${v.stage.cap}</p>` : '') +
        `<div class="pic">${v.stage.body}</div></div>`,
    )
    .join('');
  return `<div class="stage"><div class="vtabs" role="group" aria-label="Picture">${tabs}</div>${panes}</div>`;
}

function headCell(o: Opt): string {
  const tags =
    (o.rec === true ? '<span class="tag">recommended</span>' : '') +
    (o.today === true ? '<span class="tag quiet">as today</span>' : '');
  return (
    `<th scope="col" data-k="${o.k}"><div class="oh"><span class="disc">${o.k}</span>` +
    `<span><span class="ot">${o.t ?? ''}</span>${tags ? `<span class="tags">${tags}</span>` : ''}</span></div></th>`
  );
}

function markCell(r: Row, o: Opt): string {
  const [mark, why] = r.marks[o.k];
  return (
    `<td data-k="${o.k}"><div class="cell">` +
    `<span class="mk ${mark}" role="img" aria-label="${mark}">${SIGN[mark]}</span>` +
    `<span class="why">${why}</span></div></td>`
  );
}

function pickLabel(id: string, k: string, label: string, done: string): string {
  return (
    `<label class="pick"><input type="radio" name="${id}" value="${k}" data-pick="${id + k}">` +
    `<span class="off">${label}</span><span class="on">${done}</span></label>`
  );
}

function scorecard(q: Ruling, id: string, opts: Opt[]): string {
  const rows = q.rows ?? [];
  const blank = opts.map(o => `<td data-k="${o.k}"></td>`).join('');
  const body = (['stake', 'beyond'] as const)
    .map(on => {
      const mine = rows.filter(r => r.on === on);
      return mine.length === 0
        ? ''
        : `<tr class="grp"><th scope="colgroup"><span class="lbl">${GROUP[on]}</span></th>${blank}</tr>` +
            mine
              .map(
                r =>
                  `<tr><th scope="row">${r.label ?? ''}</th>${opts.map(o => markCell(r, o)).join('')}</tr>`,
              )
              .join('');
    })
    .join('');
  const foot = opts
    .map(
      o =>
        `<td data-k="${o.k}">${pickLabel(id, o.k, `Pick ${o.k}`, `Picked ${o.k}`)}</td>`,
    )
    .join('');
  return (
    `<div class="card" data-ruling="${id}"><div class="scroll"><table style="--n:${opts.length}">` +
    `<thead><tr><td></td>${opts.map(headCell).join('')}</tr></thead>` +
    `<tbody>${body}</tbody><tfoot><tr><td></td>${foot}</tr></tfoot></table></div>` +
    '<div class="key">' +
    (['gain', 'mixed', 'cost'] as const)
      .map(m => `<span><i class="mk ${m}">${SIGN[m]}</i>${m}</span>`)
      .join('') +
    '</div>' +
    `<div class="none" data-k="n">${pickLabel(id, 'n', 'None of these fit', 'Picked none')}</div></div>`
  );
}

export function decisionHtml(q: Ruling, id: string): string {
  const opts = q.opts ?? [];
  const must = (q.must ?? [])
    .map(m => `<p class="must"><span class="lbl">Must</span>${m}</p>`)
    .join('');
  const cut = (q.cut ?? [])
    .map(
      c =>
        `<p class="cut">Cut by the must: ${c.k} (<s>${c.t ?? ''}</s>). ${c.why ?? ''} To bring it back, pick <b>n</b> and say so in the note.</p>`,
    )
    .join('');
  const picture =
    q.figure !== undefined ? figureStrip(q, opts) : stageHtml(q, id, opts);
  return (
    must +
    cut +
    picture +
    scorecard(q, id, opts) +
    `<p class="because"><span class="lbl">Why</span>${q.why ?? ''}</p>` +
    `<label class="nlabel" for="note-${id}">Note on ${id}</label>` +
    `<textarea class="rnote" id="note-${id}" name="note-${id}" data-note="${id}" rows="1"></textarea>`
  );
}
