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

// Hidden wraps draw broken: paint on first visibility; startOnLoad:false pre-empts mermaid's load run.
export function mermaidBoot(): string {
  return `<script>
(function () {
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.mermaid'));
  var src = nodes.map(function (n) { return n.textContent; });
  var state = nodes.map(function () { return { on: false, dark: null }; });
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  window.mermaid.initialize({ startOnLoad: false });
  function stale(i) {
    return state[i].dark === null || state[i].dark !== mq.matches;
  }
  function paint(i) {
    window.mermaid.initialize({ startOnLoad: false, theme: mq.matches ? 'dark' : 'default' });
    nodes[i].textContent = src[i];
    nodes[i].removeAttribute('data-processed');
    window.mermaid.run({ nodes: [nodes[i]] });
    state[i].dark = mq.matches;
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var i = nodes.indexOf(en.target);
        if (i < 0) return;
        state[i].on = en.isIntersecting;
        if (en.isIntersecting && stale(i)) paint(i);
      });
    });
    nodes.forEach(function (n) { io.observe(n); });
  } else {
    nodes.forEach(function (n, i) { state[i].on = true; });
    nodes.forEach(function (n, i) { if (stale(i)) paint(i); });
  }
  if (mq.addEventListener) mq.addEventListener('change', function () {
    nodes.forEach(function (n, i) { if (state[i].on && stale(i)) paint(i); });
  });
})();
</script>`;
}
