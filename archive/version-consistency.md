# Consistency in versioning

**Goal.** One version for the repo; no package carrying its own.

**Decision (landed 2026-08-31, commits ccdbd22 · 73887b0 · d430542).**
Lockstep release train, monorepo-style:

- The repo version lives in `.claude-plugin/marketplace.json` — bumping it is the release act.
- Four mirrors must equal it: `readability-mcp/package.json`, `omlx-mcp/package.json`,
  `plugins/readability/.claude-plugin/plugin.json`, `plugins/omlx/.claude-plugin/plugin.json`.
  `build.yml` fails on drift.
- `release.yml` publishes every MCP package on the repo version, cuts one GitHub release
  `v<repo-version>`. Per-package skip when that exact version is already on npm → re-runs are safe.
- First train: `v0.11.0` (readability's next minor past 0.10.3; omlx-mcp's first release).

**Log.**
- 2026-08-31 — scoped on pickup during the omlx publish work: five files, five versions by hand
  (0.10.3 ×2, 0.2.0, 0.1.0 ×2). Lockstep chosen over per-package versions.
- 2026-08-31 — npx entries in both plugin `.mcp.json` files pinned to `@latest` so installed
  plugins stop riding a cached package version.
