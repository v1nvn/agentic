import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import type { Opt, Page, Ruling } from './schema.ts';

import { bodiesView } from './bodies.ts';
import { diagramView, mermaidBoot } from './diagram.ts';
import { esc, hueOf, stripTags } from './html.ts';
import { seqView } from './seq.ts';
import { pageCss } from './style.ts';
import { themeScript } from './theme.ts';

export const PAGE_FILE = 'page.js';
export const MERMAID_FILE = 'mermaid.min.js';

// Chrome the assembly adds beyond pageCss: the document TOC, the merged
// meta-line, the notes block.
const assemblyCss = `
.toc { display: grid; gap: 6px; padding-block: 12px 20px; border-bottom: 1px solid var(--rule); }
.toc > div { display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: baseline; }
.toc .grp { font: 600 11.5px var(--mono); color: var(--muted); }
.toc a { color: var(--ink); text-decoration: none; font: 500 14px/1.3 var(--sans); display: inline-flex; gap: 7px; align-items: baseline; }
.toc a:hover { text-decoration: underline; }
.toc .gid { font: 600 12px var(--mono); color: var(--muted); }
.toc a.merged .t { color: var(--muted); font-style: italic; }
.notes { display: grid; gap: 8px; padding-top: 16px; }
.meta-line { font: 12.5px var(--mono); color: var(--muted); margin-top: 3px; }
`;

// The authoring door: `var PAGE = { … }` run in a vm, pages being plain data
// that lives outside any tsconfig.
export function loadPageFile(pageFile: string): unknown {
  const ctx: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(pageFile, 'utf8'), ctx, {
    filename: pageFile,
  });
  if (ctx.PAGE === undefined || ctx.PAGE === null) {
    throw new Error('defines no PAGE');
  }
  return ctx.PAGE;
}

function needsOf(o: Opt): string[] {
  return typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
}

function viewHtml(q: Ruling, id: string, view: string): string {
  if (q.seq !== undefined) {
    return seqView(q, id, view);
  }
  if (q.bodies !== undefined) {
    return bodiesView(q, view);
  }
  return diagramView(q, view);
}

// The base "today" view first when the ruling carries one, then each live
// non-today option in letter order — the view set a reader walks, stacked.
function viewsOf(q: Ruling, id: string): string[] {
  const views: string[] = [];
  const hasBase =
    q.seq !== undefined ||
    (q.bodies !== undefined && 'today' in q.bodies) ||
    (q.diagram !== undefined && 'today' in q.diagram.views);
  if (hasBase) {
    views.push('today');
  }
  for (const o of q.opts ?? []) {
    if (o.today !== true) {
      views.push(id + o.k);
    }
  }
  return views;
}

function compareHtml(q: Ruling): string {
  const opts = q.opts ?? [];
  const hasHow = opts.some(o => o.w !== undefined);
  const rows = hasHow ? 4 : 3;
  const cols = opts
    .map(o => {
      const chips = [
        o.rec === true ? '<span class="star">★ my pick</span>' : '',
        o.today === true ? '<span>as today</span>' : '',
        ...needsOf(o).map(n => `<span>needs ${n}</span>`),
      ]
        .filter(c => c !== '')
        .join('');
      return (
        `<div class="col ${hueOf(o.k)}">` +
        `<div class="colhead"><span class="lt">${o.k}</span><span><span>${o.t ?? ''}</span>` +
        (chips ? `<span class="meta">${chips}</span>` : '') +
        '</span></div>' +
        (hasHow ? `<p class="how">${o.w ?? ''}</p>` : '') +
        `<div class="gc gain"><span class="sign">+</span><span>${o.g ?? ''}</span></div>` +
        `<div class="gc cost"><span class="sign">−</span><span>${o.c ?? ''}</span></div>` +
        '</div>'
      );
    })
    .join('');
  return (
    `<div class="compare"><div class="matrix" style="grid-template-columns:repeat(${opts.length}, minmax(220px, 1fr));--rows:${rows}">` +
    cols +
    '</div></div>'
  );
}

// validatePage's green verdict already proved every group ruling exists.
function rulingOf(P: Page, id: string): Ruling {
  return P.rulings[id];
}

function rulingSection(P: Page, id: string): string {
  const q = rulingOf(P, id);
  if (q.merged !== undefined) {
    return (
      `<section class="ruling" id="r-${id}"><div class="rhead"><span class="rid">${id}</span>` +
      `<div><h3>${q.title ?? ''}</h3><p class="meta-line">Merged into ${q.merged}</p></div></div>` +
      `<div class="changed">${q.changed ?? ''}</div></section>`
    );
  }
  const mergedInto = Object.entries(P.rulings)
    .filter(([, m]) => m.merged === id)
    .map(
      ([mid, m]) =>
        `<div class="changed"><b>${mid} is merged into this ruling.</b> ${m.changed ?? ''}</div>`,
    )
    .join('');
  return (
    `<section class="ruling" id="r-${id}">` +
    `<div class="rhead"><span class="rid">${id}</span><div><h3>${q.title ?? ''}</h3></div></div>` +
    mergedInto +
    `<p class="stake">${q.stake ?? ''}</p>` +
    `<p class="today">${q.today ?? ''}</p>` +
    `<div class="views">${viewsOf(q, id)
      .map(v => viewHtml(q, id, v))
      .join('')}</div>` +
    compareHtml(q) +
    '</section>'
  );
}

function tocHtml(P: Page): string {
  const rows = P.groups
    .map(
      g =>
        `<div><span class="grp">${esc(g.label ?? '')}</span>` +
        g.rulings
          .map(id => {
            const q = rulingOf(P, id);
            const merged = q.merged !== undefined ? ' class="merged"' : '';
            return (
              `<a href="#r-${id}"${merged}><span class="gid">${id}</span>` +
              `<span class="t">${esc(stripTags(q.title ?? ''))}</span></a>`
            );
          })
          .join('') +
        '</div>',
    )
    .join('');
  return `<nav class="toc" aria-label="Rulings">${rows}</nav>`;
}

export interface BuiltPage {
  hasDiagram: boolean;
  html: string;
}

// The whole page as one deterministic string: no clock, no paths, no
// randomness. Call only after validatePage returns green — the cast is what
// the green verdict proved.
export function buildPage(input: unknown): BuiltPage {
  const P = input as Page;
  const hasDiagram = Object.values(P.rulings).some(
    q => q.diagram !== undefined,
  );
  const notes = (P.notes ?? [])
    .map(n => `<div class="note">${n.html ?? ''}</div>`)
    .join('');
  const groups = P.groups
    .map(
      g =>
        `<div class="ghead"><h2>${esc(g.label ?? '')}</h2></div>` +
        g.rulings.map(id => rulingSection(P, id)).join(''),
    )
    .join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(P.title ?? '')}</title>
${themeScript()}
<style>
${pageCss}${assemblyCss}</style>
</head>
<body>
<div class="shell masthead">
<div>
<div class="eyebrow">${esc(P.eyebrow ?? '')}</div>
<h1>${esc(P.title ?? '')}</h1>
<p class="sub">${P.sub ?? ''}</p>
</div>
</div>
<main class="shell">
${tocHtml(P)}
<div class="notes">${notes}</div>
${groups}
</main>
${hasDiagram ? `<script src="${MERMAID_FILE}"></script>\n${mermaidBoot()}` : ''}
</body>
</html>
`;
  return { html, hasDiagram };
}

// --new seeds from the example that ships beside this module.
export function examplePagePath(): string {
  return fileURLToPath(new URL('./example.page.js', import.meta.url));
}
