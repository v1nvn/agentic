# Rulings — the verdict-table layout

**Run:** one commit per unit, one PR per thread

## Goal

A ruling reads as one decision on one screen: question, one-line stake, two
sentences of today, a verdict table (one row per option — letter, title,
gain, cost fragment) and one picture region whose letter tabs switch views.
The pick → chip → Copy contract, persistence, needs tracking and the ledger
voice are byte-unchanged. Shipped as a minor release with the five live
pages and the exemplar rebuilt on it.

## Current state

Direction ruled by the owner this sitting (candidate A of the
`rulings-wall` mocks): verdict table first, picture below with tabs,
aggressive cleanup sanctioned. Nothing built yet. The exemplar
`~/.claude/rulings/agentic-open-surfaces/` was rebuilt from the branch
engine and measures the baseline: 8671px at 1440, rulings 1533–2643px.
Mock-measured target: rulings ≤900px, page ~3600px.

## Next step

Branch `rulings-verdict-table` off `rulings-fix-pass`, build U1.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | ------- | -------------- |
| U1 | one home per ruling — verdict table + one stage | sonnet | role | design | table renders g/c once per option as fragments; per-view heads, verdict tails and per-view note inputs deleted; all views in DOM, one visible; `yarn workspace @v1nvn/rulings run test` green with moved pins; example's g/c pass the fragment warning |
| U2 | the folds — today, notes, long today-code | sonnet | role | | today renders two sentences then a fold; the notes block folds on its bold lead; a bodies today block over 20 lines folds with a count-labelled expander; >3-sentence today warns; SKILL Step 2 moves in the same change |
| U3 | the gestures — look vs pick | sonnet | role | | tab or row body switches the shown view; letter disc and the shown picture pick; a stored pick restores its view on load; needs chips and unmet marks live on rows; answer text and storage shape byte-identical (contract tests unchanged); SKILL Step 6 moves in the same change |
| U4 | example and docs to the new authoring | sonnet | role | | example.page.js demonstrates 2-sentence todays, fragment g/c, one-line w; SKILL Steps 2–4 swept; README's surface description matches the page |
| U5 | audit, release, rebuilds | sonnet | none | | surface audit green on dark/light/979/390/empty/loaded/keyboard; blind contract review passes; minor release published and resolving; five live pages + the exemplar rebuilt on it |

## Plan

- **Tactical map.** U1: `html.ts` (delete `viewHeadFor`/`verdictFor`; add
  the table and tab renderers; `optOf` stays), `page.ts` (`viewsOf` becomes
  one compare region — tab strip plus every view in the DOM with all but
  the first hidden; `rulingSection` orders rhead → stake → today → table →
  compare; note inputs move into table rows), `seq.ts`/`bodies.ts`/
  `diagram.ts` (emit the stage only — heads and verdict tails deleted),
  `style.ts` (delete the view-card block; add table/tabs/compare rules),
  `schema.ts` (fragment warning on g/c over ~90 chars stripped),
  `example.page.js` (trim g/c to fragments), `test/build.test.ts` pins,
  SKILL.md Step 4 gate + field table. U2: `page.ts` or `html.ts` (the
  deterministic sentence split), `bodies.ts` (line-count fold), `schema.ts`
  (today sentence warning), SKILL Step 2. U3: `chrome.ts` (show/look/pick
  wiring, restore-on-load, row states), `test/chrome.test.ts`, SKILL Step 6.
  U4: `example.page.js`, SKILL.md, README.md. Scoped gate
  `yarn workspace @v1nvn/rulings run test`; workspace gates `yarn test`
  then `yarn typecheck` at the repo root, ceiling 1 min.
- **Small rows:** U5 — mechanics only, no code changes; review is none
  because it changes no code, with the audit list guarding the surface.
- **Enforcement inventory.** Determinism byte-identical (no clock, paths,
  randomness); the storage shape `{picks, onotes, note}` untouched; the
  answer text format (`G2a — its note, G3b (needs G3a) — its note`, blank
  line, page note) byte-identical — its tests survive unchanged; no fetch
  on open; build warnings are faults; files touched come out with fewer
  comment lines; the old view-card path is deleted, not shimmed.
- **Run mechanics.** Branch `rulings-verdict-table` off `rulings-fix-pass`;
  the PR targets main once #29 merges. Rebuild-check pages into
  `progress/.scratch/rulings-verdict-table/` with `--no-open`; live checks
  run programmatic (own headless Chrome over raw CDP; no screenshot file is
  Read through the harness — vision rounds dispatch to sonnet subagents).
- **Audit list.** U5: surface-audit on live screenshots (dark, light, 979,
  390, empty, loaded, keyboard) before the release; a blind reviewer
  confirms the pick/copy/persist/needs/n/quick contract unchanged.

## Design

- The verdict table is the option's one home: letter disc, title, `★
  recommended` / `as today` / `needs` chips, `+ gain` and `− cost`
  fragments in aligned columns, the note input on the picked row only.
  Nothing an option says renders twice.
- One picture region per ruling: letter tabs (letter, CSS-truncated title,
  `today` mark) switch the shown view. Seq keeps delta rows on the shared
  frame; bodies shows today or an option's diff; diagram swaps views.
- `w` keeps its field and renders as one muted line inside the stage under
  the caption — the caption opens with its conclusion, `w` says how.
- Gestures: row body and tab are look; the letter disc and the shown
  picture pick. Flipping views never picks.
- Folds are deterministic: today splits at the second sentence boundary;
  a bodies today block folds past 20 lines with its count in the label.
- The ledger voice, the sidebar with ruled marks and N of M, the resting
  composer bar and the copy contract survive untouched.
