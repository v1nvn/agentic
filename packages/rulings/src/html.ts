import type { Opt, Ruling } from './schema.ts';

export function esc(s: unknown): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export function hueOf(k: string): string {
  return 'o-' + 'abcd'.charAt('abcdefghijklmnopqrstuvwxyz'.indexOf(k) % 4);
}

// A today view names the today-marked option; any other view its trailing
// letter.
export function optOf(q: Ruling, view: string): Opt | undefined {
  const opts = q.opts ?? [];
  const letter =
    view === 'today' ? opts.find(o => o.today === true)?.k : view.slice(-1);
  return letter === undefined ? undefined : opts.find(x => x.k === letter);
}

export function needsOf(o: Opt): string[] {
  return typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
}

// The today key alone would collide across rulings, so it rides the ruling id.
export function wrapId(id: string, view: string): string {
  return `view-${view === 'today' ? `${id}-today` : view}`;
}

// The verdict table is the option's one home: the disc picks, the row looks.
export function verdictTable(q: Ruling, id: string): string {
  const rows = (q.opts ?? [])
    .map(o => {
      const pick = id + o.k;
      const needs = needsOf(o);
      const chips = [
        o.rec === true ? '<span class="star">★ recommended</span>' : '',
        o.today === true ? '<span class="asr">as today</span>' : '',
        ...needs.map(n => `<span class="dep">needs ${n}</span>`),
      ]
        .filter(c => c !== '')
        .join(' ');
      return (
        `<div class="vrow ${hueOf(o.k)}" data-view="${o.today === true ? 'today' : pick}"` +
        (needs.length ? ` data-needs="${needs.join(' ')}"` : '') +
        '>' +
        `<button type="button" class="lt disc ${hueOf(o.k)}" data-pick="${pick}" aria-label="pick ${pick}">${o.k}</button>` +
        `<span class="vt">${o.t ?? ''}${chips ? ` ${chips}` : ''}<span class="pmark">✓ picked</span></span>` +
        `<span class="vg">${o.g ?? ''}</span>` +
        `<span class="vc">${o.c ?? ''}</span>` +
        `<input class="onote" data-note="${pick}" placeholder="note for ${pick}" aria-label="note for ${pick}">` +
        '</div>'
      );
    })
    .join('');
  return (
    `<div class="vtable"><div class="vhead"><span>option</span><span>gain</span><span>cost</span></div>${rows}</div>`
  );
}

// The strip iterates views, not rows: a letter-less today tab highlights no row.
export function viewTabs(q: Ruling, id: string, views: string[]): string {
  const tabs = views
    .map((view, i) => {
      const o = optOf(q, view);
      const label =
        o === undefined
          ? '<span class="tt">today</span>'
          : `<span class="lt">${o.k}</span><span class="tt">${o.t ?? ''}</span>` +
            (o.today === true ? '<span class="asr">today</span>' : '');
      return (
        `<button type="button" class="tl${o ? ` ${hueOf(o.k)}` : ''}" role="tab"` +
        ` aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="${wrapId(id, view)}"` +
        ` data-view="${view}">${label}</button>`
      );
    })
    .join('');
  return `<div class="tabs" role="tablist">${tabs}</div>`;
}
