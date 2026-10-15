// The page stylesheet. System fonts only: nothing fetches on open.
// Voice: a decision ledger — mono carries structure (ids, letters, labels),
// the serif carries ruling titles, the sans carries prose. The pick letter is
// the protagonist; everything else stays quiet.
export const pageCss = `
:root {
  --paper: #eceee9; --sheet: #fbfbf9; --ink: #1b2130; --muted: #5d6573; --rule: #d7dad1; --code: #f1f2ee;
  --opt-a: #3b5bdb; --opt-b: #9c36b5; --opt-c: #c2255c; --opt-d: #2b8a3e;
  --add: #1a7f37; --del: #cf222e; --k-call: #1b2130; --k-money: #a15c07; --k-store: #0b7285; --k-check: #6b7280; --k-fail: #c92a2a;
  --tk-kw: #7048b6; --tk-str: #2f7d4f; --tk-com: #87907e; --tk-num: #a15c07; --tk-fn: #1c66c9; --tk-cls: #0b7285;
  --serif: Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --o: var(--ink);
  --rail: 3px;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --paper: #14171c; --sheet: #1c2027; --ink: #e6e8ec; --muted: #9aa3b1; --rule: #2f3540; --code: #171b21;
    --opt-a: #8ea6ff; --opt-b: #d58beb; --opt-c: #f28bae; --opt-d: #7bd389;
    --add: #3fb950; --del: #f85149; --k-call: #e6e8ec; --k-money: #f2b35b; --k-store: #5cc8da; --k-check: #9aa3b1; --k-fail: #ff8a80;
    --tk-kw: #c3a6ff; --tk-str: #7bd389; --tk-com: #6f7787; --tk-num: #f2b35b; --tk-fn: #8ea6ff; --tk-cls: #5cc8da;
  }
}
.o-a { --o: var(--opt-a); } .o-b { --o: var(--opt-b); } .o-c { --o: var(--opt-c); } .o-d { --o: var(--opt-d); }

* { box-sizing: border-box; }
html { background: var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font: 14.5px/1.55 var(--sans); }
code { font: 0.86em var(--mono); background: var(--code); border: 1px solid var(--rule); padding: 0 4px; border-radius: 3px; overflow-wrap: anywhere; }
h1, h3 { margin: 0; font-family: var(--serif); font-weight: 600; line-height: 1.18; text-wrap: balance; }
h2 { margin: 0; font: 600 12px var(--mono); letter-spacing: 0.08em; color: var(--muted); }
p { margin: 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

/* Layout: fixed sidebar left, one content column. */
.side { position: fixed; top: 0; bottom: 0; left: 0; width: 228px; padding: 22px 14px 90px; border-right: 1px solid var(--rule); background: var(--paper); overflow-y: auto; overscroll-behavior: contain; }
.doc { margin-left: 228px; }
.col-in { max-width: 880px; margin: 0 auto; padding: 0 34px 110px; }
section[id^="r-"] { scroll-margin-top: 14px; }

.masthead { padding-block: 34px 10px; }
.eyebrow { font: 11.5px var(--mono); color: var(--muted); }
.masthead h1 { font-size: 31px; letter-spacing: -0.01em; margin-top: 6px; }
.masthead .sub { color: var(--muted); max-width: 64ch; margin-top: 8px; font-size: 14.5px; }

/* Sidebar navigation */
.side .sg { margin-bottom: 16px; }
.side .sg h2 { padding: 0 8px 5px; display: flex; justify-content: space-between; }
.side .sg h2 .n { letter-spacing: 0; }
.side a.rl { display: flex; gap: 8px; align-items: baseline; padding: 3.5px 8px; border-radius: 5px; text-decoration: none; color: var(--muted); font: 13px/1.35 var(--sans); }
.side a.rl .gid { font: 600 11px var(--mono); color: var(--muted); flex: none; }
.side a.rl .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side a.rl:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 5%, transparent); }
.side a.rl.here { color: var(--ink); background: var(--sheet); box-shadow: inset var(--rail) 0 0 var(--ink); }
.side a.rl.merged .t { font-style: italic; }

/* Notes: one row per entry, the bold lead-in as its mono marker */
.notes { display: grid; gap: 7px; padding-block: 14px 26px; max-width: 78ch; }
.note { font-size: 13.5px; color: var(--muted); padding-left: 3.2em; text-indent: -3.2em; }
.note b { font: 600 12px var(--mono); color: var(--ink); padding-right: 0.4em; }

/* Group bands */
.ghead { display: flex; gap: 14px; align-items: baseline; border-top: 1px solid var(--rule); margin-top: 44px; padding-top: 12px; }
.ghead:first-of-type { margin-top: 10px; }
.ghead h2 { font-size: 12.5px; color: var(--ink); }
.ghead .n { font: 400 11px var(--mono); color: var(--muted); }

.ruling { padding-block: 30px 6px; }
.rhead { display: flex; gap: 14px; align-items: baseline; }
.rid { font: 700 13px var(--mono); color: var(--muted); flex: none; }
.rhead h3 { font-size: 20.5px; }
.rhead .none-btn { margin-left: auto; font: 600 11.5px var(--mono); color: var(--muted); background: none; border: 1px dashed var(--rule); border-radius: 6px; padding: 3px 10px; cursor: pointer; }
.rhead .none-btn:hover { color: var(--ink); border-color: var(--ink); }
.rhead .none-btn.on { color: var(--sheet); background: var(--muted); border-style: solid; border-color: var(--muted); }
.stake { font: 600 16.5px/1.45 var(--serif); max-width: 62ch; margin-top: 10px; }
p.today { font: 14.5px/1.55 var(--sans); max-width: 68ch; color: var(--muted); margin-top: 8px; }
p.today b { color: var(--ink); }
.changed { border: 1px solid var(--rule); background: var(--sheet); padding: 10px 14px; max-width: 78ch; font-size: 13.5px; border-radius: 8px; margin-top: 10px; }
.meta-line { font: 12px var(--mono); color: var(--muted); margin-top: 3px; }

/* Views: today once, then one card per option, hue-railed */
.views { display: grid; gap: 16px; margin-top: 16px; }
.view { display: flex; flex-direction: column; gap: 9px; min-width: 0; padding-left: 12px; border-left: var(--rail) solid color-mix(in srgb, var(--o) 32%, var(--rule)); }
.view.today { border-left-color: var(--rule); }
.vhead { display: flex; gap: 11px; align-items: center; flex-wrap: wrap; }
.vtt { display: flex; flex-wrap: wrap; gap: 3px 12px; align-items: baseline; min-width: 0; }
.vhead .vt { font: 600 14.5px/1.35 var(--sans); }
.vmeta { font: 12px var(--mono); color: var(--muted); }
.lt { width: 27px; height: 27px; flex: none; border-radius: 50%; display: inline-grid; place-items: center; font: 700 14px var(--mono); color: var(--o); border: 1.5px solid var(--o); background: var(--sheet); }
.star { color: var(--ink); font: 600 12px var(--mono); white-space: nowrap; }
.how { font-size: 13.5px; color: var(--muted); max-width: 78ch; }
.gc { font-size: 13.5px; display: grid; grid-template-columns: 14px 1fr; gap: 0 6px; align-content: start; max-width: 78ch; }
.gc .sign { font: 700 13.5px/1.35 var(--sans); }
.gc.cost .sign { color: var(--muted); }

.stage { background: var(--sheet); border: 1px solid var(--rule); border-radius: 8px; min-width: 0; overflow: hidden; }
.stage .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; font: 11px var(--mono); color: var(--muted); padding: 10px 14px 0; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 20px; height: 0; border-top: 2.5px solid var(--k); }
.legend i.dash { border-top-style: dashed; }
.legend .sw { width: 16px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--o) 18%, transparent); border: 1px solid var(--o); }
.stage .scroll { overflow-x: auto; padding: 8px 6px 4px; }
.stage .cap { border-top: 1px solid var(--rule); padding: 10px 14px; font-size: 12.5px; color: var(--muted); }
.stage .cap b { color: var(--ink); font-weight: 600; }
.bodies { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 14px; padding: 14px; }
.body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.body .tag { font: 12px var(--mono); color: var(--muted); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.body .tag .lt { width: 20px; height: 20px; font-size: 11px; }
.body.of-option .tag .lt { background: var(--o); color: var(--sheet); }
.body.is-today { --o: var(--muted); }
.body .tag b { color: var(--ink); font-weight: 600; font-family: var(--sans); font-size: 12.5px; }
pre { margin: 0; background: var(--code); border: 1px solid var(--rule); border-radius: 6px; padding: 12px 14px; overflow-x: auto; color: var(--ink); font: 12.5px/1.55 var(--mono); white-space: pre; overflow-wrap: normal; }
.body .bcap { color: var(--muted); font-size: 12.5px; }
.body .tag .state-chip { border: 1px dashed var(--rule); border-radius: 4px; padding: 0 6px; }
.body .tag .dleg { opacity: 0.75; }
.dl { display: block; padding: 0 10px 0 22px; position: relative; }
.dl::before { position: absolute; left: 8px; font-weight: 600; }
.dl.add { background: color-mix(in srgb, var(--add) 18%, transparent); }
.dl.add::before { content: "+"; color: color-mix(in srgb, var(--add) 60%, var(--ink)); }
.dl.del { background: color-mix(in srgb, var(--del) 16%, transparent); }
.dl.del::before { content: "-"; color: color-mix(in srgb, var(--del) 60%, var(--ink)); }
.dl.ctx { opacity: 0.72; }
.dl.ell { color: var(--muted); font-style: italic; opacity: 0.8; }
pre.diff { padding: 8px 0; }
pre.diff .dl { margin: 0; }
.token.keyword, .token.boolean, .token.constant, .token.important, .token.tag { color: var(--tk-kw); }
.token.string, .token.char, .token.attr-value, .token.regex { color: var(--tk-str); }
.token.comment, .token.prolog, .token.doctype, .token.cdata { color: var(--tk-com); font-style: italic; }
.token.number, .token.symbol, .token.attr-name { color: var(--tk-num); }
.token.function, .token.method { color: var(--tk-fn); }
.token.class-name, .token.maybe-class-name { color: var(--tk-cls); }
.body.of-option pre { border-color: color-mix(in srgb, var(--o) 40%, var(--rule)); }

svg.seq { display: block; max-width: 100%; height: auto; font-family: var(--sans); color: var(--ink); }
svg text { fill: currentColor; font-size: 12.5px; }
.life { stroke: var(--rule); stroke-width: 1.2; }
.actor rect { fill: color-mix(in srgb, var(--ink) 8%, var(--sheet)); stroke: var(--ink); stroke-width: 1.2; }
.actor text { font-weight: 600; font-size: 13px; }
.num { font: 600 11px var(--sans); fill: var(--muted); }
.e line { stroke-width: 1.8; fill: none; }
text.sub { font-size: 11.5px; fill: var(--muted); }
.k-call { color: var(--k-call); } .k-call line { stroke: var(--k-call); }
.k-money { color: var(--k-money); } .k-money line { stroke: var(--k-money); }
.k-store { color: var(--k-store); } .k-store line { stroke: var(--k-store); stroke-width: 2.6; }
.k-check { color: var(--k-check); } .k-check line { stroke: var(--k-check); stroke-dasharray: 5 4; }
.k-fail { color: var(--k-fail); } .k-fail line { stroke: var(--k-fail); }
.head { fill: currentColor; }
.self rect { fill: var(--sheet); stroke: currentColor; stroke-width: 1.5; }
.ledger-bg { fill: var(--paper); }
.balh { font: 600 11px var(--sans); fill: var(--muted); }
.bal { font: 12px var(--mono); fill: var(--muted); }
.bal.chg { font-weight: 600; fill: var(--ink); }
.band { fill: color-mix(in srgb, var(--o) 13%, transparent); }
.tg rect { fill: var(--sheet); stroke: var(--o); stroke-width: 1.3; }
.tg text { font: 600 10.5px var(--sans); fill: var(--o); }
.tg-gone rect { stroke: var(--muted); } .tg-gone text { fill: var(--muted); }
.gone { opacity: 0.42; }
.strike { stroke: var(--o); stroke-width: 1.6; }
svg text.note { font-size: 11.5px; font-weight: 600; fill: var(--o); }

.stage.diagram .mermaid { display: flex; justify-content: center; padding: 14px; overflow-x: auto; }
.stage.diagram .mermaid svg { max-width: 100%; height: auto; }

.compare { overflow-x: auto; padding-bottom: 2px; margin-top: 14px; }
.matrix { display: grid; gap: 0 12px; grid-template-rows: repeat(var(--rows), auto); }
.col { display: grid; grid-row: span var(--rows); grid-template-rows: subgrid; row-gap: 8px; padding-bottom: 12px; border-radius: 8px; border: 1px solid var(--rule); background: var(--sheet); }
.col > * { padding-inline: 14px; }
.colhead { display: flex; gap: 10px; align-items: flex-start; padding-top: 12px; font: 600 13.5px/1.3 var(--sans); }
.colhead .lt { width: 27px; height: 27px; font-size: 13.5px; }
.colhead .meta { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; font: 400 11.5px var(--mono); color: var(--muted); }
`;
