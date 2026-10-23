import type { Ruling } from './schema.ts';

// Authored HTML, inserted as written: validatePage has already refused what would break the page.
export function figureView(q: Ruling, view: string): string {
  const d = q.figure;
  if (d === undefined) {
    return '';
  }
  const key = view === 'today' ? 'today' : view.slice(-1);
  if (!(key in d.views)) {
    return '';
  }
  const v = d.views[key];
  const cap = v.cap ?? d.cap;
  return (
    `<div class="stage figure"><div class="fig">${v.html}</div>` +
    (cap ? `<p class="cap">${cap}</p>` : '') +
    '</div>'
  );
}
