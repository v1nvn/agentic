# Pictures

Read this only for a ruling that earns a picture: a gain or cost the owner cannot check from
its row's reason alone. A ruling carries at most one of `seq`, `bodies` or `figure`. Take the
first kind that can draw it:

| When the ruling turns on…                                                                                              | Use                                                   | Field        | On the page                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------ | ---------------------------------------------------- |
| a code change                                                                                                          | today's body and one body per option, shown as a diff | `bodies`     | one view at a time; a switch and column hover pick   |
| an order of steps, or a balance that moves                                                                             | a sequence diagram, a view per option                 | `seq`        | one view at a time; a switch and column hover pick   |
| money or a count that moves                                                                                            | a ledger beside the diagram                           | `seq.ledger` | inside the seq                                       |
| the real case drawn per option, a number compared across options, an output or screen, states, a timeline, a structure | a figure: static HTML or SVG, a panel per option      | `figure`     | all panels side by side, today first, above the card |

A picture needs a view for **every** live option, and `today: true` on the option that leaves
things as they are makes today's view that option's. Each view's caption opens with its
conclusion in `<b>…</b>` — never with the option's name; the panel or switch already names it.

## Figure

`figure: { cap, views: { today|letter: { html, cap } } }`. `html` is static markup inserted as
written: inline SVG with a `viewBox`, or HTML styled inline, sized for a panel (a quarter to a
half of an 1100px column; an SVG scales down). The panel is the frame: draw no border, card or
background of your own. Paint only with the page's tokens — `var(--ink)`, `--muted`,
`--rule`, `--paper`, `--sheet`, `--code`, `--add`, `--del`, `--o` — because the page is
light-only and a literal colour steps outside it. The build refuses a script or event handler,
a `<style>` block, anything loaded from outside the page (a `data:` URI is fine), a literal
colour, and an unclosed tag.

The best figure is the stake's real case drawn once per option: the same 13 payments landing on
today's engine, then on each option's. A number the options move (a price, a wait) is a figure
of one large number per panel.

Before drawing, load the `artifact-diagramming` skill — and `dataviz` for a chart,
`artifact-design` for a screen — and draw by its drawing rules only: the page's tokens and its light-only look override
any palette or theme rule there. When one is not installed, draw without it.

## Sequence diagram

```js
seq: {
  lanes: ["Walk", "Accounting", "Postgres"],            // "\n" breaks a lane name
  ledger: ["Delivered\non record", "Refund at\nreconcile"],   // optional value columns
  start: ["0", "0"],
  steps: [
    { f: 0, t: 1, k: "call", x: "quote Q2: rows landed [40, 50)" },
    { f: 1, t: 2, k: "store", x: "record delivery", b: ["[40, 50)", null] },
    { f: 1, t: 2, k: "store", x: "SAVEPOINT", "in": ["a"] },                 // only in option a
    { f: 1, t: 0, k: "call", x: "returns Ok", o: { a: { x: "ROLLBACK TO SAVEPOINT", n: "the transaction stays usable" } } },
    { f: 0, t: 2, k: "fail", x: "refused", o: { b: { a: "del" } } }           // struck in option b
  ],
  cap: "<b>Today the commit silently rolls back.</b> Reconcile refunds 10 blocks.",
  caps: { a: "<b>The collision skips one span.</b> Nothing is refunded." }
}
```

`f`, `t`: lane indexes (`f === t` is a note). `k`: `call`, `money`, `store`, `check` (dashed),
`fail`. `s`: a smaller second line. `b`: ledger values after the step (`null` keeps the last).
`o.<letter>`: what that option changes: `x`, `s`, `b`, `n` (a note), or `a: "del"`. `in`: the
step exists only in those options. `caps.<letter>`: that option's caption; write one for every
option view. `cap` is required. Two rulings never draw the same steps: each picture shows
only what its ruling turns on. `o`, `in` and `caps` never name the option marked `today`: its view is the base
chain and `cap`.

A chain whose options add, drop or change steps is a `seq`, not a `figure`: each option view
draws the whole chain, its own steps banded and today's text kept under a step it rewrites. A
step only some options run keeps its chain number everywhere; other views draw it as a quiet
row tagged `only in a`.

## Bodies

`bodies: { today: { state, code, cap, what, lang }, b: {…} }`. `state` is "built today",
"plan as written" or "sketch" (feasibility not checked). `lang`: `ts`, `js`, `json`, `bash`,
`markup`, `css`. Write an option's after-code **in full**; the builder diffs it against today
(added lines green, removed red, every unchanged line shown), so cut every body to the lines
the ruling turns on. `diff: false` shows the option's body whole and unmarked — use it when the
body is not the same code as today's. `what` labels the body; `cap` says what the body shows,
in plain words. An option body identical to today's is refused: an option that changes
nothing is not an option.

Strings: single quotes for bodies and figure markup, `\n` for a line break, `’` for an
apostrophe. Bodies are plain text; captions are HTML.
