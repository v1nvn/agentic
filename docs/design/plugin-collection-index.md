# Plugin collection migration — progress & handoff

Status: migration not started · Phase 0 in progress · Last updated 2026-08-13

Tracks the migration of `readability` + `rm`/`md`/`zai` into one repo, `v1nvn/agentic`
(flattened layout — see [plugin-collection.md](./plugin-collection.md) Decision 2 + its
2026-08-13 revision note). The design doc is the source of truth for *why/what*; this file
tracks *done/todo state* and hands off between sessions. Work one phase per session.

## How a fresh session uses this file

1. Read [plugin-collection.md](./plugin-collection.md) (spec) and this file (state).
2. Read **Current state** below — do the next unchecked task in the active phase.
3. When a task is done, mark its box `[x]` and update **Current state** (date, what finished,
   next action, any blockers).
4. Never redo checked work. If a checked task is actually incomplete, uncheck it and say why.
5. Respect **Critical path** and **Invariants** — they are the irreversible mistakes.

## Current state

- **Last session (2026-08-13):** wrote root `README.md` (Stripe-style, flattened layout);
  updated the design doc to the flattened layout (Decision 2 block, revision note, path
  fixes, Next-steps rewrite); created this index; wrote root `CLAUDE.md` (commits, comments,
  docs voice, layout, invariants); created the public GitHub repo `v1nvn/agentic`, made the
  initial commit `chore: scaffold repo`, added root `.gitignore`.
- **Done:** public GitHub repo `v1nvn/agentic` (https://github.com/v1nvn/agentic), initial
  commit pushed (`chore: scaffold repo`); `README.md`; `CLAUDE.md`; `.gitignore`;
  `plugin-collection.md`; this index.
- **Not started:** server migration, npm rebind, collection layer, CI, teardown.
- **Active phase:** Phase 0 complete — Phase 1 next.
- **Next action:** start Phase 1 — move the readability server source from
  `~/git/readability-mcp/` into `server/` (`src/`, `test/`, `package.json`, configs,
  `yarn.lock`, `Makefile`), then rewire the four workflows + `Dockerfile` + `smithery.yaml`
  + `package.json` `repository.url`.
- **Blockers:** none. (The irreversible step arrives in Phase 2 — see Critical path.)

## Critical path — do not violate

The npm sequence is the one step that can lose the ability to publish. Order is mandatory:

1. Move the server + rewire workflows (Phase 1).
2. Rebind npm trusted publishing on npmjs.com from `v1nvn/readability-mcp` → `v1nvn/agentic`
   (Phase 2). A package has one publish source — this *moves* the ability; the old repo can't
   publish afterward.
3. Push the 10 existing tags so the "skip if tag exists" guard (`release.yml:22-30`) holds.
4. Verify a real provenance publish from `agentic` succeeds.
5. **Only then** delete the `readability-mcp` GitHub repo (Phase 5). The npm package is
   unaffected by repo deletion; tags must be pushed first or GitHub Releases are lost.

Deleting too early = old repo can't publish (OIDC moved) and new repo not yet verified = a
publish gap with no safe recovery.

## Invariants to preserve

- **No fetch inside the readability server** — only the host shell's `curl` (per the read-url
  skill). The adapter references `npx -y readability-mcp`; the server is unchanged.
- **One author identity** across all four `plugin.json`s: `v1nvn` / `v1n@outlook.com`.
- **Four independent plugins, one marketplace** — never collapse into a mega-plugin. Each
  installs standalone (`/plugin install <name>`).
- **Marketplace manifest at repo root** `.claude-plugin/marketplace.json` — `marketplace add`
  reads only a root manifest (flattened layout, not nested under `agents/`).

## Source locations (verified 2026-08-12 / 2026-08-13)

- **readability server:** `~/git/readability-mcp/` → `agentic/server/`
  - workflows: `.github/workflows/{release,test,bench,readability-versions}.yml`
  - tags (10): v0.2.0, v0.3.0, v0.4.0, v0.5.0, v0.9.0, v0.9.1, v0.9.2, v0.10.0, v0.10.1, v0.10.2
  - `release.yml`: `id-token: write` (L10), skip-if-tag-exists guard (L22-30), `--provenance`
    publish with no `NPM_TOKEN` (L48-50)
  - `package.json`: `repository.url` (L32), `name: readability-mcp`, `files: ["dist"]`,
    `bin: dist/index.js`
  - read-url skill: `.claude/skills/read-url/SKILL.md` → ships at
    `plugins/readability/skills/read-url/SKILL.md`
- **rm plugin:** `~/git/remarkable/plugin/rm/` — bin: `last-reply`, `rm-send`,
  `send-to-remarkable`; `commands/send.md`; `hooks/{hooks.json, send-to-remarkable.sh}`;
  author `"Vineet"` (needs normalizing)
- **md plugin:** `~/git/md/plugin/md/` — bin: `encode-share`, `last-reply`, `md-send`;
  `commands/send.md`; `hooks/{hooks.json, send-to-md.sh}`; author `"Vineet"` (needs normalizing)
- **zai plugin:** `~/git/zai-usage/plugin/zai/` — bin: `format.mjs`, `format.test.mjs`,
  `usage.mjs`; `commands/usage.md`; `hooks/{hooks.json, usage.sh}`; author already `v1nvn`
- **shared code:** `bin/last-reply` duplicated in rm + md (byte-identical body, one docstring
  line differs) → single source `shared/bin/last-reply`
- **reference marketplace:** `~/git/zai-usage/tmp/zai-coding-plugins/.claude-plugin/marketplace.json`

## Target layout (flattened)

```
v1nvn/agentic/
  .claude-plugin/marketplace.json     # root manifest; sources point into plugins/
  plugins/{readability,rm,md,zai}/    # each: .claude-plugin/plugin.json + .mcp.json/skills/hooks/commands
  server/                             # readability MCP server → npm readability-mcp
  shared/bin/last-reply               # the one shared script
  docs/design/{plugin-collection.md, plugin-collection-index.md}
  README.md
```

## Tasks

### Phase 0 — Scaffold & docs  · done

- [x] Write root `README.md` (Stripe-style, flattened layout)
- [x] Update `plugin-collection.md` to flattened layout (Decision 2 + revision note + path fixes)
- [x] Create this index
- [x] Create root `CLAUDE.md` (commits, comments, docs voice, layout, invariants)
- [x] Create GitHub repo `v1nvn/agentic`; add as remote; initial commit `chore: scaffold repo` (public)
- [x] Add root `.gitignore`
- [x] ~~Create empty skeleton dirs~~ — skipped: git doesn't track empty dirs and `.gitkeep` is
      cruft; `plugins/`, `shared/bin/`, `.github/workflows/` are created when their content
      lands (Phases 1 & 3)

### Phase 1 — Move the readability server into `server/`

- [ ] Copy server source into `server/`: `src/`, `test/`, `package.json`, `vite.config.ts`,
      `tsconfig.json`, `eslint.config.js`, `prettier.config.js`, `yarn.lock`, `Makefile`
- [ ] Move schema-synced `README.md` → `server/README.md`
- [ ] Move `smithery.yaml` + `Dockerfile` into `server/`; rewire paths to the `server/` build context
- [ ] Update `server/package.json`: keep `name: readability-mcp`, `files: ["dist"]`,
      `bin: dist/index.js`; set `repository.url` → `v1nvn/agentic` with `directory: "server"` (was L32)
- [ ] Move the four workflows to `.github/workflows/`; add `working-directory: server` to every job
- [ ] Verify `yarn test` + `yarn build` pass from `server/` before any publish wiring
- [ ] Relocate these design docs (see Open questions first)

### Phase 2 — Rebind npm publishing  · critical path

- [ ] On npmjs.com, rebind trusted-publishing OIDC: `v1nvn/readability-mcp` → `v1nvn/agentic`
      + the new `release.yml` path (`id-token: write`)
- [ ] Push the 10 existing tags to `agentic`
- [ ] Bump `server/package.json` version; trigger `release.yml`; confirm a real provenance publish
- [ ] Smoke-test `npx -y readability-mcp` installs the newly published version

### Phase 3 — Collection layer + adapters

- [ ] Create `shared/bin/last-reply` (dedupe the rm + md copies)
- [ ] Move `rm` → `plugins/rm/`; drop in the shared `bin/last-reply`
- [ ] Move `md` → `plugins/md/`; drop in the shared `bin/last-reply`
- [ ] Move `zai` → `plugins/zai/` (no `last-reply`)
- [ ] Normalize author to `v1nvn` / `v1n@outlook.com` across all four `plugin.json`s
- [ ] Create root `.claude-plugin/marketplace.json` (4 plugins, `source: ./plugins/<name>`)
- [ ] Build the `readability` plugin at `plugins/readability/`: `.mcp.json`
      (`npx -y readability-mcp`) + `skills/read-url/SKILL.md`
- [ ] Retire the legacy `read_url` MCP prompt (the skill replaces it)
- [ ] Confirm each hook's `bin` fallback resolves source-or-installed:
      `${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/bin`
- [ ] Locally verify all four plugins install independently (`marketplace add` + `install <name>`)

### Phase 4 — Collection CI

- [ ] Add `.github/workflows/build.yml`: validate plugin/marketplace manifests + identity-check
      that every plugin's `bin/last-reply` is byte-identical to `shared/bin/last-reply`
- [ ] Add `build-skills.mjs` lint gate: walk `SKILL.md`, `node --check` referenced scripts
      (kept separate from the identity check)

### Phase 5 — Teardown  · only after a clean publish

- [ ] Confirm `agentic` publishes cleanly and all four plugins install independently
- [ ] Delete the `readability-mcp` GitHub repo (npm package unaffected; tags from Phase 2 preserve Releases)
- [ ] Update the design doc Status line → "migration complete"

## Open questions

- **Doc location.** Decision 2 says `plugin-collection.md` travels under `server/docs/design/`
  (it originated in the readability-mcp repo). But this index and the design doc describe the
  *whole* agentic repo — marketplace, collection, migration — not just the server. Consider
  keeping both at repo-root `docs/design/` instead of moving them under `server/`. Decide
  before completing the Phase 1 "relocate docs" task.
