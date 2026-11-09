import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import type { Page, Ruling } from './schema.ts';

import { decisionHtml } from './card.ts';
import { chromeScript, composerHtml } from './chrome.ts';
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

function rulingSection(id: string, q: Ruling): string {
  return (
    `<section class="ruling" id="r-${id}"><span class="rid">${id}</span><h3>${q.title ?? ''}</h3>` +
    (q.changed
      ? `<p class="changed"><span class="lbl">Changed</span>${q.changed}</p>`
      : '') +
    `<p class="stake"><b>${q.stake ?? ''}</b></p>` +
    decisionHtml(q, id) +
    '</section>'
  );
}

function chip(id: string, q: Ruling, live: boolean): string {
  const t = esc(stripTags(q.title ?? ''));
  const ruled =
    q.ruled === undefined
      ? ''
      : `<span class="got">${q.ruled === 'n' ? 'n' : esc(q.ruled + ', ' + stripTags((q.opts ?? []).find(o => o.k === q.ruled)?.t ?? ''))}</span>`;
  const inner = `<span class="id">${id}</span><span>${t}${ruled}</span>`;
  return live
    ? `<a class="chip live" href="#r-${id}">${inner}</a>`
    : `<span class="chip">${inner}</span>`;
}

function lane(label: string, items: string[]): string {
  return items.length === 0
    ? ''
    : `<div class="lane"><span class="lbl">${label}</span>${items.join('')}</div>`;
}

function mapHtml(P: Page): string {
  const all = Object.entries(P.rulings);
  const roots = [
    ...new Set(
      all.flatMap(([, q]) =>
        q.opts === undefined && q.after ? [q.after] : [],
      ),
    ),
  ];
  return (
    '<nav class="map" aria-label="Rulings by round">' +
    lane(
      'Ruled',
      all
        .filter(([, q]) => q.ruled !== undefined)
        .map(([id, q]) => chip(id, q, false)),
    ) +
    lane(
      'Rule now',
      all
        .filter(([, q]) => q.opts !== undefined && q.ruled === undefined)
        .map(([id, q]) => chip(id, q, true)),
    ) +
    roots
      .map(r =>
        lane(
          `After ${r}`,
          all
            .filter(([, q]) => q.opts === undefined && q.after === r)
            .map(([id, q]) => chip(id, q, false)),
        ),
      )
      .join('') +
    '</nav>'
  );
}

// Call only after validatePage returns green — the cast is what the green verdict proved.
export function buildPage(input: unknown): string {
  const P = input as Page;
  const open = Object.entries(P.rulings).filter(
    ([, q]) => q.opts !== undefined && q.ruled === undefined,
  );
  const decided = (P.decided ?? []).map(d => `<li>${d}</li>`).join('');
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
<main class="doc">
<header class="mast">
<div class="eyebrow">${esc(P.eyebrow ?? '')}</div>
<h1>${esc(P.title ?? '')}</h1>
${P.sub ? `<p class="sub">${P.sub}</p>` : ''}
</header>
${mapHtml(P)}
${open.map(([id, q]) => rulingSection(id, q)).join('\n')}
${decided ? `<section class="decided"><h2 class="lbl">Decided without you</h2><ul>${decided}</ul></section>` : ''}
${composerHtml()}
</main>
${chromeScript()}
</body>
</html>
`;
}

// --new seeds from the example that ships beside this module.
export function examplePagePath(): string {
  return fileURLToPath(new URL('./example.page.js', import.meta.url));
}
