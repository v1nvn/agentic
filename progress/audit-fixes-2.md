# Audit — bug fixes

## Goal

Everything the 2026-10-09 audit found wrong today is repaired: subcommand `--help`
prints its own options and exits 0 on every shipped CLI, every README and manifest
claim matches the code, no dead identifier or stale comment remains, and tokens
names one quantity one way. Suite green throughout.

## Current state

Nothing landed. The findings below were verified against the code at `5942e0a`
by the audit sitting; re-read each anchor before relying on it. The companion
thread `progress/audit-refactor.md` carries the ruled restructure and lands after
this one closes.

## Next step

Run A1.

## Steps

| id | unit | model | review | close criteria |
|----|------|-------|--------|----------------|
| A1 | core `parseQuietly` stops replacing a caller's `exitOverride` | | | `statusline catalog --help`, `tokens usage --help`, `zai usage --help` each print that subcommand's own options and exit 0; md and rm `--help` exit 0; the three red statusline tests (`test/cli.test.ts` ×2, `test/status.test.ts` ×1) green |
| A2 | docs truth pass | sonnet | | every claim re-checked against code; grep over the repo finds no "six verbs" and no `statusline-lab` |
| A3 | dead code, stale comments, and the invisible bar track out | sonnet | | `yarn test` green after each deletion; grep for each removed identifier returns nothing; the flat bar's track renders as `·`; repo-wide `yarn lint` exits 0 |
| A4 | tokens naming consistency | | | one name for cache-write across report, panes and README; the 7-day window label matches statusline's; goldens regenerated |

## Plan

- **A1 direction.** `packages/core/src/cli.ts:8-17` — `quiet()` walks the command
  tree and calls `.exitOverride()` with no handler, replacing the
  `HelpRequested`-throwing override statusline installs per subcommand
  (`packages/statusline/src/cli.ts:40-51`). Core keeps per-command
  output-quieting and installs its throwing fallback only where no caller
  override exists (`_exitCallback === null`); the walk's
  `allowExcessArguments(false)` is dropped — commander 15 defaults it false, a
  verified no-op. Help is each caller's: md, rm, tokens and zai install their
  own help-aware override at their parseQuietly call sites, printing their own
  help to stdout and exiting 0 (statusline's pattern); genuine parse errors keep
  the usage-to-stderr, exit-1 path. The broken surface shipped through
  v0.38 → v0.41.1.
- **A2 inventory** (each wrong today; fix the doc, not the code, unless the code
  is what's wrong):
  - `packages/core/package.json:4` — description claims fixed-width formatting;
    core carries none. Delete the false claim (the refactor thread restores it
    truthfully when the stamp lands).
  - `packages/tokens/README.md:84` — exec contract says `--json`; the CLI demands
    `usage --json` (`src/cli.ts` registers the subcommand). Modules table omits
    `src/top.ts` and `src/cli.ts`.
  - `packages/tokens/.claude-plugin/plugin.json:4` — description predates
    `/tokens-top`.
  - root `README.md:151-155` — island comment omits `top.ts` and `scan.ts`.
  - readability `package.json` engines `>=22.22.2` vs omlx `>=22` vs its own
    README "Requires Node >= 22" — establish why the pin is tight before relaxing;
    align all three either way.
  - readability README extract options table omits `cache` (schema default
    false; documented only in §Resources).
  - statusline README modules table omits `src/render/layout.ts` and
    `src/render/jq.ts`; README:41, root README:92 and SKILL.md:56 promise "a
    layout item nothing picks is an error naming it" — no code can produce it
    (`validateSelection` only errors on unknown item/variant); SKILL sample
    output shows version 0.30.8.
  - `.gitignore:10` — dead `packages/statusline-lab/assets/runtime/` line.
  - `types/claude-code.d.ts` — one engine update stale (2.1.287 vs 2.1.292 in
    `packages/tokens/.claude-plugin/types/`); regenerate per AGENTS.md.
  - `.claude-plugin/marketplace.json` statusline description frames the plugin
    as a renderer; its surfaces say show/preview/set/revert.
  - todo "six verbs" in `packages/todo/.claude-plugin/plugin.json:4`,
    `.claude-plugin/marketplace.json:63`, root `README.md:18` — seven exist;
    `postmortem` missing. `skills/rules/SKILL.md:63` Steps header omits the
    `consult` column that rules:72 and `skills/run/SKILL.md:80-82` define.
  - theme listing order differs across catalog, wizard, CLI help and README —
    follow the THEMES record order (`src/themes.ts:21`).
  - `packages/md/hooks/register.ts:29` — fallback label reads "send failed",
    rm's vocabulary; md's is share/status.
  - `packages/md/src/share.ts:10` + root README:51 — `MD_NO_OPEN=1` phrasing;
    any value skips the open (`src/share.ts:79`).
- **A3 inventory**: core `levelEnabled` (`src/logger.ts:11`, re-exported);
  tokens `TopMeasure.at`/`.model` and `TopUsage.cacheWrite` (populated, never
  read), `[plain(...)].slice(0,1)` (`src/top.ts:263-270`), rate ring collects
  120/24 samples while `sparkField` reads 16/5 (`src/top.ts:4-5` vs
  `hooks/register.tsx:37-38`), `spawnAge` called twice per row
  (`src/top.ts:368-370`), `reportLines` recomputed per render
  (`hooks/register.tsx:246-255`); tokens `src/aggregate.ts:1-4` header describes
  a removed `$.fs` walk; statusline `test/engine-corpus.test.ts:16` cites
  deleted `subagent.sh`; statusline's own `quiet()` still carries a dead
  `allowExcessArguments(false)` (commander 15 defaults false), and tokens'
  `src/top.ts` carries the run's 6 lint errors (func-style at the `plain()` /
  `.slice(0,1)` block, non-null at `spawnAge`) — both ride the items above;
  statusline `render/segments.ts:308` paints the flat
  bar's track with `░` — a shade glyph that draws as nothing on this terminal,
  so the track is invisible (tokens hit the same choice and used `·`,
  `text.ts:122`; the invariant is AGENTS.md's shade-glyph rule). One-glyph fix;
  engine-corpus goldens regenerate.
- **A4**: cache-write answers to `cacheCreation` (`src/aggregate.ts:14`),
  `cacheWrite` (`src/top.ts:59`), label `created` (`src/format.ts:71-72`) and
  `cache-write` (README:40) — pick one (README's `cache-write`) and rescope
  everywhere in the same change; the 7-day window is `week` in tokens
  (`src/top.ts:197-205`) vs `7d` in statusline (`src/render/payload.ts:75-76`).
- Anchor drift: every `file:line` above was verified at `5942e0a`; re-read
  before editing.
- **Run mechanics.** One branch `audit-fixes` off main, one PR at the end, its
  base named explicitly. Full gate — root `yarn build && yarn typecheck && yarn
  lint && yarn test` — fires once per unit immediately before its commit (A2
  included: it moves engines fields, `.gitignore` and the vendored types).
  Live-CLI close checks run on built dist: `node packages/statusline/dist/index.js
  catalog --help`, `node packages/tokens/dist/index.js usage --help`,
  `node packages/zai/dist/index.js usage --help`,
  `node packages/md/dist/index.js --help`, `node packages/rm/dist/index.js --help`.
- **Enforcement inventory.** `yarn test` green throughout; launch baseline 362
  passed / 3 failed, the failures exactly A1's three named reds and no others.
  `yarn lint` baseline: 6 errors, all in tokens `src/top.ts`, none of A1's
  making — A3's close erases them. statusline `test/cli.test.ts` and
  `test/status.test.ts` land byte-for-byte untouched — the reds turn green by
  the fix, never by an edit. A touched file's comment-line count never rises.
  A2's close greps ("six verbs", `statusline-lab`) and A3's per-identifier
  greps run repo-wide from the root.

## Design

No design: repairs only. The sitting's rulings — the bug-fix/refactor split, the
promotion-strictness principle — are recorded in AGENTS.md and TODO.md; the
ruled restructure lives in `progress/audit-refactor.md`.
