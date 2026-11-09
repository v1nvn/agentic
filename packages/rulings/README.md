# rulings

Put decisions the owner must make on one local HTML page. Each ruling is a
question, its stake on a real case, and a scorecard: rows are outcomes, columns
are lettered options, each cell a gain, mixed or cost mark with its reason —
rows on the stake first, rows beyond it after — then one line on why the
recommendation wins. A picture of the case joins only when one earns it. A
round map at the top shows what to rule now and which rulings wait on which
pick. Clicking anywhere in an option's column, or its Pick button, picks it; a
second click unpicks; hovering a column previews its picture. The owner adds a
note per ruling and copies the composed answer; picks persist under the page's
`key`. The plugin is the `/rulings:consult` skill; the CLI builds and rebuilds
the page it opens. The plugin's goal and its non-regression floors live in
[ARCHITECTURE.md](ARCHITECTURE.md).

Install as a Claude Code plugin: `claude plugin install rulings@agentic`.

## Build

    npx -y @v1nvn/rulings@0.56.0 <page-dir>        # rebuild the page from page.js
    npx -y @v1nvn/rulings@0.56.0 <page-dir> --new  # seed page.js from the example

From a checkout of this repo, the same door is:

    yarn install && node packages/rulings/src/index.ts <page-dir>

Pages live in `~/.claude/rulings/<topic>/` — never `/tmp`, never published.
A rebuild prints the schema's errors and exits red on any of them.
The skill's one exec is the pinned `npx -y @v1nvn/rulings@0.56.0 <page-dir>`
line above, run through the session's Bash tool; the one allow rule it needs is
`Bash(npx -y @v1nvn/rulings@0.56.0:*)`; the first run asks for it once, then it
is remembered.

## Skill

`/rulings:consult` is the plugin's one skill. From the model's seat: decide it is a page
(the owner asked, or must rule on evidence they do not hold), sort the rulings into what
stands now and what waits on another pick, read the code and write `page.js`, run the pinned
`npx` line above until it exits green and the page opens, announce the path and the
recommendation in chat without repeating the page, then read the answer back. The owner picks
on the page and pastes the composer's copied answer (picks with each ruling's note, then the
page note), or types picks (`G1a`, `G2n`, `G6 note: …`) in chat; both read verbatim. Once a
round is ruled, the waiting rulings are written under those picks and the page rebuilds with
`--no-open` for a reload. A decision the owner can rule from one line never reaches the page
— it goes through AskUserQuestion. The picture kinds and their fields live in
[references/pictures.md](references/pictures.md).

## Layout

```
packages/rulings/                   the builder CLI, pure TS — the plugin root itself:
                                     .claude-plugin/ + README.md
  src/index.ts                      the CLI entry
  src/cli.ts, page.ts               the command door and the page assembly
  src/schema.ts                     the page schema — one typed door
  src/card.ts                       the decision: must, cut, picture, scorecard, why, note
  src/seq.ts, bodies.ts, figure.ts  the three picture emitters (seq SVG, prism diff, figure strip)
  src/chrome.ts                     the composer and the page's one script
  src/style.ts                      the page stylesheet (light-only)
  references/pictures.md            the picture kinds, read only when a ruling earns one
  test/                             the vitest suite
```
