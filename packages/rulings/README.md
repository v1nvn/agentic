# rulings

Put decisions the owner must make on one local HTML page — each ruling
self-contained: the question, its stake, how its part works today, and
lettered options with gain, cost and a recommendation beside a picture that
joins only when one earns it. Clicking an option picks it and shows its
picture — a second click unpicks; hovering previews a picture without picking.
The owner adds a note per ruling and copies the
composed answer; the sidebar's layout switch sets the picture beside or under the options, remembered across pages — a sequence diagram, too wide to sit beside them, always sits under;
picks persist under the page's `key`. The plugin is the `/rulings:consult`
skill; the CLI builds and rebuilds the page it opens. The plugin's goal and its
non-regression floors live in [ARCHITECTURE.md](ARCHITECTURE.md).

Install as a Claude Code plugin: `claude plugin install rulings@agentic`.

## Build

    npx -y @v1nvn/rulings@0.53.1 <page-dir>        # rebuild the page from page.js
    npx -y @v1nvn/rulings@0.53.1 <page-dir> --new  # seed page.js from the example

From a checkout of this repo, the same door is:

    yarn install && node packages/rulings/src/index.ts <page-dir>

Pages live in `~/.claude/rulings/<topic>/` — never `/tmp`, never published.
A rebuild prints the schema's errors and exits red on any of them.
The skill's one exec is the pinned `npx -y @v1nvn/rulings@0.53.1 <page-dir>`
line above, run through the session's Bash tool; the one allow rule it needs is
`Bash(npx -y @v1nvn/rulings@0.53.1:*)`; the first run asks for it once, then it
is remembered.

## Skill

`/rulings:consult` is the plugin's one skill. From the model's seat: decide it is a page
(the owner asked, or must rule on evidence they do not hold), read the
code and write `page.js`, run the pinned `npx` line above through the session's Bash tool
until it exits green and the page opens, announce the path and the recommendation in chat
without repeating the page, then read the answer back. The owner picks on the page — an option
(a second click unpicks), None of these fit, a quick group's accept-recommended, while hovering
only previews a picture — and pastes the composer's copied
answer (picks with the ruling's note, unmet needs, the page note), or types picks (`G1a`, `G2n`, `G6 note: …`) in chat; both
read verbatim. Pushback updates `page.js` and rebuilds with `--no-open` for a reload;
a decision the owner can rule from one line never reaches the page — it goes through AskUserQuestion.

## Layout

```
packages/rulings/                   the builder CLI, pure TS — the plugin root itself:
                                     .claude-plugin/ + README.md
  src/index.ts                      the CLI entry
  src/cli.ts, page.ts               the command door and the page assembly
  src/schema.ts                     the page schema — one typed door
  src/seq.ts, bodies.ts, figure.ts  the three picture emitters (seq SVG, prism diff, free HTML/SVG)
  src/decide.ts                     the decision card: options beside the picture views
  src/chrome.ts                     the composer bar and the page's one script
  src/style.ts                      the page stylesheet (light-only)
  test/                             the vitest suite
```
