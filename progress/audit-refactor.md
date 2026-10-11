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

Nothing landed. The run is open on branch `audit-refactor`: the validator
probe cleared — rm's `session.start` `on()` relocated to a plugin-relative
sibling passed `claude plugin validate` and `plugin test` both (record in the
B0 clerk scratch) — and the launch workspace gate is green, 0 fail (baselines
in the enforcement inventory). Rulings recorded: the sharing
principle (AGENTS.md — core is the one home; stamped copies, never hand-synced
mirrors); the drawing home and ink-as-data; the interface patterns, each on
the test that it owns a bug class this repo hit; the mod shape after blind
review — a stamped helper kit, not a runtime, with `on()` kept as the engine's
contract for event-fed state; G5 parked in TODO.md. The design passed one
adversarial blind review: its two blockers (tokens-top's event feed; validator
feasibility) shaped B1/B8 below. Every Plan-section anchor re-verified against
`304cba6` at B0 close; re-read before relying on them after further landings.

## Next step

B1 — the drawing kit and the stamp, proven on rm.

## Steps

| id  | unit                                        | model      | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------- | ---------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B0  | harden the plan                             |            |        |         | probe verdict and launch baselines folded in; every Plan-section anchor re-verified against the tree; tactical map with per-row scoped gate lines; enforcement inventory (byte-frozen tests, forbidden idioms, never-rising counts) carrying the launch baselines; small-row line; line ceiling; run mechanics (gate line, live-probe protocol, ritual-record home, PR grouping); stop rules; audit list; open questions dated to their units |
| B1  | the drawing kit and the stamp, proven on rm |            |        |         | kit exports branded `Line`/`Doc`, closed ink kinds with parametric constructors, glyphs, layout constants, one parameterized local date-time formatter; `yarn build` stamps `.ts` source copies byte-exact from a manifest; a probed hand-edit, an orphaned stamp and a foreign-stamp import all go red; rm's `lineOf` and `pad2` come from the kit; core's package.json description states the stamp truthfully; rm's suite and gates green                                                                                                                           |
| B8  | the mod kit across the four homes           |            |        |         | `lineOf`, the exec/accept/parse door, pane chrome (frame, empty, refresh as fields), refresh-while-open and tick cleanup are stamped helpers in all four homes; command registration is declarative for the exec shape; event-fed state stays `on()` with reducers feeding pane renders; every hooks module is thin over the kit — no hand-rolled copy of what the kit owns; `plugin validate` + `plugin test` ×4 green; references/mods.md rewritten to the stamp; engine tests ride the stamped helpers |
| B9  | statusline onto the kit                     |            |        |         | `SEGMENTS` returns documents; `toSgr` is the only escape emitter — no SGR literal outside the kit (grep); themes compute special colors through the kit's parametric ink constructors; both golden sets regenerated                                                                                                                                                       |
| B10 | zai raw door and the `/text` break          |            |        |         | zai's `--json` ships the raw payload, its island renders it — one exec-accept-render door with tokens; rm and zai carry no `@v1nvn/tokens` dependency; `@v1nvn/tokens`'s `/text` export removed (semver step is the owner's call, never silent)                                                                                                                                                                                                                                                           |
| B2  | readability layers enforced                 |            |        |         | math, tables, footnotes and resolver's class list + derived language tokens move down together — policy imports downward, legal; a pin test asserts nothing under `pipeline/` imports `../policy`; suite green; the AGENTS.md layer rule is true without editing it                                                                                                                                                                                                                                       |
| B3  | statusline ruled changes                    |            |        |         | live `configure --theme rich` writes the theme's picks to the panel key and the agent row draws the theme's bar; live narrow-terminal probe: a gauge line falls to flat; the engine's demote guard is deleted outright — `indexOf` −1 reads as before-rung-0, matching the panel exactly; both golden sets regenerated                                                                                                                                                                                    |
| B4  | the servers' kit and handler wrapper        |            |        |         | both suites green; one handler wrapper (try/catch + log + schema-parse + defaults) serves every tool — readability's 12× try/catch, 9× unpack, 6× defaults blocks and omlx's `.catch()` twins gone; `registerTool` call sites, output schemas and capability gating stay per-server; dev-harness, error kit, `loggerFromEnv`, a server vite variant live in core; no `LoopbackTransport` remains                                                                                                          |
| B5  | statusline internal dedup                   | sonnet/low |        |         | panel shares the engine's layout parser: parse with the full known set (an unknown item warns once), then filter to task items; one pick-validation helper in `items.ts`; `isObject` → `isRecord`; `index.ts:23-30` `run()` → core's `runMain`                                                                                                                                                                                                                                                            |
| B6  | todo rules sentence                         | sonnet/low |        |         | rules states `references/` is created on first promotion; init unchanged; rules/init/README agree                                                                                                                                                                                                                                                                                                                                                                                                         |
| B7  | the CLI kit                                 |            |        |         | all six CLIs declare commands and import no commander; `runCli` supports options-as-data and a help-payload hook (statusline's recover protocol, dynamic per-item options, TTY wizard dispatch all expressible); help exits 0 and routes to the subcommand on every CLI, live-probed ×6; A1's minimal fix deleted in this change                                                                                                                                                                          |

## Plan

- **Sequencing.** B0 → B1 → B8 → B9 → B10, then B2 → B3 → B4 → B5 → B6 → B7 in any
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
  zai `usage.ts:59-61` URL-query seconds, tokens `ymd` (`src/text.ts:65`),
  statusline duration (`awk.ts:49` `pad2`) — unified as one function, not one
  format).
- **B1 — the stamp.** Root `yarn build` writes committed `.ts` copies into each
  home's `hooks/` and `tests/` from a manifest. The guard is a core vitest spec
  (it may read across the repo): manifest entries byte-equal, no orphaned stamp
  (core stops emitting → copy must go), no home imports another home's stamp.
  Core source must satisfy tsconfig.mods.json (`noUncheckedIndexedAccess`,
  explicit-`.js` imports) and pass eslint/prettier as the copies will ship
  them. Live-CLI probes reinstall the plugin first (a cached pre-stamp install
  runs old hooks).
- **B8 — the mod kit.** Stamped helpers own the cited bug classes: `lineOf`
  (rm `hooks/register.ts:11`, md `hooks/register.ts:16`, zai
  `hooks/register.tsx:24`, tokens `hooks/register.tsx:470`), the
  exec/accept/parse door (kills the zai/tokens contract divergence), pane
  chrome with frame/empty/refresh as fields (kills framed-vs-frameless and
  frozen-zai-pane drift), refresh-while-open, tick cleanup (kills `topTick`'s
  inconsistent maps, `tokens/hooks/register.tsx:150`). Command registration is
  declarative for the exec shape; **event-fed state stays raw `on()`** — the
  engine's own declarative API (eight events feed tokens-top,
  `register.tsx:305-451`) — with reducers feeding pane renders. The kit never
  stamps a home's reducers into other islands. Engine tests ride the stamped
  helpers; the World glue dies. `exec`'s wrapper/field name collision is
  resolved in the descriptor naming.
- **B9 — statusline onto the kit.** The `SEGMENTS` registry returns documents;
  the engine and panel emit through `toSgr` at the final door; `${RESET}`
  chains (`segments.ts:341`) and `panel.ts:299`'s strip-at-the-end NO_COLOR
  hack die; themes keep choosing inks per item and compute specials through
  the parametric constructors. `dotMeter`/`meterSegs` collapse into `meter`
  (zai `format.ts:565,580,593`; tokens `top.ts:256,291`).
- **B10 — one door, one break.** zai's `--json` goes raw with its island
  rendering; the hand-synced `.d.ts` mirrors die (`tokens/types/index.d.ts`
  keeps only its `declare-module` block); rm's `pad2` from core; `/text`
  export removed.
- **B4 — wrapper, not registry.** The blind review showed a tool registry must
  learn output schemas, capability gating and the resources family — surface,
  not structure. The handler wrapper alone owns the error-drift class.
  Dev-harness (`readability/src/dev.ts:36-114`, `omlx/src/dev.ts:31-84`; core
  already owns `watchWithReload` in `core/src/dev.ts` and `modVite` in
  `core/src/vite.ts`), error kit, `loggerFromEnv`, server vite variant, SDK
  transport (`InMemoryTransport.createLinkedPair()`) as before.
- **B7 — runCli.** Owns commander: help exits 0, subcommand help routes, quiet
  output. Homes declare commands; options may be generated from data;
  a help-payload hook replaces statusline's `HelpRequested` protocol
  (`packages/statusline/src/cli.ts:142-149`). `parseQuietly`/`printUsageAndExit`
  retire unless core itself uses them.
- **Docs made true here:** references/mods.md rewritten to the stamp in B8;
  AGENTS.md's stamp sentence becomes fact when B1 lands (until then it is the
  standing rule for new work, and A2 treats it as rule, not claim).

## Tactical map

Anchors verified at `304cba6`. Scoped gates answer the row; the workspace gate
(below) still fires at every unit boundary.

- **B1** — `packages/core/src/draw.ts` (new), the stamp manifest + emit step on
  root `package.json`'s `build`, `packages/core/test/stamp.spec.ts` (new
  guard), `packages/core/package.json` (description), `packages/rm/hooks/register.ts`
  (:11 `lineOf` → kit), `packages/rm/src/send.ts` (:12 `pad2` import → kit),
  stamped copies under `packages/rm/hooks/`. Gates: `yarn build`,
  `yarn workspace @v1nvn/core test`, `yarn workspace @v1nvn/rm test`,
  `claude plugin validate packages/rm && claude plugin test packages/rm`.
- **B8** — the mod-kit source in core + manifest entries ×4;
  `packages/{rm,md}/hooks/register.ts`, `packages/{zai,tokens}/hooks/register.tsx`;
  engine tests `packages/{rm,md,zai}/tests/*.test.ts` and
  `packages/tokens/tests/{tokens,top}.test.ts` (World glue at
  `tokens/tests/tokens.test.ts:47-54` dies); `references/mods.md`. Gates:
  `yarn build`, `yarn workspace @v1nvn/core test`,
  `tsc --noEmit -p tsconfig.mods.json`, `claude plugin validate` +
  `claude plugin test` for each of `packages/rm packages/md packages/zai packages/tokens`.
- **B9** — `packages/core/src/draw.ts` (the `toSgr` skin);
  `packages/statusline/src/render/{segments,panel,theme,engine}.ts`;
  `packages/zai/src/format.ts`; `packages/tokens/src/top.ts`;
  `packages/statusline/test/goldens/*` (both corpora). Gates:
  `yarn workspace @v1nvn/statusline test`, `yarn workspace @v1nvn/zai test`,
  `yarn workspace @v1nvn/tokens test`; ritual
  `REGEN_GOLDENS=1 yarn workspace @v1nvn/statusline test`.
- **B10** — `packages/zai/src/usage.ts` (:6 `pad2` import dies),
  `packages/zai/src/index.ts` (`--json` raw), `packages/zai/hooks/register.tsx`
  (island renders raw), `packages/zai/package.json` (:41 tokens dep dies);
  `packages/rm/src/send.ts` (:12 `pad2` → core), `packages/rm/package.json`
  (tokens dep dies); `packages/tokens/package.json` (:10-12 `./text` export
  removed), `packages/tokens/types/index.d.ts` (only `declare-module` remains).
  Gates: `yarn workspace @v1nvn/zai test`, `yarn workspace @v1nvn/rm test`,
  `yarn workspace @v1nvn/tokens test`, `claude plugin validate` +
  `claude plugin test` for `packages/zai packages/rm`. Live probe (reinstall
  first): `/zai-usage --json` answers the raw payload and the pane renders it.
- **B2** — `packages/readability/src/policy/{math,tables,footnotes,resolver}.ts`
  → `src/pipeline/` (class list + `KNOWN_LANGUAGE_TOKENS` with resolver);
  importers `src/pipeline/context.ts:1-3`, `normalize.ts:1-2`, `turndown.ts:4-7`;
  new pin test under `packages/readability/test/`. Gates:
  `yarn workspace @v1nvn/readability test`.
- **B3** — `packages/statusline/src/configure.ts` (:415 `validateSelection`;
  every pick written to the panel key), `packages/statusline/src/render/engine.ts`
  (demote guard `if (at === -1) return;` at :180-182 deleted; the guardless
  twin is `panel.ts:235`), goldens regenerated. Gates:
  `yarn workspace @v1nvn/statusline test`; ritual
  `REGEN_GOLDENS=1 yarn workspace @v1nvn/statusline test`; live probes (after
  `yarn build`): `node packages/statusline/dist/index.js configure --theme rich`
  then a real-status read, and a narrow-terminal panel render (gauge falls
  flat) — before/after captures to `progress/.scratch/audit-refactor/`.
- **B4** — `packages/core/src/{dev.ts,vite.ts,logger.ts}` + new error kit and
  `loggerFromEnv`; `packages/readability/src/{server.ts,dev.ts,errors.ts,logger.ts,tools/*.ts}`;
  `packages/omlx/src/{server.ts,omlx.ts,dev.ts,errors.ts,logger.ts,tools/*.ts}`;
  `packages/readability/test/server/{registration,sampling,resources}.test.ts`
  (`LoopbackTransport` at :14/:11/:18 → `InMemoryTransport.createLinkedPair()`).
  Gates: `yarn workspace @v1nvn/core test`,
  `yarn workspace @v1nvn/readability test`, `yarn workspace @v1nvn/omlx test`.
- **B5** — `packages/statusline/src/render/panel.ts` + `layout.ts` (shares the
  engine's parser), `items.ts` (pick-validation helper), `install-record.ts`
  (:25 `isObject` → `jq.ts:5` `isRecord`), `index.ts` (:23-30 `run()` →
  `runMain`, `core/src/cli.ts:53`). Gates:
  `yarn workspace @v1nvn/statusline test`.
- **B6** — `packages/todo/skills/rules/SKILL.md` (one sentence: `references/`
  is created on first promotion); agreement check against
  `skills/init/SKILL.md` and the todo README. No scoped gate — docs-only; the
  workspace gate at the boundary answers it.
- **B7** — `packages/core/src/cli.ts` (`runCli`; A1's minimal fix — the
  fallback path from `96b94b1` — deleted); `packages/rm/src/index.ts` (:19-20),
  `packages/md/src/index.ts` (:21-22), `packages/zai/src/index.ts` (:12-13),
  `packages/tokens/src/cli.ts` (:40-41), `packages/statusline/src/cli.ts`
  (:142-149), `packages/readability/src/cli.ts` (:42-45); tests
  `packages/core/test/cli.test.ts`, `packages/statusline/test/cli.test.ts`,
  `packages/tokens/test/cli.spec.ts`, `packages/readability/test/cli.test.ts`.
  Gates: `yarn build`, then `yarn workspace @v1nvn/core test` and each
  touched home's `yarn workspace <name> test`; live probes ×6 after build:
  `node packages/{statusline,tokens,readability,zai,rm,md}/dist/index.js`
  `<subcommand> --help` exits 0 printing that subcommand's own options.

## Enforcement inventory

- **Launch baselines** (clerk record, tree at `304cba6`): workspace gate exit 0
  — vitest all workspaces pass, 0 fail, 1 skipped; ERROR lines in the log are
  negative-path fixtures (omlx ECONNREFUSED/404/401/timeout, readability
  error-kit probes), expected; `claude plugin test` ×4 (tokens, rm, md, zai)
  0 fail; lint 0 problems; `yarn build`'s synced bins byte-identical.
- **Byte-frozen tests:** the stamp guard spec (`packages/core/test/stamp.spec.ts`)
  is frozen from its B1 landing for the rest of the run — later units extend
  the manifest, never weaken the guard. Goldens regenerate by ritual, not by
  hand: `REGEN_GOLDENS=1 yarn workspace @v1nvn/statusline test` (B3, B9).
  Tests a test writer wrote for a unit are not the builder's to edit.
- **Forbidden idioms, checked per landed unit:** after B1, a hand-edited stamp
  copy (guard proves it red); after B8, a hand-rolled copy of anything the kit
  owns in any hooks module, and World/stubWorld glue in engine tests; after
  B9, an SGR escape literal outside the kit's `toSgr`, and a home importing
  another home's stamp; after B4, any `LoopbackTransport`; after B7, commander
  imported outside `packages/core`; after B10, `@v1nvn/tokens` in rm's or
  zai's dependency list, and a `./text` export in tokens' package.json.
- **Never-rising counts:** a touched file's comment-line count never rises
  (stamped copies and the regenerated `types/claude-code.d.ts` are exempt —
  stamped, not authored); greps run from the root over live surfaces only
  (`':!archive' ':!progress'`) — archive records stay verbatim.

## Small rows

B6 batches as one dispatch: its close criteria fully name the sentence and the
agreement check; no design freedom, no money. B5 stays a solo dispatch —
sonnet/low but design-bearing (parser sharing, helper placement). Every other
row touches money, structure or a caller-visible surface.

## Line ceiling

400 inserted lines per unit, counted `git diff --shortstat -M -- ':!*.snap'`.
Derivation: this repo's recent code units span 5–303 inserted lines (A1 171+13,
A3 172+5, A4 37, `96b94b1` 303, run-costs units 9–183; median ≈ 118), with A2's
1081 a docs/types-regen outlier. Stamped copies count toward the ceiling — a
unit over it stops at the next green point, saves the patch to scratch, and
splits along its own clauses (B8's natural clause boundary is per home).

## Run mechanics

- **Workspace gate, verbatim, once per unit immediately before its commit:**
  `yarn build && yarn test && yarn typecheck && yarn lint && yarn test:mods`.
- Scoped gates live in the tactical map; a golden regen is a ritual, recorded
  with its command and tail in `progress/.scratch/audit-refactor/` alongside
  before/after captures.
- **Live-probe protocol:** before probing a mod home live, reinstall the plugin
  from the tree — a cached pre-stamp install runs old hooks. CLI probes run on
  built dist (`yarn build` first).
- One commit per unit, conventional one-liner. One branch `audit-refactor`, one
  PR at the end, base `main` named explicitly.

## Stop rules

A pick that touches money, names what a caller sees, forces a second
deviation, touches a file the plan doesn't name, or mints or splits a unit
stops for the owner; a builder's split at the line ceiling proceeds. B10's
semver step for removing the `/text` export is posted to the owner when the
run reaches B10 — never silent, never chosen by the run.

## Audit list

End-of-run, run from the repo root over live surfaces:

```
git grep -n "function lineOf" -- 'packages/*/hooks'                 # empty (B8)
git grep -n "type World\|stubWorld" -- 'packages/*/tests'           # empty (B8)
git grep -nE '\\x1b\[|\\u001b\[' -- 'packages/*/src' 'packages/*/hooks' | grep -v draw.ts   # only the kit's skin (B9)
git grep -ln "from 'commander'" -- 'packages/*/src'                 # only packages/core (B7)
git grep -n "@v1nvn/tokens" -- packages/rm packages/zai             # empty (B10)
git grep -n '"./text"' -- packages/tokens/package.json              # empty (B10)
git grep -rn "LoopbackTransport" -- packages ':!*/node_modules/*'   # empty (B4)
git grep -n "../policy" -- 'packages/readability/src/pipeline'      # empty (B2; pin test also asserts)
yarn workspace @v1nvn/core test                                     # stamp guard green
```

Plus the count checks: every touched file's comment-line count at or below its
pre-unit value; the stamp manifest's copies byte-equal after `yarn build`.

## Open questions

- **B10:** the semver step for removing `@v1nvn/tokens`'s `./text` export and
  dropping the rm/zai dependency — major vs minor is the owner's call; posted
  when the run reaches B10, never silent.

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
