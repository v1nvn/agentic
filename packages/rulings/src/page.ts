import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import type { Page, Ruling } from './schema.ts';

import { chromeScript, panelHtml } from './chrome.ts';
import { decideHtml } from './decide.ts';
import { esc, stripTags } from './html.ts';
import { pageCss } from './style.ts';

export const PAGE_FILE = 'page.js';

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

function rulingSection(P: Page, id: string): string {
  const q = P.rulings[id];
  const head = `<section class="ruling" id="r-${id}"><span class="rid">${id}</span><h3>${q.title ?? ''}</h3>`;
  if (q.merged !== undefined) {
    return `${head}<p class="lede">Merged into ${q.merged}. ${q.changed ?? ''}</p></section>`;
  }
  return (
    head +
    `<p class="lede"><span class="stake">${q.stake ?? ''}</span> ${q.today ?? ''}</p>` +
    decideHtml(q, id) +
    '</section>'
  );
}

function isLive(q: Ruling): boolean {
  return q.merged === undefined;
}

function sideHtml(P: Page): string {
  const ruleable = Object.values(P.rulings).filter(isLive).length;
  const groups = P.groups
    .map(
      g =>
        `<div class="sg"><h2><span>${esc(g.label ?? '')}</span><span>${g.rulings.length}</span></h2>` +
        g.rulings
          .map(id => {
            const q = P.rulings[id];
            return (
              `<a class="rl${isLive(q) ? '' : ' merged'}" href="#r-${id}"><span class="gid">${id}</span>` +
              `<span class="t">${esc(stripTags(q.title ?? ''))}</span></a>`
            );
          })
          .join('') +
        '</div>',
    )
    .join('');
  return (
    '<nav class="side" aria-label="Rulings">' +
    '<div class="layout" role="group" aria-label="Layout">' +
    '<button type="button" data-layout="side" aria-pressed="true">Side by side</button>' +
    '<button type="button" data-layout="stacked" aria-pressed="false">Stacked</button></div>' +
    `<div class="scount" id="ruled-count">0 of ${ruleable} ruled</div>${groups}</nav>`
  );
}

function groupHtml(P: Page, g: Page['groups'][number]): string {
  const picks = g.rulings
    .filter(id => isLive(P.rulings[id]))
    .map(
      id =>
        id + ((P.rulings[id].opts ?? []).find(o => o.rec === true)?.k ?? ''),
    );
  return (
    `<div class="ghead"><h2>${esc(g.label ?? '')}</h2>` +
    (g.quick === true
      ? `<button type="button" class="quick" data-picks="${picks.join(' ')}">Accept ★ recommended</button>`
      : '') +
    '</div>' +
    g.rulings.map(id => rulingSection(P, id)).join('')
  );
}

// Call only after validatePage returns green — the cast is what the green verdict proved.
export function buildPage(input: unknown): string {
  const P = input as Page;
  const notes = (P.notes ?? [])
    .map(n => `<p class="note">${n.html ?? ''}</p>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(P.title ?? '')}</title>
<style>
${pageCss}</style>
</head>
<body${P.key ? ` data-key="${esc(P.key)}"` : ''}>
${sideHtml(P)}
<a class="where" id="rulings-where" hidden></a>
<main class="doc"><div class="doc-in">
<header class="mast">
<div class="eyebrow">${esc(P.eyebrow ?? '')}</div>
<h1>${esc(P.title ?? '')}</h1>
<p class="sub">${P.sub ?? ''}</p>
</header>
<div class="notes">${notes}</div>
${P.groups.map(g => groupHtml(P, g)).join('')}
</div></main>
${panelHtml()}
${chromeScript()}
</body>
</html>
`;
}

// --new seeds from the example that ships beside this module.
export function examplePagePath(): string {
  return fileURLToPath(new URL('./example.page.js', import.meta.url));
}
