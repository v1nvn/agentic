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

// One view block head per option: letter chip, title, chips (my pick, as
// today, needs), then the `w` how-paragraph and gain/cost. The plain
// "Today" head covers a base view with no today option.
export function viewHeadFor(
  q: Ruling,
  view: string,
): {
  head: string;
  hue: string;
} {
  const opts = q.opts ?? [];
  const letter =
    view === 'today' ? opts.find(o => o.today === true)?.k : view.slice(-1);
  const o: Opt | undefined =
    letter === undefined ? undefined : opts.find(x => x.k === letter);
  if (o === undefined) {
    return {
      head: '<div class="vhead"><span class="vt">Today</span></div>',
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
      `</div></div>` +
      (o.w ? `<p class="how">${o.w}</p>` : '') +
      `<div class="gc gain"><span class="sign">+</span><span>${o.g ?? ''}</span></div>` +
      `<div class="gc cost"><span class="sign">−</span><span>${o.c ?? ''}</span></div>`,
  };
}
