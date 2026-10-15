import type { Ruling } from './schema.ts';

import { esc, verdictFor, viewHeadFor } from './html.ts';

// Free mermaid text, one block per view: the container text is authored
// data, parsed in the browser on open — the build cannot check its syntax.
export function diagramView(q: Ruling, view: string, attrs = ''): string {
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
    `<section class="view${view === 'today' ? ' today' : ''}${hue ? ` ${hue}` : ''}"${attrs}>${head}` +
    `<div class="stage diagram"><div class="mermaid">${esc(v.text)}</div>` +
    (cap ? `<p class="cap">${cap}</p>` : '') +
    '</div>' +
    verdictFor(q, view) +
    '</section>'
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
  else if (mq.addListener) mq.addListener(flip);
})();
</script>`;
}
