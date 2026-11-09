export const pageCss = `
:root {
  --paper: #eceee9; --sheet: #fbfbf9; --ink: #1b2130; --muted: #5d6573; --rule: #d7dad1; --code: #f1f2ee;
  --add: #1a7f37; --del: #cf222e; --k-call: #1b2130; --k-money: #a15c07; --k-store: #0b7285; --k-check: #6b7280; --k-fail: #c92a2a;
  --tk-kw: #7048b6; --tk-str: #2f7d4f; --tk-com: #87907e; --tk-num: #a15c07; --tk-fn: #1c66c9; --tk-cls: #0b7285;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --display: "Iowan Old Style", "Century Schoolbook", C059, Georgia, serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --t: 22px; --b: 15px; --s: 12.5px;
  --r: 8px; --r-s: 4px;
  --measure: 70ch;
  --gap-s: 16px; --gap-m: 24px; --gap-l: 40px;
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

.doc { max-width: 1120px; margin: 0 auto; padding: 40px 24px var(--gap-l); }
.mast { max-width: var(--measure); }
.eyebrow { font-size: var(--s); color: var(--muted); }
.mast h1 { font: 600 28px/1.3 var(--display); margin-top: 4px; }
.mast .sub { color: var(--muted); margin-top: 6px; }
.lbl { font: 600 var(--s) var(--sans); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }

.map { margin-top: var(--gap-m); display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--gap-s) 28px; padding: 16px 18px; background: var(--sheet); border-radius: var(--r); }
.lane { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.chip { display: flex; gap: 8px; align-items: baseline; padding: 6px 10px; border: 1px solid var(--rule); border-radius: 6px; font-size: var(--s); color: var(--muted); text-decoration: none; }
.chip .id { flex: none; font-family: var(--mono); }
.chip.live { border: 1.5px solid var(--ink); color: var(--ink); background: var(--paper); }
.chip.live:hover { background: var(--sheet); }
.chip .got { display: block; color: var(--ink); font-weight: 500; }

.ruling { margin-top: 64px; scroll-margin-top: var(--gap-s); }
.rid { font: 500 var(--s) var(--mono); color: var(--muted); }
.ruling h3 { font: 600 var(--t)/1.35 var(--display); margin-top: 2px; max-width: var(--measure); text-wrap: balance; }
.ruling > p { max-width: var(--measure); }
.stake { margin-top: 8px; }
.changed, .must { margin-top: 10px; }
.changed .lbl, .must .lbl, .because .lbl { margin-right: 8px; }
.cut { margin-top: 4px; font-size: var(--s); color: var(--muted); }
.cut s { color: var(--ink); }
.because { margin-top: var(--gap-s); }
.because i { font-style: normal; border-bottom: 1px solid var(--muted); }

.strip { margin-top: 18px; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 10px; }
.panel { min-width: 0; padding: 12px 12px 10px; background: var(--sheet); border-radius: var(--r); }
.panel.today { background: transparent; border: 1px dashed var(--rule); }
.panel.hov { outline: 1.5px solid var(--ink); }
.ph { display: flex; gap: 8px; align-items: center; font-size: var(--s); font-weight: 600; }
.ph .disc, .vt .disc { width: 20px; height: 20px; font-size: 11px; border-width: 1.2px; }
.fig { margin-top: 8px; overflow-x: auto; }
.fig svg { max-width: 100%; height: auto; }
.pc { margin-top: 6px; font-size: var(--s); color: var(--muted); }
.vcap { margin-top: 18px; color: var(--muted); }
.vcap b { color: var(--ink); }

.stage { margin-top: 18px; padding: 14px 18px 18px; background: var(--sheet); border-radius: var(--r); }
.vtabs { display: flex; flex-wrap: wrap; gap: 6px; }
.vt { display: inline-flex; gap: 6px; align-items: center; padding: 4px 12px; border: 1px solid var(--rule); border-radius: 999px; font-size: var(--s); color: var(--muted); cursor: pointer; }
.vt:hover { border-color: var(--ink); color: var(--ink); }
.vt[aria-pressed="true"] { border-color: var(--ink); color: var(--ink); font-weight: 600; }
.vw .vcap { margin-top: 12px; }
.pic { margin-top: 12px; min-width: 0; }
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

.card { margin-top: 14px; padding: 6px 8px 8px; background: var(--sheet); border-radius: var(--r); }
.card .scroll { overflow-x: auto; }
.card table { width: 100%; min-width: calc(220px + var(--n) * 170px); border-collapse: separate; border-spacing: 0; table-layout: fixed; }
.card th, .card td { padding: 9px 12px; vertical-align: top; text-align: left; font-weight: inherit; }
.card thead td:first-child { width: 28%; }
.card thead th { vertical-align: bottom; padding-block: 12px; border-radius: var(--r) var(--r) 0 0; }
.card tbody th { font-weight: 500; border-top: 1px solid var(--rule); }
.card tbody td { border-top: 1px solid var(--rule); }
.card tr.grp th, .card tr.grp td { padding-top: 18px; padding-bottom: 6px; border-top: 0; }
.card tfoot td { padding: 10px 12px 12px; border-radius: 0 0 var(--r) var(--r); }
.card [data-k] { cursor: pointer; }
.card .hov { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.card .picked { background: color-mix(in srgb, var(--ink) 9%, transparent); }
.oh { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; align-items: center; }
.ot { font-weight: 600; }
.tags { display: block; }
.tag { display: inline-block; margin: 4px 6px 0 0; padding: 0 6px; border: 1px solid var(--ink); border-radius: var(--r-s); font-size: var(--s); font-weight: 500; white-space: nowrap; }
.tag.quiet { border-color: var(--rule); color: var(--muted); background: var(--paper); }
.disc { width: 28px; height: 28px; flex: none; display: inline-grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 50%; font: 500 var(--s) var(--mono); }
.picked .disc { background: var(--ink); color: var(--sheet); }
.cell { display: flex; gap: 8px; align-items: flex-start; }
.why { font-size: var(--s); color: var(--muted); padding-top: 2px; }
.mk { display: inline-grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; font-weight: 700; font-style: normal; }
.mk.gain { background: var(--ink); color: var(--sheet); }
.mk.cost { border: 1.5px solid var(--ink); color: var(--ink); }
.mk.mixed { color: var(--muted); font-size: 16px; }
.key { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 10px 12px 2px; font-size: var(--s); color: var(--muted); }
.key span { display: inline-flex; gap: 6px; align-items: center; }
.key .mk { width: 16px; height: 16px; font-size: 9px; }
.pick { position: relative; display: inline-flex; align-items: center; padding: 6px 14px; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--sheet); font-size: var(--s); font-weight: 600; cursor: pointer; }
.pick input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.pick:has(input:checked) { background: var(--ink); color: var(--sheet); }
.pick:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
.pick .on, .pick:has(input:checked) .off { display: none; }
.pick:has(input:checked) .on { display: inline; }
.none { margin-top: 4px; padding: 10px 12px 4px; border-top: 1px solid var(--rule); }
.none .pick { border-color: var(--muted); color: var(--muted); font-weight: 500; }
.none .pick:has(input:checked) { border-color: var(--ink); color: var(--sheet); }
.nlabel { display: block; margin-top: 12px; font-size: var(--s); color: var(--muted); }
.rnote { display: block; width: 100%; max-width: var(--measure); resize: vertical; padding: 5px 0; border: 0; border-bottom: 1px solid var(--rule); background: none; color: var(--ink); font: var(--s)/1.5 var(--sans); }
.rnote:focus { outline: none; border-bottom-color: var(--ink); }

.decided { margin-top: 64px; padding-top: var(--gap-s); border-top: 1px solid var(--rule); max-width: var(--measure); color: var(--muted); }
.decided ul { margin: 8px 0 0; padding-left: 18px; }

.composer { max-width: var(--measure); margin-top: var(--gap-l); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.rhint { flex: 1 1 100%; font-size: var(--s); color: var(--muted); }
.composer .nlabel { flex: none; margin: 0; }
.composer textarea { flex: 1 1 240px; min-width: 150px; min-height: 32px; resize: vertical; padding: 7px 10px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--sheet); color: var(--ink); font: var(--s) var(--sans); }
.composer textarea:focus { outline: none; border-color: var(--ink); }
.composer .go { flex: none; padding: 8px 14px; border-radius: var(--r-s); background: var(--ink); color: var(--sheet); font-weight: 600; font-size: var(--s); cursor: pointer; white-space: nowrap; }
.composer .go:disabled { opacity: 0.4; cursor: default; }
.chips { flex: 1 1 200px; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.chips .empty { color: var(--muted); font-size: var(--s); padding: 4px 0; }
.chips .chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 2px 2px 8px; border: 1px solid var(--rule); border-radius: var(--r-s); background: var(--paper); color: var(--ink); font: var(--s) var(--mono); }
.chips .chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--ink); }
.chip .x { width: 32px; height: 32px; display: inline-grid; place-items: center; color: var(--muted); cursor: pointer; }
.chip .x:hover { color: var(--ink); }

@media (max-width: 760px) {
  .doc { padding: 24px 16px var(--gap-m); }
  .strip { grid-template-columns: minmax(0, 1fr); }
}
`;
