# Name unification — plugin + package statusline-lab → statusline

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** executed live in-session 2026-09-23 (no run-plan dispatch) · grain: one
commit for the rename, one for the release bump · owner-gated: the npm bootstrap
(real-TTY publish + trust of the never-published `@v1nvn/statusline`) and the
push after it.

**Goal.** One identity everywhere: plugin `statusline` (menu display
`statusline:lab`), skill segment `lab` (bare invocation `/lab`), npm package
`@v1nvn/statusline`, dirs `packages/statusline` + `plugins/statusline`, data dir
`statusline-agentic`, cache glob `cache/agentic/statusline/*/`. Zero installs —
the old name dies whole, no deprecation surface in-repo (the npm name gets a
deprecate pointer only because npm names never free).

## Steps

| # | Step | Verify |
|---|------|--------|
| 1 | git mv both dirs; ordered string passes (`@v1nvn/`, `@agentic`, paths, glob, data dir, bare-name → `/lab`); hand-fixes: SKILL `name: lab`, CLAUDE.md display + collision clause; env prefix `STATUSLINE_LAB_*` stays (matches the `lab` segment, never surfaces) | `git grep statusline-lab` empty in scope; 190 tests; lint/typecheck/validate green |
| 2 | `set-version.mjs 0.22.0`; owner bootstrap: hand-publish `@v1nvn/statusline@0.22.0` from a real TTY + `npm trust`; then push; deprecate `@v1nvn/statusline-lab@*`; reinstall plugin locally as `statusline@agentic` | release.yml green; `/lab` fires after reload |

Close: steps 1–2 verified → TODO line deleted, this file archived.

## Log

- 2026-09-23 — opened after the owner ruled the display must read
  `/statusline:lab` and the npm package renames too; zero-install breaking
  ruling added to CLAUDE.md Philosophy. Renamed in one pass; tests green
  (goldens re-pinned by the same pass — key template now globs
  `cache/agentic/statusline/*/`).
