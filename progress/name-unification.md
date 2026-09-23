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
| 1 | git mv both dirs; ordered string passes (`@v1nvn/`, `@agentic`, paths, glob, data dir, bare-name → `/lab`); hand-fixes: SKILL `name: lab`, CLAUDE.md display + collision clause; env prefix `STATUSLINE_LAB_*` stays (matches the `lab` segment, never surfaces) | `git grep statusline-lab` empty in scope; lint/typecheck/validate green |
| 2 | `set-version.mjs 0.22.0`; owner bootstrap: hand-publish `@v1nvn/statusline@0.22.0` from a real TTY + `npm trust`; then push; delete `@v1nvn/statusline-lab` from npm (owner overruled deprecate); reinstall plugin locally as `statusline@agentic` | release.yml green; `/lab` fires after reload |
| 3 | `set-version.mjs` pins every `npx -y @v1nvn/*` line in the 12 `.md` surfaces (check mode fails unpinned/stale); wizard retry hint pins to the running CLI's own version | `--check` green; 190 tests; 0.23.0 release green |

Close: steps 1–2 verified → TODO line deleted, this file archived.

## Log

- 2026-09-23 — opened after the owner ruled the display must read
  `/statusline:lab` and the npm package renames too; zero-install breaking
  ruling added to CLAUDE.md Philosophy. Renamed in one pass; tests green
  (goldens re-pinned by the same pass — key template now globs
  `cache/agentic/statusline/*/`).
- 2026-09-23 — two seam lessons from step 1 surfaced by step 3's gate: the
  bare-name perl rule (`/statusline-lab` → `/lab`) also rewrote three
  `toThrowError(/statusline-lab/)` regex literals to `/lab/` — red tests
  shipped inside the rename commit because the gate piped vitest through
  `tail`, swallowing the exit code. Gates now check exit codes explicitly;
  string passes over code must exclude regex-literal contexts. Step 3
  (owner-spotted): unpinned `npx -y @v1nvn/statusline` resolves "latest"
  through the npx cache — stale CLI against a fresh plugin. All 12 md
  surfaces now ride the train; owner's npm deletion of the old name
  (unpublish within 72h + support for 0.19.0) handed off, outcome pending.
