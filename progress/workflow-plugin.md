# Workflow plugin — session-craft skills as plugin 7

**Goal.** Ship the three session-craft skills — `explain`, `handoff`, `run-plan` —
as a seventh manifest-only plugin, so they are tracked, versioned and distributed
by this marketplace instead of living loose in `~/.claude/skills/`. No package,
no hooks, no commands: three markdown files move.

## Settled — do not relitigate

- `context7-mcp` stays loose in `~/.claude/skills/`. Its MCP server arrives via
  context7's own distribution; not ours to repackage. `hinglish` stays loose
  too (2026-09-17) — persona mode, not session craft.
- Skills move, never copy. The three loose dirs are deleted only after the
  plugin is installed and the skills verified live (one-way rule).
- Manifest-only plugin, `readability` is the precedent for skills under
  `plugins/`. Rides the next minor train (0.19.0 unless main has moved).
- `set-version.mjs` mirrors and build.yml's validate loop discover by glob
  (`packages/*/package.json`, `plugins/*/.claude-plugin/plugin.json`,
  `plugins/*/.mcp.json`, `plugins/*/hooks/hooks.json`) — a plugin joining the
  tree is on the train and in CI with zero script edits. Rules unchanged:
  every discovered manifest carries the repo version; every discovered config
  carries at least one `@v1nvn/<pkg>@<version>` pin riding it.

## Sources — read whole before starting

- `/Users/vineet/.claude/skills/explain/SKILL.md`
- `/Users/vineet/.claude/skills/handoff/SKILL.md`
- `/Users/vineet/.claude/skills/run-plan/SKILL.md`
- Repo: `CLAUDE.md`, `README.md`, `.claude-plugin/marketplace.json`,
  `plugins/readability/` (skills precedent), `.github/workflows/build.yml`,
  `.github/scripts/set-version.mjs`

## Units

1. **Plugin dir** — `plugins/workflow/.claude-plugin/plugin.json` (name
   `workflow`, one-line description, author `v1nvn` / `v1n@outlook.com`,
   version 0.0.0 — a deliberate mismatch, so unit 2's glob close goes red
   naming this manifest; unit 3's bump turns it green) +
   `plugins/workflow/skills/{explain,handoff,run-plan}/SKILL.md` copied
   verbatim. Close: `claude plugin validate
   plugins/workflow/.claude-plugin/plugin.json` passes and
   `node .github/scripts/build-skills.mjs` passes (it globs `plugins/`, no
   list to edit).
2. **Dynamic train + CI discovery** — rewrite `set-version.mjs` to glob instead
   of list: mirrors `packages/*/package.json` +
   `plugins/*/.claude-plugin/plugin.json`, pinned configs `plugins/*/.mcp.json`
   + `plugins/*/hooks/hooks.json`, sorted for deterministic output; rewrite and
   check semantics unchanged. Same stroke, build.yml: the validate loop becomes
   `for m in plugins/*/.claude-plugin/plugin.json`. Close:
   `node .github/scripts/set-version.mjs --check` fails naming
   `plugins/workflow/.claude-plugin/plugin.json` — red on purpose, the unit 3
   bump turns it green; `grep "readability omlx" .github/workflows/build.yml`
   finds nothing.
3. **Marketplace + train + docs** — add the plugin entry (name `workflow`,
   source `./plugins/workflow`, category `productivity`, one-line description);
   bump the train 0.18.0 → 0.19.0 with `set-version.mjs`. Rewrite every count
   and shape sentence: `marketplace.json` description (count + enumeration),
   `README.md` (opener count, plugin-table row, install comment, layout tree —
   workflow is a third shape: `skills/` + `plugin.json`, nothing pinned),
   `CLAUDE.md` (header enumeration and count, Layout's plugin-dir-holds
   sentence gains `skills/`, "Six independent plugins" bullet). Close:
   `set-version.mjs --check` passes; `grep -in six README.md CLAUDE.md
   .claude-plugin/marketplace.json` returns nothing.
4. **Ship** — one-line commit `feat(workflow): ship explain, handoff, run-plan
   session skills`, push, confirm release.yml cut v0.19.0 (`gh release view`).
5. **Adopt + delete loose** — add `"workflow@agentic": true` to `enabledPlugins`
   in `~/.claude/settings.json`, restart Claude Code, confirm the skills load
   (listed as `workflow:explain` …), then delete
   `/Users/vineet/.claude/skills/explain`, `…/handoff`, `…/run-plan`. Close: a
   fresh session offers the three `workflow:*` skills and the loose dirs no
   longer exist.

## Open decisions

None. Category `productivity` matches md/rm/zai/tokens.

**Log.**
- 2026-09-12 — plan seeded from the `~/.claude` conversion session. Same day,
  the plugin auto-update jam was fixed at the root (`DISABLE_AUTOUPDATER` +
  legacy `autoUpdates` keys deleted; background pass verified end-to-end, eight
  plugins moved 0.15.0 → 0.18.0 within ~10 min of session start), so
  distribution rides the proven pipeline — no extra mechanism needed.
- 2026-09-13 — review folded in: mirrors and the CI validate loop discover by
  glob (no list to forget — the workflow mirror was the near-miss); doc
  rewrite covers every count and shape surface (README table, tree, install
  line); close grep scoped to the three files so it can actually go quiet.
- 2026-09-17 — review against the tree: every anchor held (set-version and
  the validate loop are lists, build-skills globs, the three skills carry
  frontmatter and no `node scripts/` refs). One fix: unit 1 seeds the
  manifest at 0.0.0 — the unit 2 red close was inert while repo and manifest
  both sat at 0.18.0. `hinglish` settled loose.
