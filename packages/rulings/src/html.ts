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

// The option a view belongs to: the today-marked one for a today view (none
// if no option is marked), else the one whose letter ends the view id.
export function optOf(q: Ruling, view: string): Opt | undefined {
  const opts = q.opts ?? [];
  const letter =
    view === 'today' ? opts.find(o => o.today === true)?.k : view.slice(-1);
  return letter === undefined ? undefined : opts.find(x => x.k === letter);
}

// One view card head: letter disc, title, chips (my pick, as today, needs),
// the picked marker the chrome toggles via aria-pressed.
export function viewHeadFor(
  q: Ruling,
  view: string,
): {
  head: string;
  hue: string;
} {
  const o = optOf(q, view);
  if (o === undefined) {
    return {
      head:
        '<div class="vhead"><span class="vt">Today</span>' +
        '<span class="vmeta">how it works now</span></div>',
      hue: '',
    };
  }
  const needs = typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
  const chips = [
    o.rec === true ? '<span class="star">★ my pick</span>' : '',
    o.today === true ? '<span>as today</span>' : '',
    ...needs.map(n => `<span class="dep">needs ${n}</span>`),
  ]
    .filter(c => c !== '')
    .join(' · ');
  return {
    hue: hueOf(o.k),
    head:
      `<div class="vhead"><span class="lt">${o.k}</span><div class="vtt">` +
      `<span class="vt">${o.t ?? ''}</span>` +
      (chips ? `<span class="vmeta">${chips}</span>` : '') +
      '</div><span class="pmark">✓ picked</span></div>',
  };
}

// The verdict tail: each option's `w` how-paragraph, gain and cost render
// exactly once, on its own view card.
export function verdictFor(q: Ruling, view: string): string {
  const o = optOf(q, view);
  if (o === undefined) {
    return '';
  }
  return (
    (o.w !== undefined ? `<p class="how">${o.w}</p>` : '') +
    `<div class="gc gain"><span class="sign">+</span><span>${o.g ?? ''}</span></div>` +
    `<div class="gc cost"><span class="sign">−</span><span>${o.c ?? ''}</span></div>`
  );
}
