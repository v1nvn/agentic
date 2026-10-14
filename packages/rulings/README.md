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

## Layout

```
packages/rulings/                   the builder CLI, pure TS — the plugin root itself:
                                     .claude-plugin/ + README.md
  src/index.ts                      the CLI entry
  test/                             the vitest suite
```
