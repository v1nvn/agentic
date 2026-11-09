import type { Opt, Ruling } from './schema.ts';

import { stripTags } from './html.ts';

// Authored HTML, inserted as written: validatePage has already refused what would break the page.
export function figureStrip(q: Ruling, opts: Opt[]): string {
  const d = q.figure;
  if (d === undefined) {
    return '';
  }
  const keys = ['today', ...opts.filter(o => o.today !== true).map(o => o.k)];
  const panels = keys
    .filter(k => k in d.views)
    .map(k => {
      const v = d.views[k];
      const o =
        k === 'today'
          ? opts.find(x => x.today === true)
          : opts.find(x => x.k === k);
      const head = o
        ? `<span class="disc">${o.k}</span>${k === 'today' ? 'Today' : stripTags(o.t ?? '')}`
        : 'Today';
      return (
        `<div class="panel${k === 'today' ? ' today' : ''}" data-k="${o?.k ?? ''}">` +
        `<div class="ph">${head}</div><div class="fig">${v.html}</div>` +
        (v.cap ? `<p class="pc">${v.cap}</p>` : '') +
        '</div>'
      );
    });
  return (
    (d.cap ? `<p class="vcap">${d.cap}</p>` : '') +
    `<div class="strip" style="--n:${panels.length}">${panels.join('')}</div>`
  );
}
