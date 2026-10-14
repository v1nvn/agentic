import type { Ruling } from './schema.ts';

import { esc, viewHeadFor } from './html.ts';

// Free mermaid text, one block per view: the container text is authored
// data, parsed in the browser on open — the build cannot check its syntax.
export function diagramView(q: Ruling, view: string): string {
  const d = q.diagram;
  if (d === undefined) {
    return '';
  }
  const key = view === 'today' ? 'today' : view.slice(-1);
  if (!(key in d.views)) {
    return '';
  }
  const v = d.views[key];
  const { head, hue } = viewHeadFor(q, view);
  const cap = v.cap ?? d.cap;
  return (
    `<section class="view${hue ? ` ${hue}` : ''}">${head}` +
    `<div class="stage diagram"><div class="mermaid">${esc(v.text)}</div>` +
    (cap ? `<p class="cap">${cap}</p>` : '') +
    '</div></section>'
  );
}

// The page's only script: resolve the theme door (?theme= param, else
// prefers-color-scheme) and render every .mermaid container under it.
export function mermaidBoot(): string {
  return `<script>
(function () {
  var attr = document.documentElement.getAttribute('data-theme');
  var dark = attr === 'dark' || (!attr && window.matchMedia('(prefers-color-scheme: dark)').matches);
  window.mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' });
  window.mermaid.run({ querySelector: '.mermaid' });
})();
</script>`;
}
