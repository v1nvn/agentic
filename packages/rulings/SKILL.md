---
name: consult
description: Put the decisions the owner must rule on, each with its evidence, on one local HTML page — question, stake, how the part works today, lettered options with gain, cost and a recommendation, and a picture of the mechanism when one earns it. Use when the owner has to rule on evidence they do not hold — a plan with open forks, a review whose findings leave forks only the owner can rule on, a design whose options differ in cost or surface — or asks for it ("rulings", "consult me", /rulings:consult). Not for a plain question, an audit with no choices, or a decision the owner can rule from one line: those go in chat, through AskUserQuestion.
---

# Rulings

A **ruling** is one decision only the owner can make. The page has no home or overview panel:
each ruling carries its own question, stake and how its part works today. Nothing is written to
the repo until the owner has ruled.

Every option is argued as hard as the recommended one: a gain and a cost of the same weight,
each checkable. An option not worth that goes in the notes.

The page renders on its own — every verdict table, fold and picture view needs no server — and a
composer bar turns the owner's picks into an answer to paste in chat. The page assists; chat remains
the channel the answer comes back on.

## Step 0 — Decide whether this is a page

Build a page when the owner must rule on evidence they do not hold: how a part they have not
read works today, and what each option changes on a real case. One such decision earns a page
as much as five do. A decision the owner can rule from one line — they know the part, and the
options differ on one visible fact — goes through AskUserQuestion (Step 6). "wdyt?" asks for
your view: answer it in chat. If the answer ends in forks the owner can rule on only after
reading code, build the page.

Orient the owner **in chat** — how the system works today, in plain words, with one real case
stepped through its states and real values, and the root question if the decisions are linked
(linked rulings are settled in chat, root first, as an "if X then Y" table; the page holds only
decisions that stand alone) — unless the owner already knows the system this session. Then build
in the same turn when the owner asked for the page; wait for "go?" only when the page is your
idea or the picks change each other's options.

## Step 1 — Decide what is a ruling

Keep a decision as a ruling only if it changes something the owner or a caller will see or pay
for (a surface, a name, scope, money, build order, a file's home), or two answers are both
defensible and differ in cost or meaning. Decide the rest yourself and say so in one line, and
in a "Not rulings" note. A finding you checked and found false goes in that note with its
evidence. Ids `G1`, `G2`, … in the order found. More than ten: decide the smallest yourself —
past ten the owner stops reading, and the build refuses the page.

**Gate:** for each ruling you can say what the owner would lose if you decided it alone.

## Step 2 — Read the code, pick the cases and write each `today`

1. For every ruling find what exists today and copy it (a body, a row, an error string, a
   test's values) with its `file:line`. Re-read each anchor before you cite it.
2. Pick a real case for each ruling (a simple one and a complex one across the page). Use real
   values; say what is built and what is planned.
3. For each ruling write its **today**: how the part this ruling touches works, for someone
   who has never seen the system. Two sentences show and the rest folds behind `the rest`;
   make the shown two stand alone. Adapt it to the ruling: only the parties, steps
   and terms this ruling needs. Never paste one shared description into every ruling.

Never invent a value that exists in the repo. A value nobody measured is a placeholder in
angle brackets — `&lt;pools&gt;` in the HTML fields, `<pools>` where the text stays plain.
A computed number shows its arithmetic. One quantity, one number, on the whole page. A claim
about today that no anchor backs is checked against the code before it goes on the page.

**Gate:** every ruling has its own `today` and one real case to tell it on.

## Step 3 — Choose what each ruling shows

Every ruling is title, stake, `today` and the verdict table. Add a picture only when a gain or
cost cannot be checked from its fragment alone, and take the first kind that can draw it:

| When the ruling turns on… | Use | Field |
|---|---|---|
| a code change | today's body and one body per option, shown as a diff | `bodies` |
| an order of steps, or a balance that moves | a sequence diagram, a view per option | `seq` |
| money or a count that moves | a ledger beside the diagram | `seq.ledger` |
| anything else: an output or screen, states and transitions, a timeline, a number compared across options, a structure, a trade-off grid | a figure: static HTML or SVG, a view per option | `figure` |

A chain whose options add, drop or change steps is a `seq`, not a `figure`: each option
view draws only its delta rows on the shared lanes and ledger. A step only some options run
(`in: ["a"]`) keeps its chain number everywhere: today draws it as a quiet dashed row tagged
`only in a`, and the option's view draws it for real.

Before drawing a figure, load the `artifact-diagramming` skill — and `dataviz` for a chart,
`artifact-design` for a screen or layout — and draw by its rules; when one is not installed,
draw without it. Paint only with the page's tokens, because the page follows the owner's light
or dark theme and a literal colour breaks one of them: `var(--ink)`, `--muted`, `--rule`,
`--paper`, `--sheet`, `--code`, `--add`, `--del`, and `var(--o)`, the colour of the view's own
option.

When every fragment names a thing the owner can check without a body (a file, a flag, a number),
the ruling is table-only: title, stake, `today`, options — no picture field.

`needs: "G7a"` on an option says it only makes sense under that pick; the page shows it as a
chip, and the composer names the pick unmet until that need lands. Rulings whose picks change
each other's options are not a page: settle them in chat (Step 0).

## Step 4 — Write each ruling

- **Title**: the decision as a question ("Who owns a leaf block inside its reader's window?"). It
  is the only name: the answer table shows it.
- **Stake**: one bold sentence. Who loses what, how often, who would notice, on a real value.
- **Today**: how this part works now, in plain words, up to the point where it breaks. Two
  sentences show before the fold; no case values: the fragments carry those.
  Each new term gets one plain line here.
- Say each fact once, in the block that owns it: the stake owns the loss, `today` owns the
  mechanism, the picture owns the numbers, the options own code and test consequences. Keep it
  short without losing what the owner needs to decide; there is no length cap.
- **Picture**, when Step 3 gave the ruling one: a view for **every** option, a one-line caption
  that opens with its conclusion — never with the option's name; the row already names it — and
  `today: true` on the option that leaves things as they are.
- **Options**: two to four, lettered. The verdict table is each option's one home: its letter
  disc, title, `★ recommended` / `as today` / `needs` chips, its **gain** and **cost** as aligned
  fragments, each checkable on the ruling's evidence. Nothing an option says renders twice.
  Exactly one option is recommended.

Rules for options: they differ on **one axis**. Before an option adds a mechanism, name the
existing thing that does the job; if it exists the option is "use that". A letter never
changes meaning once shown, and a dropped option is deleted with its letter never reused.
Reopening a ruling the owner made: say so in the stake.

Write plain English: one statement a sentence, active voice, no idioms. One meaning per word and
one word per meaning across the whole page: call a thing by the same name in every ruling.
Technical names stay. Keep the owner's or the official vocabulary; never coin one.

**Gate:** read each option as "pick this and you get ⟨gain⟩, you pay ⟨cost⟩". If either half
is vague or names nothing the owner can check, rewrite it.

## Step 5 — Build

```sh
D=~/.claude/rulings/<topic>
npx -y @v1nvn/rulings@0.53.1 "$D" --new --no-open    # first time: seeds page.js from the example
```

Write `$D/page.js` whole from the fields table below — keep the example's shape, replace all
content — then build once; a second build only on red:

```sh
npx -y @v1nvn/rulings@0.53.1 "$D"
```

Errors block and nothing is written. The rebuild opens the page for the owner. When the owner
already has it open, add `--no-open` and say "reload". Pages live
in `~/.claude/rulings/<topic>`, never `/tmp`, and are never published.

**Gate:** the build exits green and the page is open in front of the owner.

## Step 6 — Say so, then read the answer

First message, short; do not repeat the page:

```
The rulings are on one page: <path>/index.html. Nothing is written yet.
Pick on the page and Copy, or type picks here.
<group>: <G1 name>, <G2 name>.
I recommend <G1a, G2c>. Most important fact from the code: <fact, file:line>.
Not rulings: <X, because Y>.
```

The owner answers on the page or in chat; both read verbatim. On the page: clicking an option's
row — its body or its letter disc — picks it, and shows the ruling's picture when it has one;
clicking the same row again unpicks, the picture stays. The shown picture picks its option too,
and a reload reopens the picked option's picture. The verdict table's last row, none of these
fit, picks `n` the same way (click again to unpick) for a ruling whose options all miss, and a
quick group's accept-recommended button picks its starred letters.
Each ruling carries one note input under its options — its text rides the answer inline after
that ruling's pick, whatever letter is picked — and the
composer bar's page note rides after a blank line. The composer annotates a pick whose `needs`
target is unpicked as `(needs …)`, and Copy puts the whole answer on the clipboard to paste in
chat: `G2a — its note, G3b (needs G3a) — its note`, blank line, page note. Picks and both note
kinds persist per page under its `key`, so a reload keeps them. In chat the owner types picks like
`G1a, G2c` and notes like `G6 note: …`; `G2n` means none
of these fit, and its note says what is wanted. A note overrides the pick for that ruling. A
ruling missing from the answer is still open. Never treat your recommendation as the owner's
answer. A root pick that moves a recommendation is announced before the next question.

**A decision the owner can rule from one line, in chat** — AskUserQuestion, not a page: one
question per decision, two to four options, each option's description carrying its gain and
cost, the recommended one named in the question; the owner's own answer takes the place of `n`.

## Step 7 — Pushback

A pushback is anything other than a pick. In order: restate it in one line; name its kind;
sweep every ruling against it and say which change and which do not; update `page.js`, rebuild
with `--no-open`, ask the owner to reload.

1. **About one ruling**: change that ruling only; mark it `changed`.
2. **A principle**: sweep all rulings; report rewritten, new option, moved recommendation, untouched.
3. **Two rulings are one**: keep one; the other gets `merged`, placed last in its group.
4. **The mechanism exists**: delete the options that build a new one; add "use that".
5. **The owner cannot judge the options**: the framing is wrong. Walk the case through in chat from the user's side, then redo the page.

A new option takes the next letter; a moved recommendation is said in `changed`, never silent.
If the owner is right, say so and take the simpler design. When one decision is left, ask it
in chat.

## Step 8 — After the rulings

Write what was ruled, each where it lands, as `(owner, G2c)`. Anything unruled goes on the
plan's open list. A rule the owner stated on the way goes into a CLAUDE.md the same session.
Then: `Written: <G1a, G2c>. Nothing is committed. <file>: <what changed>. One thing differs from the page: <what, why>. / Nothing differs.`

## page.js fields

`page.js` sets `var PAGE = { … };`.

| Field | Req. | What to write |
|---|---|---|
| `eyebrow`, `title`, `sub` | title, sub | Repo and thread; two or three words; one sentence ending "Nothing is written until you rule." |
| `key` | no | a stable slug for the topic; the composer's picks and notes persist in the browser under it. |
| `notes` | no | `[{ html }]`: a bold lead, then "Not rulings" and what you decided — the lead stays in view, the rest folds. |
| `groups` | yes | `[{ id, label, quick, rulings: ["G1"] }]`: the label heads the group; `quick: true` gives the group's rulings an accept-recommended button. |
| `rulings` | yes | One entry per id. |

A ruling: `title` (a question), `stake`, `today`, at most one of `seq`, `bodies` or `figure` —
only when the ruling earned a picture (Step 3) — `opts` (2 to 4), and after a pushback `changed`
or `merged` (needs only `title`, `merged`, `changed`).

An option: `k` (one lowercase letter, not `n`), `t`, `rec` (on exactly one), `today` (on at most
one), `w` (how it works — one muted line at the end of the option's verdict row), `g` and `c`
(gain and cost — one fragment each, checkable on the ruling's evidence), `needs`. A pictured
ruling gives every live option a view: a `seq` view, a `bodies` entry under its letter, or a
figure view.

### The sequence diagram

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
option view.

### Bodies

`bodies: { today: { state, code, cap, what, lang }, b: {…} }`. `state` is "built today",
"plan as written" or "sketch" (feasibility not checked). `lang`: `ts`, `js`, `json`, `bash`,
`markup`, `css`. Write an option's after-code **in full**; the builder diffs it against today
(added lines green, removed red, long unchanged runs collapsed). `diff: false` shows the option's
body whole and unmarked — use it when the body is not the same code as today's. A today body past
20 lines folds behind a `show all N lines` expander; option bodies render whole. `cap` names a
cut body's source; `what` labels the body above it.

### Figure

`figure: { cap, views: { today|letter: { html, cap } } }` — one view per live option plus
`today`. `html` is static markup inserted as written: inline SVG with a `viewBox`, or HTML
styled inline, laid out for the page column (about 800px; an SVG scales down). The build
refuses a script or event handler, a `<style>` block, anything loaded from outside the page (a
`data:` URI is fine), a literal colour, and an unclosed tag. The ruling's `cap` opens the
block; each view may carry its own.

Strings in `page.js`: single quotes for bodies and figure markup, `\n` for a line break, `\'` or `’` for an
apostrophe. Titles, stakes, gains, costs and captions are HTML (`<code>`, `&lt;`); bodies are
plain text.

## Never

- Never write to the repo before the owner rules.
- Never publish the page. Never put the rulings in chat when a page exists.
- Never mark two options recommended, or none. Never change what a letter means after it is
  shown, and never reuse a dropped option's letter.
- Never argue in a paragraph what a picture shows, and never add a picture a ruling did not earn.
