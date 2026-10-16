import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import type { Page, Ruling } from './schema.ts';

import { bodiesOption, bodiesToday } from './bodies.ts';
import { chromeScript, panelHtml } from './chrome.ts';
import { diagramView, mermaidBoot } from './diagram.ts';
import { esc, hueOf, optOf, sentenceEnds, stripTags, verdictTable, viewTabs, wrapId } from './html.ts';
import { seqView } from './seq.ts';
import { pageCss } from './style.ts';

export const PAGE_FILE = 'page.js';
export const MERMAID_FILE = 'mermaid.min.js';

const assemblyCss = `
.vrow:has(.disc[aria-pressed="true"]) { border-left-color: var(--o); background: color-mix(in srgb, var(--o) 12%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--o) 30%, transparent); }
.vrow .disc[aria-pressed="true"] { background: var(--o); color: var(--sheet); border-color: var(--o); box-shadow: 0 0 0 3px color-mix(in srgb, var(--o) 22%, transparent); }
.vrow:has(.disc[aria-pressed="true"]) .pmark { display: inline; }
.vrow:has(.disc[aria-pressed="true"]) .onote { display: block; }
.vrow.unmet { border-left-style: dashed; }
.vrow.unmet .pmark { display: none; }
.dep { border: 1px dashed transparent; border-radius: 4px; padding: 0 4px; white-space: nowrap; }
.unmet .dep { color: var(--k-fail); font-weight: 600; border-color: var(--k-fail); }
.vwrap[aria-pressed="true"] .stage { background: color-mix(in srgb, var(--o) 4%, var(--sheet)); }
.onote { grid-column: 1 / -1; display: none; margin-top: 4px; font: 12.5px var(--sans); color: var(--ink); background: none; border: 0; border-bottom: 1px dashed var(--rule); padding: 5px 2px 4px; width: min(100%, 420px); }
.onote:focus { outline: none; border-bottom-color: var(--o); }
.onote::placeholder { color: var(--muted); opacity: 0.7; }
.ghead .quick { font: 600 var(--mono-l) var(--mono); color: var(--ink); background: var(--sheet); border: 1px solid var(--rule); border-radius: 999px; padding: 4px 13px; cursor: pointer; }
.ghead .quick:hover { border-color: var(--ink); }

.bar { position: fixed; z-index: 10; bottom: 18px; left: 50%; transform: translateX(calc(-50% + 114px)); width: min(856px, calc(100vw - 228px - 48px)); background: var(--sheet); border: 1px solid var(--rule); border-radius: 12px; box-shadow: 0 8px 28px color-mix(in srgb, var(--ink) 14%, transparent); }
.bar-in { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 12px; }
.chips { flex: 1 1 200px; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.chips .empty { font: 500 var(--mono-l) var(--mono); color: var(--muted); padding: 6px 2px; }
.chip { display: inline-flex; align-items: center; gap: 6px; font: 600 var(--mono-l) var(--mono); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); border-radius: 999px; padding: 3px 6px 3px 4px; }
.chip .d { width: 19px; height: 19px; border-radius: 50%; display: inline-grid; place-items: center; font-size: var(--mono-s); font-weight: 700; color: var(--sheet); }
.chip.unmet { border-color: var(--k-fail); }
.chip.unmet .x { color: var(--k-fail); }
.chip .need { font: 500 var(--mono-s) var(--mono); color: var(--k-fail); }
.chip .x { border: 0; background: none; color: var(--muted); cursor: pointer; font: 700 13px var(--sans); padding: 0 3px; line-height: 1; }
.chip .x:hover { color: var(--ink); }
.bar textarea { flex: 0 1 260px; min-width: 150px; min-height: 34px; resize: vertical; font: 12.5px var(--sans); color: var(--ink); background: var(--paper); border: 1px solid var(--rule); border-radius: 7px; padding: 8px 10px; }
.bar textarea:focus { outline: none; border-color: var(--ink); }
.bar button.go { flex: none; font: 600 13px var(--sans); color: var(--sheet); background: var(--ink); border: 0; border-radius: 7px; padding: 9px 16px; cursor: pointer; }
.bar button.go:hover { opacity: 0.88; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

.bar.rest .bar-in { padding: 6px 12px; }
.bar.rest textarea { display: none; }
.bar.rest button.go { padding: 6px 14px; }
.bar .bar-tab { display: none; font: 600 var(--mono-l) var(--mono); color: var(--ink); background: var(--sheet); border: 1px solid var(--rule); border-radius: 999px; padding: 8px 16px; cursor: pointer; box-shadow: 0 8px 28px color-mix(in srgb, var(--ink) 14%, transparent); }

@media (max-width: 979px) {
  .side { display: none; }
  .doc { margin-left: 0; }
  .bar { left: 12px; right: 12px; transform: none; width: auto; }
}

@media (max-width: 640px) {
  .bar { bottom: 12px; text-align: center; }
  .bar .bar-in { display: none; }
  .bar.open .bar-in { display: flex; flex-direction: column; align-items: stretch; max-height: calc(100vh - 120px); overflow-y: auto; }
  .bar.open textarea { display: block; flex: 1 1 auto; width: 100%; min-width: 0; }
  .bar .chips { flex-basis: auto; }
  .bar .bar-tab { display: inline-flex; margin: 8px 0 0; }
}
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

// validatePage's green verdict already proved every group ruling exists.
function rulingOf(P: Page, id: string): Ruling {
  return P.rulings[id];
}

function foldHtml(rest: string): string {
  return `<details class="fold"><summary>the rest</summary>${rest}</details>`;
}

function todayHtml(today: string): string {
  const cut = sentenceEnds(today)[1];
  if (cut === undefined || today.slice(cut).trim() === '') {
    return `<p class="today">${today}</p>`;
  }
  return (
    `<p class="today">${today.slice(0, cut)}</p>` +
    foldHtml(`<p class="today">${today.slice(cut).trim()}</p>`)
  );
}

function noteHtml(html: string): string {
  const lead = /<b>.*?<\/b>/.exec(html);
  if (lead === null) {
    return html;
  }
  const cut = lead.index + lead[0].length;
  const rest = html.slice(cut);
  return rest.trim() === '' ? html : `${html.slice(0, cut)} ${foldHtml(rest)}`;
}

function viewsOf(q: Ruling, id: string): string[] {
  const hasBase =
    q.seq !== undefined ||
    (q.bodies !== undefined && 'today' in q.bodies) ||
    (q.diagram !== undefined && 'today' in q.diagram.views);
  const out: string[] = hasBase ? ['today'] : [];
  for (const o of q.opts ?? []) {
    if (o.today !== true) {
      out.push(id + o.k);
    }
  }
  return out;
}

function stageOf(q: Ruling, id: string, view: string): string {
  if (q.bodies !== undefined) {
    return view === 'today' ? bodiesToday(q) : bodiesOption(q, view);
  }
  if (q.seq !== undefined) {
    return seqView(q, id, view);
  }
  return diagramView(q, view);
}

function compareOf(q: Ruling, id: string): string {
  const views = viewsOf(q, id);
  const wraps = views
    .map((view, i) => {
      const o = optOf(q, view);
      return (
        `<div class="vwrap${o ? ` ${hueOf(o.k)}` : ''}" data-view="${view}"` +
        (o ? ` data-pick="${view === 'today' ? id + o.k : view}"` : '') +
        ` role="tabpanel" id="${wrapId(id, view)}"${i === 0 ? '' : ' hidden'}>` +
        stageOf(q, id, view) +
        '</div>'
      );
    })
    .join('');
  return `<div class="compare">${viewTabs(q, id, views)}${wraps}</div>`;
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
      ([mid]) =>
        `<div class="changed"><b>${mid} is merged into this ruling.</b></div>`,
    )
    .join('');
  return (
    `<section class="ruling" id="r-${id}">` +
    `<div class="rhead"><span class="rid">${id}</span><div><h3>${q.title ?? ''}</h3>` +
    `<button type="button" class="none-btn" data-none="${id}">none of these fit</button></div></div>` +
    mergedInto +
    `<p class="stake">${q.stake ?? ''}</p>` +
    todayHtml(q.today ?? '') +
    verdictTable(q, id) +
    compareOf(q, id) +
    '</section>'
  );
}

function sideHtml(P: Page): string {
  const ruleable = P.groups
    .flatMap(g => g.rulings)
    .filter(id => rulingOf(P, id).merged === undefined).length;
  const groups = P.groups
    .map(
      g =>
        `<div class="sg"><h2><span>${esc(g.label ?? '')}</span><span class="n">${g.rulings.length}</span></h2>` +
        g.rulings
          .map(id => {
            const q = rulingOf(P, id);
            const merged = q.merged !== undefined ? ' merged' : '';
            return (
              `<a class="rl${merged}" href="#r-${id}"><span class="gid">${id}</span>` +
              `<span class="t">${esc(stripTags(q.title ?? ''))}</span></a>`
            );
          })
          .join('') +
        '</div>',
    )
    .join('');
  return `<nav class="side" aria-label="Rulings"><div class="scount" id="ruled-count">0 of ${ruleable} ruled</div>${groups}</nav>`;
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
    .map(n => `<div class="note">${noteHtml(n.html ?? '')}</div>`)
    .join('');
  const groups = P.groups
    .map(g => {
      const rec = g.rulings
        .filter(id => rulingOf(P, id).merged === undefined)
        .map(id => {
          const o = (rulingOf(P, id).opts ?? []).find(x => x.rec === true);
          return o ? id + o.k : '';
        })
        .filter(x => x !== '');
      return (
        `<div class="ghead"><h2>${esc(g.label ?? '')}</h2>` +
        (g.quick === true
          ? `<button type="button" class="quick" data-picks="${rec.join(' ')}">accept ★ recommended</button>`
          : '') +
        '</div>' +
        g.rulings.map(id => rulingSection(P, id)).join('')
      );
    })
    .join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(P.title ?? '')}</title>
<style>
${pageCss}${assemblyCss}</style>
</head>
<body${P.key ? ` data-key="${esc(P.key)}"` : ''}>
${sideHtml(P)}
<a class="where" id="rulings-where" hidden></a>
<div class="doc">
<main class="col-in">
<div class="masthead">
<div class="eyebrow">${esc(P.eyebrow ?? '')}</div>
<h1>${esc(P.title ?? '')}</h1>
<p class="sub">${P.sub ?? ''}</p>
</div>
<div class="notes">${notes}</div>
${groups}
</main>
</div>
${panelHtml()}
${hasDiagram ? `<script src="${MERMAID_FILE}"></script>\n${mermaidBoot()}` : ''}
${chromeScript()}
</body>
</html>
`;
  return { html, hasDiagram };
}

// --new seeds from the example that ships beside this module.
export function examplePagePath(): string {
  return fileURLToPath(new URL('./example.page.js', import.meta.url));
}
