# Plugin collection migration — progress & handoff

Status: Migration complete · Last updated 2026-08-13

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

- **This session (2026-08-13):** Phase 5 — teardown. Deleted the `readability-mcp` GitHub repo
  (0 stars/forks/issues; npm package unaffected, still `0.10.3`; agentic's v0.10.3 release
  intact). The 10 old releases (v0.2.0–v0.10.2) went with the repo — the accepted trade-off.
  Flipped the design doc Status to "migration complete".
- **Done:** Phases 0–5. Migration complete. One repo (`v1nvn/agentic`), four plugins, one
  marketplace, collection CI (`build.yml` + `build-skills.mjs`), `readability-mcp@0.10.3` live
  with provenance.
- **Not started:** nothing — the public collection design is fully done. The `TODO.md`
  "consistency in versioning" thread stays parked until taken up separately.
- **Active phase:** none (Phase 5 complete).
- **Next action:** none from this doc.
- **Blockers:** none. The legacy `read_url` MCP prompt was already retired in the old repo
  (`38ace8d fix: read url skill` deleted `src/prompts.ts` before the copy) — the read-url skill
  replaces it; nothing to retire here. The user's legacy `~/.claude/skills/{rm,md,zai}`
  (`@skills-dir`) still provide duplicate `rm:send`/`md:send`/`zai:usage`; removing them is the
  user's cutover call, not a migration step.

## Critical path — executed through the publish step

The npm sequence was the one step that could lose the ability to publish. All four steps are
done; the migration is complete.

1. ✅ Move the server + rewire workflows (Phase 1).
2. ✅ Rebind npm trusted publishing on npmjs.com from `v1nvn/readability-mcp` → `v1nvn/agentic`
   (Phase 2). A package has one publish source — this *moved* the ability; the old repo can no
   longer publish.
3. ✅ Verify a real provenance publish from `agentic`. Originally "push the 10 tags so the guard
   holds" — dropped: the guard is `gh release view` (release-based, release.yml:28), not
   tag-based, and the 10 tags point at commits absent from `agentic`. Bumping to 0.10.3 and
   publishing fresh is what verified the path. Result: `readability-mcp@0.10.3` live on npm with
   SLSA v1 provenance, GitHub Release v0.10.3 created, `npx` smoke test passes.
4. ✅ Delete the `readability-mcp` GitHub repo (Phase 5) — done post-verification. The npm
   package is unaffected by repo deletion (still `0.10.3`). The old repo's Releases
   (v0.2.0–v0.10.2) were not ported and are lost with it — accepted trade-off; the npm artifacts
   remain.

## Invariants to preserve

- **No fetch inside the readability server** — only the host shell's `curl` (per the read-url
  skill). The adapter references `npx -y readability-mcp`; the server is unchanged.
- **One author identity** across all four `plugin.json`s: `v1nvn` / `v1n@outlook.com`.
- **Four independent plugins, one marketplace** — never collapse into a mega-plugin. Each
  installs standalone (`/plugin install <name>`).
- **Marketplace manifest at repo root** `.claude-plugin/marketplace.json` — `marketplace add`
  reads only a root manifest (flattened layout, not nested under `agents/`).

## Source locations (verified 2026-08-12 / 2026-08-13)

- **readability server:** `~/git/readability-mcp/` → `agentic/readability-mcp/`
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
  readability-mcp/                  # readability MCP server → npm readability-mcp
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

### Phase 1 — Move the readability server into `readability-mcp/`  · done

- [x] Copy server source into `readability-mcp/`: `src/`, `test/`, `package.json`, `vite.config.ts`,
      `tsconfig.json`, `eslint.config.js`, `prettier.config.js`, `yarn.lock`, `Makefile`
- [x] Move schema-synced `README.md` → `readability-mcp/README.md`
- [x] Move `smithery.yaml` + `Dockerfile` into `readability-mcp/` — no path edits (context-relative)
- [x] Update `readability-mcp/package.json`: `repository.url` → `v1nvn/agentic`, `directory: "readability-mcp"`
- [x] Move the four workflows to `.github/workflows/`; `working-directory: readability-mcp` +
      `cache-dependency-path: readability-mcp/yarn.lock` per job
- [x] Verify `yarn install` + `typecheck` + `build` + `test` from `readability-mcp/` (495 tests green)
- [x] ~~Relocate design docs~~ — resolved: docs stay at repo-root `docs/design/` (repo-level, not server-specific)

### Phase 2 — Rebind npm publishing  · done

- [x] On npmjs.com, rebind trusted-publishing OIDC: `v1nvn/readability-mcp` → `v1nvn/agentic`
      + the new `release.yml` path (`id-token: write`)
- [x] ~~Push the 10 existing tags to `agentic`~~ — dropped: the release guard is `gh release
      view` (release-based, release.yml:28), not tag-based, and the 10 tags point at commits
      absent from `agentic`. Bump-and-publish verified the path instead. Old Releases
      (v0.2.0–v0.10.2) stay on the `readability-mcp` repo; lost on Phase 5 deletion (accepted).
- [x] Bump `readability-mcp/package.json` version (0.10.2 → 0.10.3); trigger `release.yml`;
      confirmed a real provenance publish (SLSA v1) — run 31674960388
- [x] Smoke-test `npx -y readability-mcp@0.10.3` installs the newly published version (MCP
      `initialize` returns `serverInfo.version 0.10.3`)

### Phase 3 — Collection layer + adapters  · done

- [x] Create `shared/bin/last-reply` (dedupe the rm + md copies)
- [x] Move `rm` → `plugins/rm/`; drop in the shared `bin/last-reply`
- [x] Move `md` → `plugins/md/`; drop in the shared `bin/last-reply`
- [x] Move `zai` → `plugins/zai/` (no `last-reply`)
- [x] Normalize author to `v1nvn` / `v1n@outlook.com` across all four `plugin.json`s
- [x] Create root `.claude-plugin/marketplace.json` (4 plugins, `source: ./plugins/<name>`)
- [x] Build the `readability` plugin at `plugins/readability/`: `.mcp.json`
      (`npx -y readability-mcp`) + `skills/read-url/SKILL.md`
- [x] Retire the legacy `read_url` MCP prompt (the skill replaces it) — already done in the old
      repo (`38ace8d` deleted `src/prompts.ts` before the copy); nothing to retire here
- [x] Confirm each hook's `bin` fallback resolves source-or-installed:
      `${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/bin` — present in all three
      hook `.sh` files
- [x] Locally verify all four plugins install independently (`marketplace add` + `install <name>`)
      — `claude plugin validate` passes on all 5 manifests; all 4 install + `details` resolves
      components; reverted after verifying

### Phase 4 — Collection CI  · done

- [x] Add `.github/workflows/build.yml`: validate plugin/marketplace manifests + identity-check
      that every plugin's `bin/last-reply` is byte-identical to `shared/bin/last-reply`
- [x] Add `build-skills.mjs` lint gate: walk `SKILL.md`, `node --check` referenced scripts
      (kept separate from the identity check)

### Phase 5 — Teardown  · done

- [x] Confirm `agentic` publishes cleanly and all four plugins install independently
- [x] Delete the `readability-mcp` GitHub repo (npm package unaffected, still `0.10.3`; the 10
      old releases v0.2.0–v0.10.2 were not ported and are lost with it)
- [x] Update the design doc Status line → "migration complete"

## Open questions

None. Doc location resolved 2026-08-13: design docs stay at repo-root `docs/design/` (they're
repo-level — marketplace + collection + migration — not server-specific). Decision 2 updated.
