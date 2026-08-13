# agentic — rules

A Claude Code plugin marketplace: `readability` (an MCP server) and `rm`, `md`, `zai`
(zero-token hook plugins) — four independently-installable plugins in one repo.

## Philosophy

**Code is god.** Plans, design docs, and issue trackers are ephemeral: they exist to be
translated into code, then deleted. The code is the only account of what exists. Re-read the
source behind any anchor before relying on it — documentation drifts, and says so.

Prefer clean code. DRY. No band-aids, no workarounds, no deprecated aliases, no dead branches,
no commented-out code. A reader sees only what the code *is*, never archaeology of what it was.
Surface a real impasse; do not hack past it.

## Commits

- **Conventional-commit one-liner, short and sweet:** `type(scope): subject` — e.g.
  `feat(rm): normalize author to v1nvn`, `fix(server): rewire release.yml to server/`.
  One line. If it needs a body, the subject is probably too broad.
- **No `Co-Authored-By` trailer — not Claude, not anyone.** History stays clean of AI
  attribution. This overrides the harness default that appends `Co-Authored-By: Claude`.

## Comments

- **A comment is a defect until the code is proven unable to carry the meaning.** Before
  writing one, try in order: rename, extract the block to a named function, name the literal
  as a const. Three kinds survive that: an invariant the code cannot carry, a non-obvious
  external contract (cited), and a note that something which looks wrong is in fact correct.
  Everything else — a section banner, a restatement of the line above, a sentence a rename
  would replace — is fixed in the code, not written as a comment.

## Docs

- **Stripe-style voice.** Lead with a real command or table, then the shortest framing
  sentence. Flat, declarative, one idea per sentence. No first person, no throat-clearing.
  Name the concrete thing, not the marketing noun — ban *platform, seamless, powerful,
  comprehensive, robust, intelligent, real-time, first-class, delightful, leverage*.
  Table-driven where a list would do.
- **The README moves with the surface.** When behavior shifts or something ships, the README
  changes in the same step.

## Layout

- **Flattened.** Plugins live at root `plugins/<name>/`; the marketplace manifest sits at root
  `.claude-plugin/marketplace.json` — that is where `claude plugin marketplace add` discovers
  it. No `agents/<agent>/` wrapper until a second agent actually arrives; scaffold it then,
  not now.
- **Four independent plugins, one marketplace.** Never collapse them into a mega-plugin; each
  installs and runs on its own.
- **One author identity:** `v1nvn` / `v1n@outlook.com` in every `plugin.json`.

## Invariants

- **The readability server never fetches URLs.** Only the host shell's `curl` does. The server
  reads HTML from a file path; the page bytes never enter the model context.
