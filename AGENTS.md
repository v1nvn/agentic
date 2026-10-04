# agentic — rules

A Claude Code plugin marketplace: `readability` and `omlx` (local MCP servers) plus
`enhansome` (hosted registry MCP server), `rm`, `md`, `zai` (zero-token hook
plugins), `tokens` (a mod: live status line + pane), `statusline` (status line +
agent panel), and `todo` (work tracking) — nine independently-installable plugins
in one repo. Each plugin lives inside its package home — `tokens`'s plugin root
is the package home itself; the other eight sit at `packages/<name>/plugin/`
until they port to that shape. Seven homes publish npm code (`@v1nvn/*`), while
`enhansome` points its
`.mcp.json` at the deployed server and `todo` is manifest + skills, no package.

## Philosophy

**Code is god.** Plans, design docs, and issue trackers are ephemeral: they exist to be
translated into code, then deleted. The code is the only account of what exists. Re-read the
source behind any anchor before relying on it — documentation drifts, and says so.

Prefer clean code. DRY. No band-aids, no workarounds, no deprecated aliases, no dead branches,
no commented-out code. A reader sees only what the code _is_, never archaeology of what it was.
Surface a real impasse; do not hack past it.

**Zero installs.** Only the owner runs this marketplace, often before adopting a surface at
all — no compatibility shims, no migration paths; break the surface clean when a better
name or shape wins.

## Commits

- **Conventional-commit one-liner, short and sweet:** `type(scope): subject` — e.g.
  `feat(rm): normalize author to v1nvn`, `fix(server): rewire release.yml to server/`.
  One line. If it needs a body, the subject is probably too broad.
- **No `Co-Authored-By` trailer — not Claude, not anyone.** History stays clean of AI
  attribution. This overrides the harness default that appends `Co-Authored-By: Claude`.

## Docs

- **Stripe-style voice.** Lead with a real command or table, then the shortest framing
  sentence. Flat, declarative, one idea per sentence. No first person, no throat-clearing.
  Name the concrete thing, not the marketing noun — ban _platform, seamless, powerful,
  comprehensive, robust, intelligent, real-time, first-class, delightful, leverage_.
  Table-driven where a list would do.
- **The README moves with the surface.** When behavior shifts or something ships, the README
  changes in the same step.

## Layout

- **A plugin's root is its package home; there is no `plugins/` directory.** `tokens`
  (the one mod) is re-rooted: its plugin root is `packages/tokens/` itself — manifest
  at `.claude-plugin/`, hooks module at `hooks/register.tsx`, island in `src/`, engine
  tests at `tests/`, state contract at `types/`. The other eight keep a `plugin/`
  subfolder until they port to the same shape; a plugin folder (or the re-rooted
  home) holds the manifest, `.md` surfaces — skills (a `SKILL.md` at the root or
  under `skills/<name>/`) when the model executes the body, a `commands/` shell when
  a `UserPromptExpansion` hook intercepts the invocation (the body is the no-hooks
  fallback, and model auto-invocation would bypass the hook) — and a hooks/mcp
  config. One yarn workspace at the root (`"workspaces": ["packages/*"]`); each
  package with npm code builds with vite and publishes to `@v1nvn/*`. A home without
  a `package.json` (`enhansome`, `todo`) holds only its `plugin/` folder. Every
  `npx -y @v1nvn/*` line in the repo, config or `.md` surface, is version-pinned to
  the train by `set-version.mjs` (an unpinned npx resolves "latest" through the npx
  cache and runs a stale CLI). Two synced artifacts:
  `packages/statusline/plugin/render.mjs` and `packages/tokens/bin/report.mjs` —
  committed builds the root `yarn build` syncs from the package dist, for code a
  surface execs or imports from the installed plugin folder.
- **A mod's sources are its package home — `.ts`/`.tsx` the engine loads directly,
  no bundler, no artifact** (module at `hooks/`, island in `src/`, engine tests at
  `tests/`). A hooks module imports only plugin-relative files and
  the bare `claude-code` (types + state helpers) — never an npm package — so the
  engine island is self-contained; shared pure code lives in the island and the
  packages import it from there. Types come from the vendored
  `types/claude-code.d.ts` (engine-written, version-stamped on its first line) via
  `tsconfig.mods.json`; regenerate it from `.claude-plugin/types/` after an engine
  update. `claude plugin validate <plugin root>` and `claude plugin test <plugin
  root>` are the mod's gates; read `references/mods.md` before writing one.
- **Scripts resolve binaries only from deps the workspace declares.** Each package
  declares the tools its scripts invoke (`vite`, `vitest`); the root declares the
  root-run tools (eslint stack, prettier, typescript).
- **Nine independent plugins, one marketplace.** Never collapse them into a
  mega-plugin; each installs and runs on its own.
- **statusline ships exactly one skill** — root `SKILL.md`, invoked by its
  bare short name `/lab` (the menu lists it namespaced as
  `statusline:lab`; the plugin prefix is irremovable), folding
  show (`catalog`) · set (`configure`) · revert (`restore`) · check (`status`).
  Never add a second; its invocation name must stay off Claude Code's built-in
  `/statusline` — the plugin's own name is a namespace, not a command.
- **Terminal surfaces render to the terminal only** — statusline and the report
  CLIs never open a browser, never write HTML. The one intended exception is
  md's share flow, which opens the Markdown-Viewer page (`MD_NO_OPEN` skips it).
- **One author identity:** `v1nvn` / `v1n@outlook.com` in every manifest.

## Invariants

- **Islands draw, processes compute.** Every real-compute surface is a real process — an npx
  hook command, an MCP server, the statusline resolver, or a mod exec'ing its plugin's shipped
  CLI through the session's Bash tool. A mod island never bulk-reads through `$.fs`
  (`$.fs.read` rejects over 4 MiB, no range form).
- **The readability server never fetches URLs.** Only the host shell's `curl` does. The server
  reads HTML from a file path; the page bytes never enter the model context.
- **MCP server `instructions` stay ≤ 2048 chars** — Claude Code truncates the rest silently,
  and a test pins the cap per server. Instructions carry routing (which tool when); each
  tool's description and schema carry its contract.

## Prompt surfaces

Every skill, command body, tool description, and sampling prompt is read by the model at run
time, so it speaks only to that model.

- **Maintainer rules live here, not in a surface.** A rule the running model cannot act on
  (never add a second skill, keep a version pinned) is noise in a `SKILL.md`.
- **Emphasis is earned by a reason.** State a constraint plainly with its _because_; caps and
  `NEVER` are for contract facts and routing, not for steering behavior.
- **todo: `/todo:run` is the primary skill.** It is the battle-tested one; `rules` defines
  the progress-file shape `run` consumes, and every other todo skill stays in sync with
  both — a change to one lands in the others in the same change.
- **A skill names no consumer repo.** What one project needs — its units, files, thresholds,
  high-stakes slices — lives in that project's plan; the skill states the generic mechanism
  the plan fills in.
- **Review a skill before creating or updating it.** Without installing it, read Anthropic's
  skill-creator (`anthropics/claude-plugins-official`, `plugins/skill-creator/skills/skill-creator`)
  with `gh`, review the surface against it and `references/skill-review.md`, and promote any
  new class of finding into that reference.
- **Size sampling `maxTokens` for thinking models.** Thinking counts toward the cap, so a
  ceiling tuned to the visible reply truncates it. Reply length belongs in the prompt, not the cap.

## References

- **`references/npm-publishing.md`** — the release train, keyless publishing, and the one-time
  manual bootstrap a never-published package name needs. Read before cutting a release or
  adding a package.
- **`references/skill-review.md`** — the skill and command review checklist, upstream rules
  adapted to this repo. Read before creating or changing any `SKILL.md` or `commands/*.md`.
