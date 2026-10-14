# rulings

Put decisions the owner must make on one local HTML page — each ruling
self-contained: the question, its stake, how its part works today, a picture,
lettered options with gain and cost, and a recommendation. The plugin is the
`/rulings:consult` skill; the CLI builds and rebuilds the page it opens.

Install as a Claude Code plugin: `claude plugin install rulings@agentic`.

## Build

    npx -y @v1nvn/rulings@0.46.1 <page-dir>        # rebuild the page from page.js
    npx -y @v1nvn/rulings@0.46.1 <page-dir> --new  # seed page.js from the example

Pages live in `~/.claude/rulings/<topic>/` — never `/tmp`, never published.
A rebuild prints the schema's errors and warnings and exits red on any error.
The skill's one exec is the pinned `npx -y @v1nvn/rulings@0.46.1 <page-dir>`
line above, run through the session's Bash tool; the one allow rule it needs is
`Bash(npx -y @v1nvn/rulings@0.46.1:*)`; the first run asks for it once, then it
is remembered.

## Layout

```
packages/rulings/                   the builder CLI, pure TS — the plugin root itself:
                                     .claude-plugin/ + README.md
  src/index.ts                      the CLI entry
  src/cli.ts, page.ts               the command door and the page assembly
  src/schema.ts                     the page schema — one typed door
  src/seq.ts, bodies.ts, diagram.ts the three picture emitters (SVG, prism diff, mermaid)
  src/style.ts, theme.ts            the page stylesheet and the ?theme= door
  src/vendor/mermaid.min.js         vendored upstream mermaid@11, copied into a
                                     page dir only when a diagram ruling exists
  test/                             the vitest suite
```
