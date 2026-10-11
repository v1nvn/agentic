# Audit — refactor

## Goal

The ruled restructure lands: core is the one home of shared source; islands carry
build-stamped copies, never hand-synced mirrors; the drawing model — glyphs, ink
kinds, documents, the one skin that emits escape bytes — is shared; a mod's hooks
module is thin over stamped helpers and the engine's own `on()` contract;
readability's imports all point down; the panel key carries the theme whole; an
off-rung pick demotes in both renderers; the servers and CLIs share core's kit.
Behavior changes only where a ruling names it; everything else is structure.

## Current state

Nothing landed. Rulings recorded: the sharing principle (AGENTS.md —
core is the one home; stamped copies, never hand-synced mirrors); the drawing
home and ink-as-data; the interface patterns, each on the test that it owns a
bug class this repo hit; the mod shape after blind review — a stamped helper
kit, not a runtime, with `on()` kept as the engine's contract for event-fed
state; G5 parked in TODO.md. The design passed one adversarial blind review:
its two blockers (tokens-top's event feed; validator feasibility)
shaped B1/B8 below. Anchors verified at `5942e0a`; re-read before relying on
them. It builds on the cleaned base `archive/audit-fixes-2.md` landed, so the
B-units' register.tsx anchors have drifted.

## Next step

Probe the validator question on a scratch branch: move one `on()` call from a
mod's register into a plugin-relative sibling file, run `claude plugin
validate` + `plugin test`. This gates B1's stamp design.

## Steps

| id  | unit                                        | model      | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------- | ---------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | the drawing kit and the stamp, proven on rm |            |        |         | kit exports branded `Line`/`Doc`, closed ink kinds with parametric constructors, glyphs, layout constants, one parameterized local date-time formatter; `yarn build` stamps `.ts` source copies byte-exact from a manifest; a probed hand-edit, an orphaned stamp and a foreign-stamp import all go red; rm's `lineOf` and `pad2` come from the kit; core's package.json description states the stamp truthfully; rm's suite and gates green                                                                                                                           |
| B8  | the mod kit across the four homes           |            |        |         | `lineOf`, the exec/accept/parse door, pane chrome (frame, empty, refresh as fields), refresh-while-open and tick cleanup are stamped helpers in all four homes; command registration is declarative for the exec shape; event-fed state stays `on()` with reducers feeding pane renders; every hooks module is thin over the kit — no hand-rolled copy of what the kit owns; `plugin validate` + `plugin test` ×4 green; references/mods.md rewritten to the stamp; engine tests ride the stamped helpers |
| B9  | statusline onto the kit                     |            |        |         | `SEGMENTS` returns documents; `toSgr` is the only escape emitter — no SGR literal outside the kit (grep); themes compute special colors through the kit's parametric ink constructors; both golden sets regenerated                                                                                                                                                                                                                                                                                       |
| B10 | zai raw door and the `/text` break          |            |        |         | zai's `--json` ships the raw payload, its island renders it — one exec-accept-render door with tokens; rm and zai carry no `@v1nvn/tokens` dependency; `@v1nvn/tokens`'s `/text` export removed (semver step is the owner's call, never silent)                                                                                                                                                                                                                                                           |
| B2  | readability layers enforced                 |            |        |         | math, tables, footnotes and resolver's class list + derived language tokens move down together — policy imports downward, legal; a pin test asserts nothing under `pipeline/` imports `../policy`; suite green; the AGENTS.md layer rule is true without editing it                                                                                                                                                                                                                                       |
| B3  | statusline ruled changes                    |            |        |         | live `configure --theme rich` writes the theme's picks to the panel key and the agent row draws the theme's bar; live narrow-terminal probe: a gauge line falls to flat; the engine's demote guard is deleted outright — `indexOf` −1 reads as before-rung-0, matching the panel exactly; both golden sets regenerated                                                                                                                                                                                    |
| B4  | the servers' kit and handler wrapper        |            |        |         | both suites green; one handler wrapper (try/catch + log + schema-parse + defaults) serves every tool — readability's 12× try/catch, 9× unpack, 6× defaults blocks and omlx's `.catch()` twins gone; `registerTool` call sites, output schemas and capability gating stay per-server; dev-harness, error kit, `loggerFromEnv`, a server vite variant live in core; no `LoopbackTransport` remains                                                                                                          |
| B5  | statusline internal dedup                   | sonnet/low |        |         | panel shares the engine's layout parser: parse with the full known set (an unknown item warns once), then filter to task items; one pick-validation helper in `items.ts`; `isObject` → `isRecord`; `index.ts:23-30` `run()` → core's `runMain`                                                                                                                                                                                                                                                            |
| B6  | todo rules sentence                         | sonnet/low |        |         | rules states `references/` is created on first promotion; init unchanged; rules/init/README agree                                                                                                                                                                                                                                                                                                                                                                                                         |
| B7  | the CLI kit                                 |            |        |         | all six CLIs declare commands and import no commander; `runCli` supports options-as-data and a help-payload hook (statusline's recover protocol, dynamic per-item options, TTY wizard dispatch all expressible); help exits 0 and routes to the subcommand on every CLI, live-probed ×6; A1's minimal fix deleted in this change                                                                                                                                                                          |

## Plan

- **Sequencing.** B1 → B8 → B9 → B10, then B2 → B3 → B4 → B5 → B6 → B7 in any
  order that keeps one commit per unit; B3 lands after B9 so statusline goldens
  regenerate once per concern.
- **B1 — the drawing kit.** `core/src/draw.ts`: `Segment`, branded
  `Line`/`Doc` (nominal — the brand is structural, not sanitizing: segment text
  can carry bytes, and the no-SGR-outside-the-skin criterion stays grep-backed);
  the `Ink` kind union closed (`plain`, `dim`, `bold`, `green`, …) plus
  parametric constructors (`rgb`, `indexed`, `bg`) — exhaustiveness applies to
  kinds (`assertNever` in every skin), color values are data, so statusline's
  heat gradient and pills are values, not union members; tag functions;
  `meter`/`bar`/`pad`/`clip`/`spark` on solid blocks and visible tracks; label
  gutter and `RULE_WIDTH` constants; one local date-time formatter with
  precision parameters (today four shapes: rm `send.ts:16-17` display title,
  zai `usage.ts:59-61` URL-query seconds, tokens `ymd`, statusline duration
  (`awk.ts:49` `pad2`) — unified as one function, not one format).
- **B1 — the stamp.** Root `yarn build` writes committed `.ts` copies into each
  home's `hooks/` and `tests/` from a manifest. The guard is a core vitest spec
  (it may read across the repo): manifest entries byte-equal, no orphaned stamp
  (core stops emitting → copy must go), no home imports another home's stamp.
  Core source must satisfy tsconfig.mods.json (`noUncheckedIndexedAccess`,
  explicit-`.js` imports) and pass eslint/prettier as the copies will ship
  them. Live-CLI probes reinstall the plugin first (a cached pre-stamp install
  runs old hooks).
- **B8 — the mod kit.** Stamped helpers own the cited bug classes: `lineOf`
  (rm:11, md:16, zai:24, tokens:472), the exec/accept/parse door (kills the
  zai/tokens contract divergence), pane chrome with frame/empty/refresh as
  fields (kills framed-vs-frameless and frozen-zai-pane drift),
  refresh-while-open, tick cleanup (kills `topTick`'s inconsistent maps).
  Command registration is declarative for the exec shape; **event-fed state
  stays raw `on()`** — the engine's own declarative API (seven events feed
  tokens-top, `register.tsx:304-469`) — with reducers feeding pane renders.
  The kit never stamps a home's reducers into other islands. Engine tests ride
  the stamped helpers; the World glue dies. `exec`'s wrapper/field name
  collision is resolved in the descriptor naming.
- **B9 — statusline onto the kit.** The `SEGMENTS` registry returns documents;
  the engine and panel emit through `toSgr` at the final door; `${RESET}`
  chains (`segments.ts:341`) and `panel.ts:299`'s strip-at-the-end NO_COLOR
  hack die; themes keep choosing inks per item and compute specials through
  the parametric constructors. `dotMeter`/`meterSegs` collapse into `meter`
  (zai/format.ts:565,580,593; tokens/top.ts:259).
- **B10 — one door, one break.** zai's `--json` goes raw with its island
  rendering; the hand-synced `.d.ts` mirrors die (`tokens/types/index.d.ts`
  keeps only its `declare-module` block); rm's `pad2` from core; `/text`
  export removed.
- **B4 — wrapper, not registry.** The blind review showed a tool registry must
  learn output schemas, capability gating and the resources family — surface,
  not structure. The handler wrapper alone owns the error-drift class.
  Dev-harness (`readability/src/dev.ts:36-114`, `omlx/src/dev.ts:31-84`),
  error kit, `loggerFromEnv`, server vite variant, SDK transport
  (`InMemoryTransport.createLinkedPair()`) as before.
- **B7 — runCli.** Owns commander: help exits 0, subcommand help routes, quiet
  output. Homes declare commands; options may be generated from data;
  a help-payload hook replaces statusline's `HelpRequested` protocol
  (`cli.ts:34-51`). `parseQuietly`/`printUsageAndExit` retire unless core
  itself uses them.
- **Overlap with the fixes thread:** A3 already deletes the per-render
  `reportLines` recompute and swaps the `░` track; B8's register rewrites ride
  those landed shapes, and this file's register.tsx anchors will have drifted.
- **Docs made true here:** references/mods.md rewritten to the stamp in B8;
  AGENTS.md's stamp sentence becomes fact when B1 lands (until then it is the
  standing rule for new work, and A2 treats it as rule, not claim).

## Design

- **root a (stamp)** over literal all-to-core: islands cannot import npm —
  engine loader and test gate both bar it (probed) — so a core-only
  move leaves dead copies; the stamp keeps one edit home and makes drift red.
- **Drawing home** (core owns the glyphs; a surface owns its layout) over moving
  the whole statusline renderer: the theme machinery has one consumer, and core
  would become a monolith every CLI depends on. Labels stay per-surface: the
  kit draws, it doesn't word.
- **Ink as data** (documents + one `toSgr` skin) over a fluent builder
  (imperative, reset-by-memory, bigger surface), a template grammar (a second
  grammar for what a list expresses), and centralized SGR constants (kills the
  duplication, keeps the footgun). Ink _kinds_ are closed and exhaustive;
  color _values_ are data — statusline's computed palette is values, not
  members.
- **Helpers over frameworks** (blind review): the mod kit owns concrete helpers
  with hit bug classes; it does not absorb event reducers (dead code in three
  islands) and does not grow a generic event API (`on()` with extra steps).
  `on()` is the engine's contract for event-fed state, not an escape hatch;
  what is barred is a hand-rolled copy of anything the kit owns.
- **Wrapper over registry** (blind review): `defineTool`/`serveTools` would
  need output schemas, gating, resources — three concepts to delete twelve
  try/catch blocks. The wrapper deletes the same blocks and adds none.
- **G1a (enforce the layer arrow)** over flipping (11 files turn illegal) and
  naming the cycle (the rule dies). The class list and its derived tokens move
  together; policy's resulting import is downward, legal.
- **G2b (write every pick)** over style-only (rows forever draw default forms)
  and today's silent support (a hand-added flag renders until configure
  erases it). **G3a (off-rung demotes)** over never (narrow rows overflow) and
  the split (same name, opposite meaning) — implemented by deleting the guard,
  matching the panel exactly.
- **G4b (first promotion)** over init creating `references/` (empty dirs in
  repos that never promote; rules gains one sentence).
- **Interface test, stated once:** an interface that cannot name a bug class
  this repo hit is surface, not structure, and does not get built.
- G5 (rules living in a thread file) is parked pending the promotion-triage
  thread — see TODO.md's todo section.
