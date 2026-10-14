// The page stylesheet. System fonts only: nothing fetches on open.
export const pageCss = `
:root {
  --paper: #eef0ec; --sheet: #fbfbf9; --ink: #1b2130; --muted: #5d6573; --rule: #d5d9d0; --code: #f1f2ee;
  --opt-a: #3b5bdb; --opt-b: #9c36b5; --opt-c: #c2255c; --opt-d: #2b8a3e;
  --add: #1a7f37; --del: #cf222e; --k-call: #1b2130; --k-money: #a15c07; --k-store: #0b7285; --k-check: #6b7280; --k-fail: #c92a2a;
  --tk-kw: #7048b6; --tk-str: #2f7d4f; --tk-com: #87907e; --tk-num: #a15c07; --tk-fn: #1c66c9; --tk-cls: #0b7285;
  --serif: Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --o: var(--ink);
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --paper: #15181d; --sheet: #1c2027; --ink: #e6e8ec; --muted: #9aa3b1; --rule: #2f3540; --code: #171b21;
    --opt-a: #8ea6ff; --opt-b: #d58beb; --opt-c: #f28bae; --opt-d: #7bd389;
    --add: #3fb950; --del: #f85149; --k-call: #e6e8ec; --k-money: #f2b35b; --k-store: #5cc8da; --k-check: #9aa3b1; --k-fail: #ff8a80;
    --tk-kw: #c3a6ff; --tk-str: #7bd389; --tk-com: #6f7787; --tk-num: #f2b35b; --tk-fn: #8ea6ff; --tk-cls: #5cc8da;
  }
}
.o-a { --o: var(--opt-a); } .o-b { --o: var(--opt-b); } .o-c { --o: var(--opt-c); } .o-d { --o: var(--opt-d); }

* { box-sizing: border-box; }
html { background: var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.55 var(--sans); }
code { font: 0.86em var(--mono); background: var(--code); border: 1px solid var(--rule); padding: 0 4px; border-radius: 3px; overflow-wrap: anywhere; }
h1, h2, h3 { margin: 0; font-family: var(--serif); font-weight: 600; line-height: 1.15; text-wrap: balance; }
p { margin: 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

.shell { max-width: 1060px; margin: 0 auto; padding-inline: 24px; }
.masthead { padding-block: 28px 18px; display: flex; flex-wrap: wrap; gap: 6px 28px; align-items: flex-end; justify-content: space-between; }
.eyebrow { font: 11.5px var(--mono); color: var(--muted); }
.masthead h1 { font-size: 34px; letter-spacing: -0.01em; }
.masthead .sub { color: var(--muted); max-width: 64ch; margin-top: 4px; }

main { padding-bottom: 72px; }
.ghead { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: baseline; justify-content: space-between; padding-top: 34px; }
.ghead h2 { font-size: 26px; letter-spacing: -0.01em; }

.ruling { display: flex; flex-direction: column; gap: 12px; padding-top: 20px; border-top: 1px solid var(--rule); scroll-margin-top: 18px; }
.ghead + .ruling, .ruling:first-child { border-top: 0; padding-top: 4px; }
.rhead { display: flex; gap: 14px; align-items: baseline; }
.rid { font: 700 14px var(--sans); color: var(--muted); flex: none; }
.rhead h3 { font-size: 21px; }
.stake { font: 600 17.5px/1.45 var(--serif); max-width: 62ch; }
.today { font: 15px/1.55 var(--sans); max-width: 66ch; color: var(--muted); }
.today b { color: var(--ink); }
.changed { border: 1px solid var(--rule); background: var(--sheet); padding: 10px 14px; max-width: 78ch; font-size: 14.5px; border-radius: 8px; }
.note { border: 1px solid var(--rule); border-radius: 8px; padding: 10px 14px; max-width: 78ch; font-size: 13px; color: var(--muted); }
.note b { color: var(--ink); font-weight: 600; }

.views { display: grid; gap: 20px; }
.view { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.vhead { display: flex; gap: 12px; align-items: baseline; }
.vhead .vt { font: 600 15px/1.35 var(--sans); }
.vtt { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; min-width: 0; }
.vmeta { font: 12.5px var(--sans); color: var(--muted); }
.lt { width: 24px; height: 24px; flex: none; border-radius: 50%; display: inline-grid; place-items: center; font: 700 13px var(--sans); color: var(--o); border: 1.5px solid var(--o); background: var(--sheet); }
.star { color: var(--ink); font-size: 12.5px; font-weight: 600; white-space: nowrap; }
.how { font-size: 14px; color: var(--muted); max-width: 78ch; }
.gc { font-size: 14px; display: grid; grid-template-columns: 14px 1fr; gap: 0 6px; align-content: start; max-width: 78ch; }
.gc .sign { font: 700 14px/1.35 var(--sans); }
.gc.cost .sign { color: var(--muted); }

.stage { background: var(--sheet); border: 1.5px solid color-mix(in srgb, var(--o) 55%, var(--rule)); border-radius: 8px; min-width: 0; overflow: hidden; }
.stage .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; font: 11px var(--mono); color: var(--muted); padding: 10px 14px 0; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 20px; height: 0; border-top: 2.5px solid var(--k); }
.legend i.dash { border-top-style: dashed; }
.legend .sw { width: 16px; height: 10px; border-radius: 2px; background: color-mix(in srgb, var(--o) 18%, transparent); border: 1px solid var(--o); }
.stage .scroll { overflow-x: auto; padding: 8px 6px 4px; }
.stage .cap { border-top: 1px solid var(--rule); padding: 10px 14px; font-size: 13px; color: var(--muted); }
.stage .cap b { color: var(--ink); font-weight: 600; }
.bodies { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 14px; padding: 14px; }
.body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.body .tag { font-size: 13px; color: var(--muted); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.body .tag .lt { width: 20px; height: 20px; font-size: 11.5px; }
.body.of-option .tag .lt { background: var(--o); color: var(--sheet); }
.body.is-today { --o: var(--muted); }
.body .tag b { color: var(--ink); font-weight: 600; }
pre { margin: 0; background: var(--code); border: 1px solid var(--rule); border-radius: 6px; padding: 12px 14px; overflow-x: auto; color: var(--ink); font: 12.5px/1.55 var(--mono); white-space: pre; overflow-wrap: normal; }
.body .bcap { color: var(--muted); font-size: 13px; }
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
.body.of-option pre { border-color: color-mix(in srgb, var(--o) 50%, var(--rule)); }

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

.compare { overflow-x: auto; padding-bottom: 2px; }
.matrix { display: grid; gap: 0 12px; grid-template-rows: repeat(var(--rows), auto); }
.col { display: grid; grid-row: span var(--rows); grid-template-rows: subgrid; row-gap: 8px; padding-bottom: 12px; border-radius: 8px; border: 1.5px solid var(--rule); background: var(--sheet); }
.col > * { padding-inline: 14px; }
.colhead { display: flex; gap: 10px; align-items: flex-start; padding-top: 12px; font: 600 14px/1.3 var(--sans); }
.colhead .lt { width: 28px; height: 28px; font-size: 14px; }
.colhead .meta { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; font-weight: 400; font-size: 12.5px; color: var(--muted); }
`;
