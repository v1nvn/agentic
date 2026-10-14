# rulings

Put decisions the owner must make on one local HTML page — each ruling
self-contained: the question, its stake, how its part works today, a picture,
lettered options with gain and cost, and a recommendation. The owner clicks a
view to pick, adds notes, and copies the composed answer; picks persist under
the page's `key`. The plugin is the `/rulings:consult` skill; the CLI builds
and rebuilds the page it opens.

Install as a Claude Code plugin: `claude plugin install rulings@agentic`.

## Build

    npx -y @v1nvn/rulings@0.49.0 <page-dir>        # rebuild the page from page.js
    npx -y @v1nvn/rulings@0.49.0 <page-dir> --new  # seed page.js from the example

Pages live in `~/.claude/rulings/<topic>/` — never `/tmp`, never published.
A rebuild prints the schema's errors and warnings and exits red on any error.
The skill's one exec is the pinned `npx -y @v1nvn/rulings@0.49.0 <page-dir>`
line above, run through the session's Bash tool; the one allow rule it needs is
`Bash(npx -y @v1nvn/rulings@0.49.0:*)`; the first run asks for it once, then it
is remembered.

## Skill

`/rulings:consult` is the plugin's one skill. From the model's seat: decide it is a page
(the owner asked, or three or more linked, or four or more independent, decisions), read the
code and write `page.js`, run the pinned `npx` line above through the session's Bash tool
until it exits green and the page opens, announce the path and the recommendation in chat
without repeating the page, then read the answer back. The owner picks on the page — a view
click, the none button, a quick group's accept-recommended — and pastes the composer's copied
answer (picks with their per-option notes, unmet needs, the page note), or types picks (`G1a`, `G2n`, `G6 note: …`) in chat; both
read verbatim. Pushback updates `page.js` and rebuilds with `--no-open` for a reload;
one to three simple decisions never reach the page — they go through AskUserQuestion.

## Layout

```
packages/rulings/                   the builder CLI, pure TS — the plugin root itself:
                                     .claude-plugin/ + README.md
  src/index.ts                      the CLI entry
  src/cli.ts, page.ts               the command door and the page assembly
  src/schema.ts                     the page schema — one typed door
  src/seq.ts, bodies.ts, diagram.ts the three picture emitters (SVG, prism diff, mermaid)
  src/chrome.ts                     the pick composer bar and its one script
  src/style.ts                      the page stylesheet (system theme alone)
  src/vendor/mermaid.min.js         vendored upstream mermaid@11, copied into a
                                     page dir only when a diagram ruling exists
  test/                             the vitest suite
```
