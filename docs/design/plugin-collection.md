# Plugin collection — one agent-neutral home for readability, rm, md, zai

Status: migration not started · Captured 2026-08-09 · Last researched 2026-08-12
Scope: a **to-be-created** agent-neutral repo — `v1nvn/agentic` (see Decision 1, ratified
2026-08-12). Claude Code only for now; other harnesses deferred. The readability server
(source + npm publishing) consolidates into `agentic`; the `readability-mcp` GitHub repo
is deleted once `agentic` can publish.
Related: read-url strategy lives in the skill at [plugins/readability/skills/read-url/SKILL.md](/plugins/readability/skills/read-url/SKILL.md) (gate validated 2026-08-12).

## Problem

Four personal Claude Code plugins — `readability` (an MCP server), and `rm`, `md`, `zai`
(structurally-identical hook plugins) — live in four separate local repos with no git
remote, drifting in identity (`Vineet` vs `v1nvn`+email) and duplicating the one piece of
shared code (`last-reply`). There is no single marketplace to `/plugin install` from, and
no structure for adding codex/opencode/pi later without a refactor.

## Principle — agent-agnostic core, per-agent adapters

Author the agent-neutral parts once; package per agent. The agent-agnostic core is the
readability MCP server (published as `readability-mcp`) plus the shared shell scripts
(`shared/bin/`) plus the read-url strategy (a skill). Per-agent adapters only repackage
these in each agent's native format — Claude first (`.claude-plugin/` + `.mcp.json` +
skills/hooks); others later. Adding an agent is a new adapter directory, never a refactor.
This is the pattern `upstash/context7` practices (see Reference repos below).

## Verified findings (current state)

All verified by reading the local repos, August 2026.

### The four plugins today

The three hook plugins are the same shape — `.claude-plugin/plugin.json` + `bin/` +
`commands/` + `hooks/` — wired to a `UserPromptExpansion` hook that emits
`{"decision":"block","reason":…}` so the command never reaches the model (zero tokens):

```
remarkable/plugin/rm/           md/plugin/md/                   zai-usage/plugin/zai/
├ .claude-plugin/plugin.json    ├ .claude-plugin/plugin.json    ├ .claude-plugin/plugin.json
├ bin/                          ├ bin/                          ├ bin/
│  ├ last-reply                 │  ├ encode-share               │  ├ format.mjs
│  ├ rm-send                    │  ├ last-reply                 │  ├ format.test.mjs
│  └ send-to-remarkable         │  └ md-send                    │  └ usage.mjs
├ commands/send.md              ├ commands/send.md              ├ commands/usage.md
└ hooks/                        └ hooks/                        └ hooks/
   ├ hooks.json                    ├ hooks.json                    ├ hooks.json
   └ send-to-remarkable.sh         └ send-to-md.sh                 └ usage.sh
```

`readability` is the odd one out: an MCP server (npm package, vite/vitest/CI, published
as `readability-mcp`). Its plugin is `.mcp.json` + a skill, not bin/commands/hooks.

### DRY evidence (the concrete payoff)

- **`bin/last-reply` is duplicated in `rm` and `md`** — the only diff is one docstring
  line (md added a `<path.jsonl>` usage example); the executable body is byte-identical.
  This is the single piece of shared code across any plugins. (`zai` has no `last-reply`.)
- **`hooks.json` in `rm`/`md`/`zai` differ only in 3 fields:** `description`, `matcher`
  regex (`^rm:send$` / `^md:send$` / `^zai:usage$`), and which `.sh` the `command` points
  at — structurally identical.
- **The two hook `.sh` files** (`send-to-remarkable.sh` vs `send-to-md.sh`) are identical
  except the comment header and which downstream bin they pipe to. (`zai`'s `usage.sh` is
  shorter — no transcript resolution.)
- **`plugin.json` author fields drift:** rm/md say `"Vineet"`; zai says `"v1nvn",
  "v1n@outlook.com"`. One repo normalizes to `v1nvn`.

### Provenance (what would have to migrate)

- The three hook repos have **no git remote** — local-only; nothing to migrate on the
  publish side.
- Only **readability-mcp** has a remote (`github.com/v1nvn/readability-mcp`) and npm
  publishing: `.github/workflows/release.yml` uses `yarn npm publish --provenance` with
  trusted publishing (`id-token: write`), triggered off `package.json` version on `main`,
  with a "skip if tag exists" guard.
  `files: ["dist"]`, `bin: "dist/index.js"`.

### Reference repos — the per-agent adapter pattern (verified)

Two distinct, complementary patterns in the wild (`upstash/context7`):

1. **`plugins/<agent>/<plugin>/`** — packaged adapters in each agent's native format.
   Claude: `.claude-plugin/plugin.json` + `agents/commands/skills/`. Cursor: `mcp.json` +
   `rules/`. Copilot: root `plugin.json` with `mcpServers/agents/skills/commands`. Codex:
   skills only (MCP wired via `~/.codex/config.toml`). These are **hand-authored per
   agent, not built from a shared source via copy.**
2. **`docs/clients/<agent>.mdx`** — per-agent install/configuration docs.

The shared thing across agents is the **published MCP package** (`packages/mcp/`) plus
conceptual skill content — context7 does *not* run a `shared/bin → per-agent copy` build.

**Two corrections to the prior `MARKETPLACE.md`** (recorded for honesty):

- `zai-coding-plugins` has **no** `docs/clients/<agent>.mdx` and is a **single-agent**
  Claude marketplace — that pattern is context7-only.
- context7's `build-skills.mjs` **does not copy/compile** — it syntax-checks
  `SKILL.md`-referenced scripts (`node --check`). It is not a model for a copy step;
  adopt it only as a lint gate.

## Options

### Decision 1 — repo shape

| | Shape A — grow *this* repo | Shape B — new agent-neutral repo |
|---|---|---|
| What | Move server under `server/`, add `agents/`+`shared/`, rename repo | New repo: `agents/<agent>/` + `shared/bin/` + `strategies/`; readability keeps publishing from its own repo; the Claude adapter references `npx -y readability-mcp` |
| Pros | One repo to browse; mirrors context7 (`packages/mcp/` + `plugins/<agent>/`) | **Zero migration** — `release.yml`, npm provenance, tags, repo URL, README, smithery.yaml, Dockerfile all keep working; agent-neutral name from day one; multi-agent from day one; all DRY/UX wins land now |
| Cons | **Migrates a published, provenance-signed npm package** (re-wire `release.yml`, risk a publish gap); the name `readability-mcp` is a misfit for a multi-plugin home and renames break every install (`npx -y readability-mcp`, README links, smithery, Dockerfile); must exclude `agents/`/`shared/`/`strategies/` from the npm tarball; co-locating source buys nothing technically — the adapter references the published package anyway | Two repos to keep conceptually aligned (low-frequency: the contract is stable — `extract` + `diagnostics.readerable`) |

**Decided (2026-08-12), revised same day: consolidate — one repo, `v1nvn/agentic`, then
delete `readability-mcp`.** This supersedes the earlier "Shape B, server stays put" stance.
`agentic` keeps Shape B's agent-neutral name and multi-plugin layout but absorbs Shape A's
migration: the readability server source, its four workflows, `smithery.yaml`, and
`Dockerfile` move in under `server/`; the `readability-mcp` GitHub repo is deleted once
`agentic` publishes successfully. Accepted trade-off: a publish gap during migration (worth
it — no double code/repos). The npm package `readability-mcp` — name and version trajectory
from v0.10.2 — is preserved; only its source repo moves. See *Migration & deletion* below
for the one thing that is not portable.

### Migration & deletion — the one non-portable thing

Deleting `readability-mcp` does **not** unpublish the npm package: npm is independent of
GitHub, so every published version (v0.2.0→v0.10.2) stays installable and existing
`.mcp.json` snippets using `npx -y readability-mcp` keep working. What must move or be
re-pointed:

- **npm trusted publishing must be re-bound.** `release.yml:48-50` publishes with
  `--provenance` and **no `NPM_TOKEN`** — the authority is npm-side OIDC pinned to
  `v1nvn/readability-mcp` + the workflow path (`id-token: write`, `release.yml:10`). Copy
  the file to `agentic` and the next publish 403s until the mapping is reconfigured on
  npmjs.com to `v1nvn/agentic`. A package has one publish source, so this *moves* the
  ability — the old repo can't publish afterward.
- **Safe sequence (never lose publish ability):** create `agentic` → move the server into
  `server/` and rewire `release.yml`/`test.yml`/`bench.yml`/`readability-versions.yml`
  (`working-directory: server`), the `Dockerfile` (build context), and `smithery.yaml`
  (paths) → rebind npm OIDC → push the existing tags so the "skip if tag
  exists" guard (`release.yml:22-30`) still works → verify a real publish from `agentic`
  → **then** delete `readability-mcp`.
- **`repository.url`** (`package.json:32`) points here — update to `v1nvn/agentic` with a
  `directory: "server"` field, or the npm page links to a deleted repo.
- **Tags / GitHub Releases** are lost on deletion unless pushed first (above).
- **Smithery** — `readability-mcp` is not registered on smithery.ai (confirmed), so
  nothing external to re-point; the in-repo `smithery.yaml` just moves with the server.

### Decision 2 — target layout

```
v1nvn/agentic/                      # agent-neutral home
  server/                           # readability MCP server, moved from readability-mcp
    package.json                    # name readability-mcp; files:["dist"] keeps the npm tarball clean
    smithery.yaml  Dockerfile       # server-publish artifacts, rewired to server/ paths
    src/  test/  README.md  docs/design/   # schema-synced server README + this design doc travel here
  shared/bin/last-reply             # single source for the one shared script
  .claude-plugin/marketplace.json   # one marketplace, four plugins (root = where `marketplace add` discovers it)
  plugins/{readability,rm,md,zai}/  # .claude-plugin/plugin.json + .mcp.json/skills/hooks/commands
  .github/workflows/
    build.yml                       # collection CI: validate manifests + identity-check shared files
    test.yml  bench.yml  release.yml  readability-versions.yml   # server CI, scoped to server/
```

> **Revised 2026-08-13 — drop the `agents/claude/` wrapper.** Plugins live at root `plugins/`;
> the marketplace manifest sits at root `.claude-plugin/marketplace.json`. The agent-neutral
> *name* (`agentic`) stays; the per-agent directory scaffolding is deferred until a second
> agent needs it (YAGNI). This also fixes discovery: `claude plugin marketplace add` only reads
> a root `.claude-plugin/marketplace.json`, so the manifest belongs at the root, not nested.

For Claude this is **one marketplace, four plugins** (not one mega-plugin): one
`/plugin marketplace add`, then `/plugin install <name>` per tool. **Each plugin is
installed and used independently** — a user can install just `readability`, just `rm`, or
any subset; nothing forces all four. That independent-install property is a hard
requirement, not a nice-to-have: never collapse the four into one mega-plugin. Confirmed
canonical: a single `marketplace.json` lists every plugin in its `plugins[]` array
(`name` + `source` each); reserved marketplace names like `claude-plugins-official` are
off-limits (`code.claude.com/docs/en/plugin-marketplaces`).

This design doc (`docs/design/plugin-collection.md`) moves into `agentic` with the server
(under `server/docs/design/`) — there is no second repo. The read-url strategy is carried
by the skill at `.claude/skills/read-url/SKILL.md` (gate validated 2026-08-12); it ships
inside the readability plugin as `plugins/readability/skills/read-url/SKILL.md`.

### Decision 3 — workspace tooling

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Plain dirs + one CI workflow + manual `plugin.json` bumps** | Matches the codebase: three hook plugins are shell + one-off `.mjs` with no shared TS/deps/build; readability is TS but shares no code with the hook plugins; the only shared code is 36 lines of bash | None for this scope | **Recommend** |
| pnpm workspaces / turborepo / changesets | Shared dep graph, unified versioning | Cargo cult here — no shared TS, no `node_modules` to hoist; Claude Code plugins aren't semver-resolved by package managers. (context7 uses pnpm workspaces only because it has multiple real TS packages — you don't.) | Reject (YAGNI) |

Add workspace tooling **only if** shared TypeScript between plugins actually emerges.

### Decision 4 — build/CI for the shared script

The goal: keep `last-reply` single-source while installed plugins have `bin/last-reply`
present (so `${CLAUDE_PLUGIN_ROOT}/bin/…` resolves post-install). The existing hooks
already tolerate source-or-installed via a fallback:
`bin="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/bin"`.

| Option | What | Verdict |
|---|---|---|
| **1. CI identity-check** | Keep `last-reply` as a real file in each plugin dir; a CI test asserts the copies are byte-identical to `shared/bin/last-reply` (fails on drift). No build output, no generated artifacts. | **Recommend** (smallest thing that enforces the only real invariant) |
| 2. CI copy step | `build-adapters.mjs` copies `shared/bin/*` into each plugin dir before publish. Cleaner source, but CI must commit artifacts or publish from CI. | Graduate here if more shared scripts emerge (e.g. a shared `transcript-resolve.sh` extracted from the two identical hooks) |
| 3. Full per-agent template | Generate `plugins/<name>/` entirely in CI from `shared/` + a template. | Overkill — plugins differ in real ways (rm has `send-to-remarkable`, md has `encode-share`/`md-send`, zai has `format.mjs`/`usage.mjs`) |

Adopt context7's `build-skills.mjs` **separately** as a lint gate (walk `SKILL.md`,
`node --check` referenced scripts) — it solves a different problem (frontmatter/syntax
lint), not the copy/identity concern. Do not conflate them.

## Invariants to preserve

- **No fetch inside the readability server** — the `readability` adapter references
  `npx -y readability-mcp` (the published package); the server itself is unchanged. The
  no-fetch invariant ([read-url skill](/plugins/readability/skills/read-url/SKILL.md)) holds because the only network call is
  `curl` issued by the host shell at the skill's instruction.
- **One author identity** (`v1nvn`) across all four `plugin.json`s.
- The server README (schema-synced, per project `CLAUDE.md`) moves to `server/README.md`;
  `agentic`'s root README describes the marketplace.

## Open questions

None remaining — the three below were ratified 2026-08-12:

- **Repo name → `v1nvn/agentic`.** Agent-neutral; not `claude-plugins`.
- **`docs/design/` moves into `agentic` with the server** (under `server/docs/design/`) —
  there is no second repo once `readability-mcp` is deleted. The read-url strategy lives in
  the skill (`plugins/readability/skills/read-url/SKILL.md`), not a separate design doc.
- **Other harnesses deferred.** Claude Code is the only target for now; codex/opencode/pi
  land later, in their own native packaging. The per-agent directory layout (e.g. an
  `agents/<agent>/` wrapper) is decided when the second agent actually arrives — not
  scaffolded now. No work on them yet.

## Next steps (when picked up)

1. Create `v1nvn/agentic`. Move the readability server in under `server/` (source, tests,
   `smithery.yaml`, `Dockerfile`, schema-synced `README.md`, `docs/design/`). Rewire the
   four server workflows to `working-directory: server`; update `repository.url` +
   `directory: "server"` (`package.json:32`).
2. Rebind npm trusted publishing to `v1nvn/agentic` on npmjs.com; push the 10 tags; verify
   a real publish from `agentic` before deleting anything.
3. Add the collection layer: `shared/bin/last-reply`; root
   `.claude-plugin/marketplace.json` (modeled on `zai-coding-plugins`, sources pointing into
   `plugins/`) and the CI lint + identity-check workflow (Decision 4, Option 1). Move `rm`,
   `md`, `zai` into `plugins/`; dedupe `last-reply`.
4. Add the `readability` plugin under `plugins/readability/`:
   `.mcp.json` (`npx -y readability-mcp`) + `skills/read-url/SKILL.md` (already authored at
   `.claude/skills/read-url/SKILL.md`, gate validated 2026-08-12). The legacy `read_url`
   MCP prompt is retired; this skill replaces it. Normalize author to `v1nvn` across all
   four `plugin.json`s.
5. Once `agentic` publishes cleanly, delete the `readability-mcp` GitHub repo (npm package
   unaffected).
