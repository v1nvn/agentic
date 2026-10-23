import type { Stage } from './html.ts';
import type { Ruling } from './schema.ts';

// Authored HTML, inserted as written: validatePage has already refused what would break the page.
export function figureView(q: Ruling, view: string): Stage | undefined {
  const d = q.figure;
  const key = view === 'today' ? 'today' : view.slice(-1);
  if (d === undefined || !(key in d.views)) {
    return undefined;
  }
  const v = d.views[key];
  return {
    body: `<div class="fig">${v.html}</div>`,
    cap: v.cap ?? d.cap ?? '',
  };
}
