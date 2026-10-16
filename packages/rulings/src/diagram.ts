import type { Ruling } from './schema.ts';

import { esc, optOf } from './html.ts';

// Authored mermaid text: parsed in the browser on open, unchecked by the build.
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
  const cap = v.cap ?? d.cap;
  const w = optOf(q, view)?.w;
  return (
    `<div class="stage diagram"><div class="mermaid">${esc(v.text)}</div>` +
    (cap ? `<p class="cap">${cap}</p>` : '') +
    (w ? `<p class="how">${w}</p>` : '') +
    '</div>'
  );
}

// The diagram boot: the system theme decides, and every .mermaid container
// renders under it — again, without a reload, when the scheme flips.
export function mermaidBoot(): string {
  return `<script>
(function () {
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.mermaid'));
  var src = nodes.map(function (n) { return n.textContent; });
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function draw(dark) {
    window.mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' });
    nodes.forEach(function (n, i) {
      n.textContent = src[i];
      n.removeAttribute('data-processed');
    });
    window.mermaid.run({ querySelector: '.mermaid' });
  }
  draw(mq.matches);
  function flip(e) { draw(e.matches); }
  if (mq.addEventListener) mq.addEventListener('change', flip);
})();
</script>`;
}
