# zai pane — one report renderer, two surfaces

## Goal

`/zai-usage` opens a pane that draws the GLM report as engine elements. The
report's layout is written once per home and both surfaces render from it —
zai (CLI text + pane) and tokens (CLI text + pane). No `$.ui.log` of
multi-line output anywhere; the mods' hooks descriptions name their commands;
docs carry the new surface in the same change.

## Current state

Rulings complete (owner, this sitting — consult at /tmp/zai-pane-rulings):
structured elements with the double renderer de-duped in both homes (G1b +
note), no refresh clock (G2a), the model-mix row converges on the CLI's split
row with CLI bytes pinned (frontend-design pass picked a). Nothing built.

## Next step

Run unit 1.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| 1 | zai: the line model | | | `packages/zai/src/format.ts` exports `reportLines(input)` building `Line[]` (ink-tagged segments) and `render()` joins them plain; the CLI render is byte-identical — `test/format.spec.ts` passes unchanged |
| 2 | zai: `--json` + the pane island | | | `bin/usage.mjs --json` prints `{ lines }`; `hooks/register.tsx` execs it, opens pane `zai-usage`, `ui.render` draws segments with ink in the bordered-Box idiom; no clock; failure paths stay one-line log rows, no pane; engine tests re-pin the `--json` exec line and the open/draw; zai README carries the new allow rule |
| 3 | tokens: converge | | | `src/format.ts` takes the same `reportLines()` shape, bytes pinned by `test/format.spec.ts` unchanged; `register.tsx`'s `draw()` deleted — the island renders `reportLines(scan)` with ink; pane content is the CLI report (split rows, CLI daily order); `--json` payload untouched; engine tests re-pin |
| 4 | descriptions, docs, gates | | | rm/md/zai `hooks.json` descriptions name their commands (tokens' shape, `352f655` class); AGENTS.md and both READMEs describe the pane; full inventory green (Plan); owner live-verifies `/zai-usage` and `/tokens-usage` panes |

## Plan

- Reading lists:
  - Unit 1: `packages/zai/src/format.ts`, `test/format.spec.ts`;
    `packages/tokens/src/text.ts` (the primitives it imports).
  - Unit 2: `packages/tokens/hooks/register.tsx` (the pane idiom);
    `packages/tokens/tests/tokens.test.ts` (how engine tests assert an open
    pane and its draw); `references/mods.md` (pane recipe, `bodyColumns`);
    `packages/zai/tests/zai.test.ts` (the re-pin).
  - Unit 3: `packages/tokens/src/format.ts`, `hooks/register.tsx`,
    `test/format.spec.ts`, `tests/tokens.test.ts`.
- Enforcement inventory:
  - `packages/zai/test/format.spec.ts` and `packages/tokens/test/format.spec.ts`
    pass unchanged — the CLI renders are byte-pinned.
  - Every report layout exists once per home: one `reportLines` per package;
    no JSX or string assembly of a report anywhere else.
  - `git grep -n "ui\.log" packages/*/hooks` hits only single-line failure rows.
  - No island imports an npm package: the zai island graph is
    `register.tsx` + bare `claude-code`; the tokens island graph adds only
    plugin-relative `../src/*`.
  - Gates per unit: `set-version --check` · `yarn typecheck` · `yarn lint` ·
    `yarn test` · `yarn build` · `claude plugin validate <touched home>` ·
    `yarn test:mods`. The clerk's gate script lives at
    `progress/.scratch/zai-pane/gate.sh`; it pins the two spec files by sha256
    from the run's base commit and greps the inventory's invariants.
- Unit 4's live-verify clause is owner-owed after the release train (fresh
  install, per the mods-port live-verify entry); the run lists it in the
  final report, it does not block the close.
- Stop rules: the engine refuses a segment draw (fall back to verbatim
  `G1a` — back to the owner); a tokens `--json` consumer breaks (payload must
  stay `ScanResult`); a report line exceeds 68 columns.
- PR: one, at the end — one commit per unit.

## Design

Rulings (owner):

- (owner, G1b) The zai pane draws structured elements — dim headers, bold
  percentages — and the double renderer is de-duped here and now in both
  homes: one layout per report, adapters at both ends.
- (owner, G2a) No refresh clock; re-running `/zai-usage` re-execs and the
  open pane redraws. The out-of-scope zai quota status line stands.
- (owner, frontend-design pass) The model-mix row is the CLI's split row
  (in/out/read/created); per-model calls leaves the row — the summary carries
  total work. CLI bytes stay pinned; the tokens pane converges to the CLI
  report.

Decided, not rulings:

- rm/md stay on `$.ui.log` — one-line CLIs, one-line contract.
- Shape: `Line = Segment[]`, `Segment = { text, ink? }` with ink
  `'dim' | 'bold'`; the CLI adapter joins plain (byte-identical), the island
  maps ink to `dimColor`/`bold` inside the bordered-Box pane idiom.
- Ink map: title bold; section headers, window, note, row labels dim; hit
  percentages bold; bars and numbers plain.
- The zai island consumes `--json` lines because its builder graph pulls
  `@v1nvn/tokens` and an island imports no npm package; the tokens island
  imports `reportLines` plugin-relatively (its `src/` is npm-free).
- Pane id `zai-usage`, title `GLM usage`; `rows` asks the line count — the
  engine clamps to a third and a pane body scrolls
  (`UiScrollComponent = 'Pane'`).
- No data, no pane: a refused or failed exec logs its one-line reason and
  opens nothing (tokens' "(no usage report)" pane dies with unit 3).

Rejected: merged model-mix row (≈86 columns against the 68 the report is
fixed to); verbatim-only body (G1a, not picked); clock while open (G2b).
