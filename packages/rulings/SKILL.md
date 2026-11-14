---
name: consult
description: Put the decisions the owner must rule on onto one local HTML page, each with its evidence, what every option gains and costs, and a recommendation; decisions that depend on another wait for the next round. Use when the owner has to rule on evidence they do not hold — a plan with open forks, a review whose findings leave forks only the owner can rule on, a design whose options differ in cost or surface — or asks for it ("rulings", "consult me", /rulings:consult). Not for a plain question, an audit with no choices, or a decision the owner can rule from one line: those go in chat, through AskUserQuestion.
---

# Rulings

A **ruling** is one decision only the owner can make. The owner judges a ruling by what each
option gains and costs, so the page leads with that: a scorecard whose rows are outcomes and
whose columns are the options. Everything else on the page serves the scorecard. Nothing is
written to the repo until the owner has ruled.

The page renders on its own and needs no server; a composer turns the owner's picks into an
answer to paste in chat, which remains the channel the answer comes back on.

## Step 0 — Decide whether this is a page

Build a page when the owner must rule on evidence they do not hold: how a part they have not
read behaves, and what each option changes on a real case. One such decision earns a page as
much as five do. A decision the owner can rule from one line — they know the part, and the
options differ on one visible fact — goes through AskUserQuestion (Step 6). "wdyt?" asks for
your view: answer it in chat.

Unless the owner already knows the system this session, orient them **in chat** first: how
the part works today, in plain words, with one real case stepped through its states. Then
build in the same turn when the owner asked for the page; wait for "go?" when the page is your
idea.

## Step 1 — Decide what is a ruling, and its round

Keep a decision as a ruling only if it changes something the owner or a caller will see or pay
for (a surface, a name, scope, money, build order, a file's home), or two answers are both
defensible and differ in cost or meaning. Decide the rest yourself and list each in `decided`
with its reason in one line; a finding you checked and found false goes there too. Ids `G1`,
`G2`, … in the order found, never reused.

Then sort the rulings into rounds, because a ruling whose question or options change with
another's pick cannot be argued until that pick lands:

- **Rule now**: rulings that stand whatever else is picked. These are written in full.
- **Waiting**: a ruling that rests on another's pick is `{ title, after: "G1" }` and nothing
  else. The page lists it in the round map; you write it in full once G1 is ruled.
- **The frame**: when the rulings all rest on a design the owner has not ruled — "the jobs
  table becomes the queue" — that design is ruling `G0`, ruled first. Never present it as
  settled background.

More than ten rulings to rule now: decide the smallest yourself, because past ten the owner
stops reading, and the build refuses the page.

**Gate:** for each ruling you can say what the owner would lose if you decided it alone, and
no ruling in Rule now changes meaning under another ruling's pick.

## Step 2 — Read the code and pick the case

For every ruling, find what exists today and the real case it turns on: a request, a payment,
a row, an error, with its real values. Re-read each anchor before you rely on it. The anchors
and identifiers are **your** evidence; the page speaks what the owner sees, because the owner
cannot open a `file:line` from the page and an identifier names code, not behaviour. The build
refuses `<code>` and `file:line` anchors on every line the owner reads; only a picture's
code body and figure markup are exempt.

Never invent a value that exists in the repo. A value nobody measured is a placeholder in angle
brackets — `&lt;slots&gt;`. A computed number shows its arithmetic. One quantity, one number,
on the whole page.

**Gate:** every ruling has one real case with real values, and every claim on it was checked
against the code.

## Step 3 — Write each ruling

- **Title**: the decision as a question ("What holds the line of waiting work?").
- **Stake**: one sentence — who loses what, on the real case ("On 2026-11-06 one wallet sent
  13 presses at 13:11 IST; each started its own walk at once, and the box fell over.").
- **Must** (optional): a limit the owner already stated, quoted. An option that breaks a must
  is not argued; it goes in `cut` with the must it breaks, so the owner sees it was considered.
- **Options**: two to four, lettered, each a short title naming what it does. Exactly one
  `rec`; `today: true` on the option that leaves things as they are. Options differ on one
  axis. Before an option adds a mechanism, name the existing thing that does the job; if it
  exists, the option is "use that".
- **Rows**: the scorecard. Each row is an outcome the owner can check ("What a crash mid-walk
  loses", never "resilient"), and every live option gets a mark on it — `gain`, `mixed` or
  `cost` — with a one-line reason in plain words.
  - Sort each row with one test: delete the stake sentence; if the row stops mattering, it is
    `on: "stake"`, otherwise `on: "beyond"`. Every ruling has at least one stake row.
  - Within each group, write the heaviest row first; the page keeps your order.
  - A row that marks every option the same separates nothing: delete it.
  - Two rows that are one trade seen from two sides are one row.
  - Every option carries at least one `cost`. An option with none is either beaten by another
    option (cut it and say so in `decided`) or its cost is missing.
- **Why**: one sentence for the recommendation, in the rows' own labels: "a, because _work
  capped per chain_ and _one record of what is left_; it pays in _who owns the queue code_."
  Mark each label with `<i>`. This is where weight lives: a mark is one glyph, the why says
  which rows decided.

Write plain English: one statement a sentence, active voice, no idioms. One word per meaning
across the whole page. Keep the owner's or the official vocabulary; never coin one.

**Gate:** read each column as "pick this and you get ⟨its gains⟩, you pay ⟨its costs⟩". If a
half is vague, missing or argues for the recommendation only, rewrite the rows.

## Step 4 — Add a picture only when it earns one

A picture joins when a gain or cost cannot be checked from its reason alone — most often the
stake's real case drawn once per option. Before writing one, read
`references/pictures.md` (in this skill's directory) for the three kinds and their fields.

## Step 5 — Build

`<dir>` is `~/.claude/rulings/<topic>`; write the same path in every command, because shell
state does not carry between calls. The first time, seed `page.js` from the example:

```sh
npx -y @v1nvn/rulings@0.57.0 <dir> --new --no-open
```

When `<dir>/page.js` already exists, edit it instead; `--new` refuses to overwrite it. Write
`<dir>/page.js` whole from the fields table below — keep the example's shape, replace all
content — then build once; a second build only on red:

```sh
npx -y @v1nvn/rulings@0.57.0 <dir>
```

Errors block and nothing is written; each error says what to change. The build opens the page
for the owner; when the owner already has it open, add `--no-open` and say "reload". Pages
live in `~/.claude/rulings/<topic>`, never `/tmp`, and are never published.

**Gate:** the build exits green and the page is open in front of the owner.

## Step 6 — Say so, then read the answer

First message, short; do not repeat the page:

```
The rulings are on one page: <path>/index.html. Nothing is written yet.
Rule now: <G0 name>, <G4 name>. Waiting: <G1, G2> after <G0>.
I recommend <G0a, G4a>. Most important fact from the code: <fact>.
```

On the page, clicking anywhere in an option's column — or its Pick button — picks it; a second
click unpicks. Hovering a column previews its picture. **None of these fit** picks `n`. Each
ruling has a note; Copy puts the answer on the clipboard: `G2a — its note, G3b`, a note alone
as `G4 — its note`, then a blank line and the page note. Picks and notes persist under the
page's `key`. In chat the owner types picks like `G1a, G2c` and notes like `G6 note: …`; both
read verbatim. A note qualifies its pick (`G2a — its note`): act on the pick as the note
changes it, and where the two disagree the note wins; `n` with a note means the note is the
answer. A ruling with no pick is still open. Never treat your recommendation as the owner's
answer.

**A decision the owner can rule from one line, in chat** — AskUserQuestion, not a page: one
question per decision, two to four options, each option's description carrying its gain and
cost, the recommended one named in the question.

## Step 7 — Pushback

A pushback is anything other than a pick. In order: restate it in one line; name its kind;
sweep every ruling against it and say which change and which do not; update `page.js`, rebuild
with `--no-open`, ask the owner to reload.

1. **About one ruling**: change that ruling only; say what changed in its `changed`.
2. **A principle**: sweep all rulings; report rewritten, new option, moved recommendation, untouched.
3. **Two rulings are one**: keep one, delete the other, and say so in the survivor's `changed`.
4. **The mechanism exists**: delete the options that build a new one; add "use that".
5. **The owner cannot judge the options**: the framing is wrong. Walk the case through in chat
   from the user's side, then redo the page.

A new option takes the next letter; a moved recommendation is said in `changed`, never silent.
If the owner is right, say so and take the simpler design.

## Step 8 — After a round

Write what was ruled where it lands, as `(owner, G2c)`. On the page, set `ruled: "<letter>"`
on each ruled ruling — it moves to the round map's Ruled lane — and write every waiting ruling
whose `after` is now ruled in full, under that pick. Rebuild with `--no-open` and ask for a
reload; that is the next round. When no ruling is left, report:
`Written: <G1a, G2c>. Nothing is committed. <file>: <what changed>. One thing differs from the page: <what, why>. / Nothing differs.`
A rule the owner stated on the way goes into a CLAUDE.md the same session.

## page.js fields

`page.js` sets `var PAGE = { … };`.

| Field                     | Req.  | What to write                                                                                     |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| `eyebrow`, `title`, `sub` | title | Repo and thread; two or three words; one optional sentence.                                       |
| `key`                     | no    | A stable slug for the topic; picks and notes persist in the browser under it.                     |
| `decided`                 | no    | `["…"]`: each thing you decided without the owner, and each finding checked false, one line each. |
| `rulings`                 | yes   | One entry per id, in the order the owner should read them.                                        |

A written ruling: `title`, `stake`, `must` (`["…"]`), `cut` (`[{ k, t, why }]`), `opts`,
`rows`, `why`, at most one picture (`seq`, `bodies` or `figure`), and after a pushback
`changed`. `ruled: "a"` once ruled; `after: "G1"` on a ruling written under G1's pick.

A waiting ruling: `title` and `after` only.

An option: `k` (one lowercase letter, never `n`, never reused — a cut option keeps its letter),
`t`, `rec` (on exactly one), `today` (on at most one).

A row: `{ on: "stake" | "beyond", label, marks: { a: ["gain", "reason"], b: ["cost", "reason"] } }`
— a mark for every live option.

Every text field — titles, option titles, stakes, musts, cut reasons, labels, reasons, `why`,
`changed`, `decided`, `sub` and picture captions — is HTML (`<i>`, `<b>`, `&lt;`), but never
`<code>` or a `file:line`.

## Never

- Never write to the repo before the owner rules.
- Never publish the page. Never put the rulings in chat when a page exists.
- Never mark two options recommended, or none. Never change what a letter means after it is
  shown, and never reuse a dropped option's letter.
- Never write a waiting ruling in full before the ruling it rests on is ruled.
