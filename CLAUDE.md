# agentic — rules

A Claude Code plugin marketplace: `readability` and `omlx` (MCP servers) plus `rm`,
`md`, `zai`, `tokens` (zero-token hook plugins) and `statusline-lab` (status line +
agent panel) — seven independently-installable plugins in one repo. The code lives
in eight npm packages (`@v1nvn/*`) under `packages/`; each plugin directory is only
a manifest plus config wrapper.

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

## Docs

- **Stripe-style voice.** Lead with a real command or table, then the shortest framing
  sentence. Flat, declarative, one idea per sentence. No first person, no throat-clearing.
  Name the concrete thing, not the marketing noun — ban *platform, seamless, powerful,
  comprehensive, robust, intelligent, real-time, first-class, delightful, leverage*.
  Table-driven where a list would do.
- **The README moves with the surface.** When behavior shifts or something ships, the README
  changes in the same step.

## Layout

- **Code in `packages/`, manifests in `plugins/`.** One yarn workspace at the root
  (`"workspaces": ["packages/*"]`); each package builds with vite and publishes to npm
  under `@v1nvn/*`. A plugin directory holds only `plugin.json`, one `.md` surface —
  a skill (`SKILL.md` at the root for a one-skill plugin) when the model executes the
  body, a `commands/` shell when a `UserPromptExpansion` hook intercepts the
  invocation (the body is the no-hooks fallback, and model auto-invocation would
  bypass the hook) — a hooks/mcp config whose `npx` invocations are version-pinned to
  the train, and, for statusline-lab only, the bash runtime payload under
  `plugins/statusline-lab/runtime/` (the TS CLI is the package, pure TS, zero bash).
  No other code lives under `plugins/`.
- **Scripts resolve binaries only from deps the workspace declares.** Each package
  declares the tools its scripts invoke (`vite`, `vitest`); the root declares the
  root-run tools (eslint stack, prettier, typescript).
- **Seven independent plugins, one marketplace.** Never collapse them into a
  mega-plugin; each installs and runs on its own.
- **statusline-lab ships exactly one skill** — root `SKILL.md`, invoked by its
  bare short name `/statusline-lab` (the menu lists it namespaced as
  `statusline-lab:statusline-lab`; the plugin prefix is irremovable), folding
  show (`catalog`) · set (`configure`) · revert (`restore`) · check (`status`).
  Never add a second; its name must not collide with Claude Code's built-in
  `/statusline`.
- **The terminal is the only rendering surface** — nothing opens a browser,
  nothing writes HTML.
- **One author identity:** `v1nvn` / `v1n@outlook.com` in every manifest.

## Invariants

- **The readability server never fetches URLs.** Only the host shell's `curl` does. The server
  reads HTML from a file path; the page bytes never enter the model context.

## References

- **`references/tracking.md`** — the work-tracking rules. Read before touching `TODO.md` or
  any `progress/` file.
- **`references/npm-publishing.md`** — the release train, keyless publishing, and the one-time
  manual bootstrap a never-published package name needs. Read before cutting a release or
  adding a package.
