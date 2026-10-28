export const pageCss = `
:root {
  --paper: #eceee9; --sheet: #fbfbf9; --ink: #1b2130; --muted: #5d6573; --rule: #d7dad1; --code: #f1f2ee;
  --add: #1a7f37; --del: #cf222e; --k-call: #1b2130; --k-money: #a15c07; --k-store: #0b7285; --k-check: #6b7280; --k-fail: #c92a2a;
  --tk-kw: #7048b6; --tk-str: #2f7d4f; --tk-com: #87907e; --tk-num: #a15c07; --tk-fn: #1c66c9; --tk-cls: #0b7285;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --display: "Iowan Old Style", "Century Schoolbook", C059, Georgia, serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --t: 20px; --b: 14px; --s: 12.5px;
  --r: 8px; --r-s: 4px;
  --measure: 65ch;
  --gap-s: 16px; --gap-m: 24px; --gap-l: 40px;
  --side: 228px;
  --o: var(--ink);
}

* { box-sizing: border-box; }
html { background: var(--paper); scroll-behavior: smooth; }
body { margin: 0; background: var(--paper); color: var(--ink); font: var(--b)/1.55 var(--sans); }
h1, h2, h3, p { margin: 0; }
b, strong { font-weight: 500; }
code { font-family: var(--mono); background: var(--code); padding: 0 4px; border-radius: var(--r-s); overflow-wrap: anywhere; }
button { font: inherit; color: inherit; background: none; border: 0; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } html { scroll-behavior: auto; } }

.side { position: fixed; inset: 0 auto 0 0; width: var(--side); padding: 20px 14px 96px; border-right: 1px solid var(--rule); overflow-y: auto; overscroll-behavior: contain; font-size: var(--s); }
.layout { display: flex; gap: 2px; padding: 2px; margin-bottom: 18px; border: 1px solid var(--rule); border-radius: var(--r); }
.layout button { flex: 1; padding: 4px 0; border-radius: var(--r-s); color: var(--muted); cursor: pointer; }
.layout button[aria-pressed="true"] { background: var(--sheet); color: var(--ink); font-weight: 500; }
.scount { display: block; color: var(--muted); text-decoration: none; padding: 0 8px 12px; }
.sg { margin-bottom: 14px; }
.sg h2 { display: flex; justify-content: space-between; padding: 0 8px 4px; font: 500 var(--s) var(--sans); color: var(--muted); }
.rl { display: flex; gap: 8px; align-items: baseline; padding: 4px 8px; border-radius: var(--r-s); color: var(--muted); text-decoration: none; }
.rl .gid { flex: none; font-family: var(--mono); }
.rl .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rl:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 5%, transparent); }
.rl.here { color: var(--ink); background: var(--sheet); }
.rl.merged .t { font-style: italic; }
.rl.ruled { color: var(--ink); }
.rl.ruled::after { content: "✓"; margin-left: auto; flex: none; color: var(--add); }

.where { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9; display: none; max-width: calc(100vw - 24px); padding: 6px 14px; border: 1px solid var(--rule); border-radius: var(--r); background: var(--sheet); color: var(--ink); font-size: var(--s); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 6px 24px color-mix(in srgb, var(--ink) 12%, transparent); }

.doc { margin-left: var(--side); }
.doc-in { max-width: 1240px; margin: 0 auto; padding: 32px 32px var(--gap-l); }
.mast { max-width: var(--measure); }
.eyebrow { font-size: var(--s); color: var(--muted); }
.mast h1 { font: 600 26px/1.3 var(--display); margin-top: 4px; }
.mast .sub { color: var(--muted); margin-top: 4px; }
.notes { max-width: var(--measure); margin-top: var(--gap-s); display: grid; gap: 6px; color: var(--muted); }
.note b { color: var(--ink); }

.ghead { display: flex; gap: 14px; align-items: center; margin-top: var(--gap-l); padding-top: 12px; border-top: 1px solid var(--rule); }
.notes + .ghead { margin-top: var(--gap-m); }
.ghead h2 { font: 500 var(--s) var(--sans); color: var(--muted); }
.ghead .quick { padding: 3px 10px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--sheet); font-size: var(--s); cursor: pointer; }
.ghead .quick:hover { border-color: var(--ink); }

.ruling { display: grid; grid-template-columns: 40px minmax(0, 1fr); margin-top: var(--gap-l); scroll-margin-top: var(--gap-s); }
.ghead + .ruling { margin-top: var(--gap-s); }
.ruling > * { grid-column: 2; max-width: var(--measure); }
.ruling > .rid { grid-column: 1; font: 500 var(--s)/28px var(--mono); color: var(--muted); }
.ruling > .decide { grid-column: 1 / -1; max-width: none; }
.ruling h3 { font: 600 var(--t)/1.4 var(--display); text-wrap: balance; }
.lede { margin-top: 8px; color: var(--muted); text-wrap: pretty; }
.lede .stake, .lede b { color: var(--ink); }

.decide { margin-top: var(--gap-s); display: grid; grid-template-columns: minmax(300px, 2fr) minmax(0, 3fr); background: var(--sheet); border-radius: var(--r); }
.opts { display: flex; flex-direction: column; gap: 2px; padding: 8px; min-width: 0; align-self: start; position: sticky; top: var(--gap-s); }
.view { min-width: 0; }
.vw { position: sticky; top: var(--gap-s); }
.decide:is(.wide, .bare, .stacked .decide) { grid-template-columns: minmax(0, 1fr); }
.decide:is(.wide, .bare, .stacked .decide) :is(.vw, .opts) { position: static; }

.opt { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 2px 12px; padding: 10px 12px; border-radius: var(--r); cursor: pointer; }
.opt > :not(.disc) { grid-column: 2; }
.opt > input { position: absolute; opacity: 0; margin: 0; }
.opt:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.opt.looked { background: color-mix(in srgb, var(--o) 9%, transparent); }
.opt input:checked + .disc { background: var(--o); color: var(--sheet); }
.opt:has(input:focus-visible) { outline: 2px solid var(--o); outline-offset: -2px; }
button.opt { text-align: left; }
.ot { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
.ot-t { font-weight: 500; }
.tag { padding: 0 6px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--paper); font-size: var(--s); color: var(--muted); white-space: nowrap; }
.tag.rec { color: var(--ink); border-color: var(--ink); font-weight: 500; }
.unmet .tag.need { color: var(--ink); text-decoration: underline dotted; text-underline-offset: 3px; }
.g, .c, .w { font-size: var(--s); }
.g::before { content: "+ "; color: var(--add); font-weight: 500; }
.c { color: var(--muted); }
.c::before { content: "− "; font-weight: 500; }
.w { color: var(--muted); font-style: italic; }
@media (min-width: 980px) {
  .decide:is(.wide, .bare, .stacked .decide) .opt { grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1fr); }
  .decide:is(.wide, .bare, .stacked .decide) .opt > :is(.ot, .w) { grid-column: 2 / -1; }
  .decide:is(.wide, .bare, .stacked .decide) .opt > .c { grid-column: 3; }
}

.disc { width: 28px; height: 28px; display: inline-grid; place-items: center; align-self: start; border: 1.5px solid var(--o); border-radius: 50%; color: var(--o); font: 500 var(--s) var(--mono); }
.rfoot { grid-column: 1 / -1; padding: 12px 20px; }
.nlabel { display: block; padding-bottom: 2px; font-size: var(--s); color: var(--muted); }
.rnote { display: block; width: 100%; resize: vertical; padding: 5px 0; border: 0; border-bottom: 1px solid var(--rule); background: none; color: var(--ink); font: var(--s)/1.5 var(--sans); }
.rnote:focus { outline: none; border-bottom-color: var(--ink); }

.vw { padding: 18px 20px 20px; }
.vh { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: center; }

.vcap { color: var(--muted); }
.vcap b { color: var(--ink); }
.pic { margin: 16px 0 0 40px; min-width: 0; }
.pic .scroll { overflow-x: auto; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; padding-bottom: 8px; font-size: var(--s); color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 18px; height: 0; border-top: 2.5px solid var(--k); }
.legend i.dash { border-top-style: dashed; }
.legend .sw { width: 14px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--o) 18%, transparent); border: 1px solid var(--o); }
.btag { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 6px; font-size: var(--s); color: var(--muted); }
.btag b { color: var(--ink); }
pre { margin: 0; padding: 12px 14px; overflow-x: auto; background: var(--code); border-radius: var(--r); color: var(--ink); font: var(--s)/1.6 var(--mono); white-space: pre; }
pre.diff { padding: 12px 0; }
.fig { overflow-x: auto; }
.fig svg { max-width: 100%; height: auto; }

.dl { display: block; padding: 0 14px 0 26px; position: relative; }
.dl::before { position: absolute; left: 10px; font-weight: 500; }
.dl.add { background: color-mix(in srgb, var(--add) 16%, transparent); }
.dl.add::before { content: "+"; color: var(--add); }
.dl.del { background: color-mix(in srgb, var(--del) 14%, transparent); }
.dl.del::before { content: "−"; color: var(--del); }
.dl.same { opacity: 0.72; }
.token.keyword, .token.boolean, .token.constant, .token.important, .token.tag { color: var(--tk-kw); }
.token.string, .token.char, .token.attr-value, .token.regex { color: var(--tk-str); }
.token.comment, .token.prolog, .token.doctype, .token.cdata { color: var(--tk-com); font-style: italic; }
.token.number, .token.symbol, .token.attr-name { color: var(--tk-num); }
.token.function, .token.method { color: var(--tk-fn); }
.token.class-name, .token.maybe-class-name { color: var(--tk-cls); }

svg.seq { display: block; margin-inline: auto; font-family: var(--sans); color: var(--ink); }
svg text { fill: currentColor; font-size: var(--s); }
.life { stroke: var(--rule); stroke-width: 1.2; }
.actor rect { fill: color-mix(in srgb, var(--ink) 8%, var(--sheet)); stroke: var(--ink); stroke-width: 1.2; }
.actor text { font-weight: 500; font-size: 13px; }
.num { font: 500 11px var(--sans); fill: var(--muted); }
.e line { stroke-width: 1.8; fill: none; }
text.sub { font-size: 11px; fill: var(--muted); }
.k-call { color: var(--k-call); } .k-call line { stroke: var(--k-call); }
.k-money { color: var(--k-money); } .k-money line { stroke: var(--k-money); }
.k-store { color: var(--k-store); } .k-store line { stroke: var(--k-store); stroke-width: 2.6; }
.k-check { color: var(--k-check); } .k-check line { stroke: var(--k-check); stroke-dasharray: 5 4; }
.k-fail { color: var(--k-fail); } .k-fail line { stroke: var(--k-fail); }
.head { fill: currentColor; }
.self rect { fill: var(--sheet); stroke: currentColor; stroke-width: 1.5; }
.ledger-bg { fill: var(--paper); }
.balh { font: 500 11px var(--sans); fill: var(--muted); }
.bal { font: var(--s) var(--mono); fill: var(--muted); }
.bal.chg { font-weight: 500; fill: var(--ink); }
.band { fill: color-mix(in srgb, var(--o) 13%, transparent); }
.tg rect { fill: var(--paper); stroke: var(--o); stroke-width: 1.3; }
.tg text { font: 500 11px var(--sans); fill: var(--o); }
.tg-gone rect { stroke: var(--muted); } .tg-gone text { fill: var(--muted); }
.ghostrule { stroke: var(--rule); stroke-width: 1.2; stroke-dasharray: 4 4; }
.ghosttag { font: 500 11px var(--mono); fill: var(--muted); }
.gone { opacity: 0.42; }
.same { opacity: 0.55; }
svg text.was { font-size: 11px; fill: var(--muted); }
.was .old { text-decoration: line-through; }
.strike { stroke: var(--o); stroke-width: 1.6; }
svg text.note { font-size: 11px; font-weight: 500; fill: var(--o); }

.composer { max-width: var(--measure); margin-top: var(--gap-l); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.rhint { flex: 1 1 100%; font-size: var(--s); color: var(--muted); }
.composer .nlabel { flex: none; }
.composer textarea { flex: 1 1 240px; min-width: 150px; min-height: 32px; resize: vertical; padding: 7px 10px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--sheet); color: var(--ink); font: var(--s) var(--sans); }
.composer textarea:focus { outline: none; border-color: var(--ink); }
.composer .go { flex: none; padding: 8px 14px; border-radius: var(--r-s); background: var(--ink); color: var(--sheet); font-weight: 600; font-size: var(--s); cursor: pointer; white-space: nowrap; }
.composer .go:disabled { opacity: 0.4; cursor: default; }
.chips { flex: 1 1 200px; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.chips .empty { color: var(--muted); font-size: var(--s); padding: 4px 0; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 2px 2px 8px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--paper); font: var(--s) var(--mono); }
.chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--o); }
.chip .need { padding: 0 6px; border: 1px solid var(--rule); border-radius: var(--r-s); font-family: var(--sans); color: var(--muted); white-space: nowrap; }
.chip.unmet .need { color: var(--ink); text-decoration: underline dotted; text-underline-offset: 3px; }
.chip .x { width: 32px; height: 32px; display: inline-grid; place-items: center; color: var(--muted); cursor: pointer; }
.chip .x:hover { color: var(--ink); }

@media (max-width: 979px) {
  .side { display: none; }
  .doc { margin-left: 0; }
  .doc-in { padding: 20px 16px var(--gap-m); }
  .ruling { grid-template-columns: 32px minmax(0, 1fr); scroll-margin-top: 54px; }
  .decide { grid-template-columns: minmax(0, 1fr); }
  .vw, .opts { position: static; }
  .where:not([hidden]) { display: block; }
}
@media (max-width: 640px) {
  .vw { padding: 16px 14px; }
  .pic { margin-left: 0; }
}
`;
