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

export function sentenceEnds(html: string): number[] {
  const ends: number[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== '<') {
      if ('.!?'.includes(html[i]) && /\s/.test(html[i + 1] ?? '')) {
        ends.push(i + 1);
      }
      i++;
      continue;
    }
    const close = html.indexOf('>', i);
    if (close === -1) {
      break;
    }
    const tag = html.slice(i, close + 1);
    i = close + 1;
    if (/^<code[\s>]/.test(tag)) {
      const end = html.indexOf('</code>', i);
      i = end === -1 ? html.length : end + '</code>'.length;
    }
  }
  return ends;
}

export function hueOf(k: string): string {
  return 'o-' + 'abcd'.charAt('abcdefghijklmnopqrstuvwxyz'.indexOf(k) % 4);
}

export function optOf(q: Ruling, view: string): Opt | undefined {
  const opts = q.opts ?? [];
  const letter =
    view === 'today' ? opts.find(o => o.today === true)?.k : view.slice(-1);
  return letter === undefined ? undefined : opts.find(x => x.k === letter);
}

export function needsOf(o: Opt): string[] {
  return typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
}

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
        ' tabindex="0">' +
        `<button type="button" class="lt disc ${hueOf(o.k)}" data-pick="${pick}" aria-label="pick ${pick}">${o.k}</button>` +
        `<span class="vt">${o.t ?? ''}${chips ? `<span class="vchips"> ${chips}</span>` : ''}<span class="pmark">✓ picked</span></span>` +
        `<span class="vg">${o.g ?? ''}</span>` +
        `<span class="vc">${o.c ?? ''}</span>` +
        '</div>'
      );
    })
    .join('');
  const none =
    `<div class="vrow none" data-pick="${id}n">` +
    `<button type="button" class="lt disc none" data-pick="${id}n" aria-label="pick ${id}n">n</button>` +
    '<span class="vt">none of these fit<span class="pmark">✓ picked</span></span>' +
    '</div>';
  const note =
    `<div class="vfoot"><input class="rnote" data-note="${id}" placeholder="note for ${id} — anything its answer should carry" aria-label="note for ${id}"></div>`;
  const hint = '<div class="vhint">a row shows its picture below</div>';
  return (
    `<div class="vtable"><div class="vhead"><span>option</span><span>gain</span><span>cost</span></div>${rows}${none}${note}${hint}</div>`
  );
}
