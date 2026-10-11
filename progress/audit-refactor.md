# Audit — refactor

## Goal

The ruled restructure lands: core is the one home of shared source with
build-stamped island copies, readability's imports all point down, the panel key
carries the theme whole, an off-rung pick demotes in both renderers, and the two
MCP servers share core's kit. Behavior changes only where a ruling names it;
everything else is structure.

## Current state

Nothing landed. Rulings recorded 2026-10-09 — the sharing principle in
AGENTS.md (core is the one home; islands carry build-stamped copies, never
hand-synced mirrors), G5 parked in TODO.md's todo section. Anchors verified at
`5942e0a`; re-read before relying on them. `progress/audit-fixes-2.md` lands
first; this thread builds on its cleaned base.

## Next step

Wait for audit-fixes-2 to close, then run B1.

## Steps

| id | unit | model | review | close criteria |
|----|------|-------|--------|----------------|
| B1 | the stamp: shared source moves to core, build stamps island copies | | checklist | `yarn build` stamps byte-exact; a probed hand-edit of a stamped copy goes red; `claude plugin validate` + `plugin test` green on all four mods; zai pane output identical from the raw payload; rm carries no `@v1nvn/tokens` dependency |
| B2 | readability layers enforced | | | a pin test asserts nothing under `pipeline/` imports `../policy`; suite green; the AGENTS.md layer rule is true without editing it |
| B3 | statusline ruled changes: panel parity and the off-rung floor | | checklist | live `configure --theme rich` writes the theme's picks to the panel key and the agent row draws the theme's bar; live narrow-terminal probe: a gauge line falls to flat instead of overflowing; both golden sets regenerated |
| B4 | servers' shared kit into core; SDK transport | | | both suites green; `readability-dev` and `omlx-dev` hot-reload checked live; no `LoopbackTransport` remains |
| B5 | statusline internal dedup | sonnet | | panel uses the engine's layout parser — a bad item warns identically on both renderers; one pick-validation helper in `items.ts` serves engine, panel and argv; no `isObject` beside `isRecord`; `run()` replaced by core's `runMain` |
| B6 | todo rules sentence | sonnet | | rules states `references/` is created on first promotion; init unchanged; rules/init/README agree |

## Plan

- **B1 — the stamp (ruling: root a).** Move into core: `lineOf` (verbatim today
  in rm:11, md:16, zai:24, tokens:472 hooks modules), the pane `draw()` chrome
  (zai/tokens), the engine-test `World` glue (4 test files; the engine gate bars
  npm imports in tests too — probed 2026-10-09), and the formatting primitives
  (`packages/tokens/src/text.ts`). Root `yarn build` gains the stamp step: it
  writes committed copies into each home's `hooks/` and `tests/`, the same
  synced-artifact discipline as the bins, with a byte-guard test. The hand
  copies die; `tokens/types/index.d.ts` keeps only its `declare-module` block
  (import type from the island's src); zai's `--json` switches to the raw
  payload with its island rendering — parity with tokens; rm's `pad2` comes from
  core. **Breaking:** `@v1nvn/tokens`'s `/text` export is removed — the owner
  picks the semver step at release time, never silently.
- **B2 — layers (ruling: G1a).** Move `policy/math.ts`, the language tokens in
  `policy/resolver.js`, `policy/tables.ts` and `policy/footnotes.ts` down into
  `pipeline/`; `pipeline/context.ts` keeps local structural types for its three
  policy signals; `policy/presets.ts:1-5`'s twin becomes the pattern. The
  upward imports today: `pipeline/normalize.ts:1-2`, `pipeline/turndown.ts:4-7`,
  `pipeline/context.ts:1-3` (types).
- **B3 — ruled surfaces.** G2b: `configure.ts:479-487` drops the
  `--style=`-only filter — the panel key carries every theme pick, as the line
  key does; restore and status treat both keys alike; the "one decision" comment
  and its README line die. G3a: `engine.ts:174-186` — the `at === -1` guard
  becomes a floor (`at = 0`), so an off-rung pick (gauge) demotes in both
  renderers; `panel.ts:229-239` keeps its behavior, its comment now describes
  both.
- **B4 — servers' kit.** The dev-harness bodies (`readability/src/dev.ts:36-114`,
  `omlx/src/dev.ts:31-84`, ~85% identical) and the error kit (`describeError`
  byte-identical; the named-error class factory) move into
  `@v1nvn/agentic-core`, which both servers already import. Readability's three
  hand-rolled `LoopbackTransport` copies become the SDK's
  `InMemoryTransport.createLinkedPair()` (omlx's tests already use it). omlx's
  triple client wiring collapses. Per-server error wording stays per-server.
- **B5 — statusline dedup.** `panel.ts:184-193` `layoutGroups` regex shares the
  engine's parser (`render/layout.ts` `parseClusters` via `engine.ts:83-108`);
  the "alt not available → warn → default" triplication (engine.ts:63-79,
  panel.ts:136-154, render/argv.ts:76-88) becomes one helper in `items.ts`;
  `configure.ts:62` `isObject` → `render/jq.ts` `isRecord`; `index.ts:39-47`
  `run()` → core's `runMain`. Theme order already followed the THEMES record in
  the fixes thread.
- **B6 — todo sentence (ruling: G4b).** rules gains: `references/` is created on
  first promotion, not by init. No init change.
- Re-touched by design from the fixes thread: core's description (regains
  formatting, now true) and root README's island comment (rewritten for the
  stamp).
- One commit per unit; `plugin validate` + `plugin test` are the mod gates,
  `yarn test` the package gate, live CLI probes the surface gates.

## Design

- **root a (stamp)** over literal all-to-core: islands cannot import npm — the
  engine's loader and test gate both bar it — so a core-only move would leave
  dead copies; the stamp keeps one edit home and makes drift red. Rejected:
  keeping hand copies pinned by a test (drift caught only after the fact).
- **G1a (enforce)** over flipping the arrow (11 files would turn illegal at
  once) and over naming the cycle (the rule would die).
- **G2b (write every pick)** over style-only (rows would forever draw default
  item forms) and over today's silent support (a hand-added flag renders until
  the next configure erases it).
- **G3a (off-rung demotes)** over never-demotes (narrow rows overflow) and over
  the split (same name, opposite meaning).
- **G4b (first promotion)** over init creating `references/` (repos that never
  promote a fact would carry an empty directory; rules gains one sentence).
- G5 (rules living in a thread file) is parked pending the promotion-triage
  thread — see TODO.md's todo section.
