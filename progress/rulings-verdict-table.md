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

U1 landed (`cd4696d`) and closed on its blind review — every close
criterion PASS on the reviewer's own probes, no blocking finding; the
needs-carrier call confirmed live (answer text and storage byte-exact).
Live at 1440: page 3818px (baseline 8671), G1 845 / G4 738; G2 at 1556
folds render folded (G2's 51-line code body behind `show all 51 lines`).
Queued nits: (1) a tagged 95-raw/88-stripped gain fixture must pin the
stripTags seam; (2) `.vhead` rescoped to the table header leaves `v-`
meaning verdict in vtable/vrow/vhead but view in vwrap — rename only if
the sweep touches it; (3) the sentence-split test name promises an anchor
fixture it lacks, and its code-span dot is the first boundary — rename to
what it pins or add the mid-span-cut fixture; (4) `noteHtml` folds at the
first bold anywhere, not only a bold lead — fold at lead only or accept;
(5) `todayPre` highlights the two code halves separately, so a Prism
token spanning line 20 tokenizes per-half — deterministic, no live case
hits it, the expander boundary is a highlight seam; (6) style.ts:89's
fold comment restates its declarations; (7) chrome.ts:312's zero-picks
refusal still says "click a view" — the gesture rename applies, rides the
diagram fix. Open blocking finding against U1, discovered by U4's G5:
mermaidBoot draws every .mermaid container at load, but since U1 all
views but the shown one sit hidden — hidden containers render broken
(0×0 plus mermaid's syntax-error graph) and never redraw on view switch.
Fix shape (U4 recorded it in u4-builder.md): draw on first visibility
from the boot's src snapshot (IO or MutationObserver on the wraps'
hidden attr); a theme flip redraws only already-drawn containers. G5's
full text, group line and pins are recorded there for the fix builder.
U4 landed `a80db17`; the fix dispatch and U5 remain.

## Next step

Land the mermaidBoot fix (draw on first visibility) with G5 reinstated
and the chrome.ts:312 copy line, then U5 (audit, release, rebuilds).

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | ------- | -------------- |
| U1 | one home per ruling — verdict table + one stage | sonnet | role | design | landed: `cd4696d`, closed on the blind review (all criteria PASS, needs carrier confirmed) |
| U2 | the folds — today, notes, long today-code | sonnet | role | | landed: `a97d004`, closed on the blind review (all criteria PASS live, the diff:false seam pinned) |
| U3 | the gestures — look vs pick | sonnet | role | | landed: `61b7ce6`, closed on the blind review; its one blocking finding (the keyboard exemption hole) fixed inside U4's `a80db17` on a green gate, pinned by a watched-red test |
| U4 | example and docs to the new authoring | sonnet | role | | # Rulings — the verdict-table layout

**Run:** one commit per unit, one PR per thread

## Goal

A ruling reads as one decision on one screen: question, one-line stake, two
sentences of today, a verdict table (one row per option — letter, title,
gain, cost fragment) and one picture region whose letter tabs switch views.
The pick → chip → Copy contract, persistence, needs tracking and the ledger
voice are byte-unchanged. Shipped as a minor release with the five live
pages and the exemplar rebuilt on it.

## Current state

U1 landed (`cd4696d`) and closed on its blind review — every close
criterion PASS on the reviewer's own probes, no blocking finding; the
needs-carrier call confirmed live (answer text and storage byte-exact).
Live at 1440: page 3818px (baseline 8671), G1 845 / G4 738; G2 at 1556
folds render folded (G2's 51-line code body behind `show all 51 lines`).
Queued nits: (1) a tagged 95-raw/88-stripped gain fixture must pin the
stripTags seam; (2) `.vhead` rescoped to the table header leaves `v-`
meaning verdict in vtable/vrow/vhead but view in vwrap — rename only if
the sweep touches it; (3) the sentence-split test name promises an anchor
fixture it lacks, and its code-span dot is the first boundary — rename to
what it pins or add the mid-span-cut fixture; (4) `noteHtml` folds at the
first bold anywhere, not only a bold lead — fold at lead only or accept;
(5) `todayPre` highlights the two code halves separately, so a Prism
token spanning line 20 tokenizes per-half — deterministic, no live case
hits it, the expander boundary is a highlight seam; (6) style.ts:89's
fold comment restates its declarations; (7) chrome.ts:312's zero-picks
refusal still says "click a view" — the gesture rename applies, rides the
diagram fix. Open blocking finding against U1, discovered by U4's G5:
mermaidBoot draws every .mermaid container at load, but since U1 all
views but the shown one sit hidden — hidden containers render broken
(0×0 plus mermaid's syntax-error graph) and never redraw on view switch.
Fix shape (U4 recorded it in u4-builder.md): draw on first visibility
from the boot's src snapshot (IO or MutationObserver on the wraps'
hidden attr); a theme flip redraws only already-drawn containers. G5's
full text, group line and pins are recorded there for the fix builder.
U4 landed `a80db17`; the fix dispatch and U5 remain.

## Next step

Land the mermaidBoot fix (draw on first visibility) with G5 reinstated
and the chrome.ts:312 copy line, then U5 (audit, release, rebuilds).

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | ------- | -------------- |
| U1 | one home per ruling — verdict table + one stage | sonnet | role | design | landed: `cd4696d`, closed on the blind review (all criteria PASS, needs carrier confirmed) |
| U2 | the folds — today, notes, long today-code | sonnet | role | | landed: `a97d004`, closed on the blind review (all criteria PASS live, the diff:false seam pinned) |
| U3 | the gestures — look vs pick | sonnet | role | | landed: `61b7ce6`, closed on the blind review; its one blocking finding (the keyboard exemption hole) fixed inside U4's `a80db17` on a green gate, pinned by a watched-red test |
| U4 | example and docs to the new authoring | sonnet | role | | landed: `a80db17` (the U3 keyboard fix rode it, so U3 closes with it); the example's diagram ruling (G5) stopped on a U1 regression — mermaidBoot draws hidden wraps broken — recorded with its fix shape, lands as its own fix commit |
| U5 | audit, release, rebuilds | sonnet | none | | surface audit green on dark/light/979/390/empty/loaded/keyboard; blind contract review passes; minor release published and resolving; five live pages + the exemplar rebuilt on it |

## Plan

- **Tactical map.** U1 (consult rulings folded): `html.ts` (delete
  `viewHeadFor`/`verdictFor`; add the table and tab renderers; `optOf`
  stays), `page.ts` (`viewsOf` becomes one compare region — tab strip plus
  every view in the DOM with all but the first hidden; `rulingSection`
  orders rhead → stake → today → `.vtable` → `.compare` as two bordered
  boxes, `.compare .stage` drops its own border, and the merged-ruling
  early return stays ahead of both; note inputs move into table rows with
  `data-note` byte-identical; the assemblyCss view-card rules die with the
  section), `seq.ts`/`bodies.ts`/`diagram.ts` (emit the stage only — heads
  and verdict tails deleted; `w` renders as one muted line under the
  caption/bcap), `style.ts` (delete the view-card block; add
  table/tabs/compare rules), `schema.ts` (fragment warning inside the
  gain/cost VAGUE loop — `stripTags(text).length > 90` against a named
  const beside `LONG_LINE`; not on `w`), `example.page.js` (trim g/c to
  fragments), `test/build.test.ts` and `test/pictures.test.ts` (pins move;
  pictures rewritten to the stage-only renderers), SKILL.md Step 4 gate +
  field table. Pick wiring: the letter disc (a real `<button>`) and each
  view wrap carry `data-pick`; rows and tabs carry `data-view` only, the
  row keeps `data-needs` and every row, disc and wrap carries its `o-<k>`
  hue; the tab strip iterates views, not rows — a letter-less today tab
  highlights no row; tabs emit `role="tab"` + `aria-selected` +
  `aria-controls`, wraps `role="tabpanel"` + `id`, and U3 maintains both on
  switch. The proven shape: `progress/.scratch/rulings-wall/mock-a.html`
  and its generator `gen2.mjs` (faked gestures — the wiring above, not the
  mock's, is law). U3: chrome.ts builds its needs→chip map per data-pick
  element with last-write-wins (chrome.ts:44) — rewire CARD to the rows
  and drop `data-needs` from the wraps in the same change. U2: `page.ts` or `html.ts` (the
  deterministic sentence split), `bodies.ts` (line-count fold), `schema.ts`
  (today sentence warning), SKILL Step 2. U3: `chrome.ts` (show/look/pick, the CARD rewire to rows, the fold-summary click exemption), `style.ts` (the row look/picked states and the `.fold` affordance — muted mono, dashed underline, per the mock; U2 left browser-default disclosure styling)
  wiring, restore-on-load, row states), `test/chrome.test.ts`, SKILL Step 6.
  U4: `example.page.js`, SKILL.md, README.md, plus two named one-liners from U3 — page.ts drops the now-dead data-needs emission on wraps (chrome reads rows), and chrome.ts's empty-chips copy says "pick a letter" with its pin (build.test.ts:642). Scoped gate
  `yarn workspace @v1nvn/rulings run test`; workspace gates `yarn test`
  then `yarn typecheck` at the repo root, ceiling 2 min (pre-flight
  measured 1m13s).
- **Small rows:** U5 — mechanics only, no code changes; review is none
  because it changes no code, with the audit list guarding the surface.
- **Enforcement inventory.** Determinism byte-identical (no clock, paths,
  randomness); the storage shape `{picks, onotes, note}` untouched; the
  answer text format (`G2a — its note, G3b (needs G3a) — its note`, blank
  line, page note) byte-identical — its tests survive unchanged; no fetch
  on fetch on open; build warnings are faults; files touched come out with
  fewer comment lines; the old view-card path is deleted, not shimmed.
  U1's builder writes `progress/.scratch/rulings-verdict-table/enforce.mjs`
  once from these: build twice and byte-diff (determinism), grep the
  emitted page for the storage shape and for `fetch(` (must be absent);
  every later builder runs it as its last gate step. Checklist: a suite value where two interpretations coincide
  (raw vs stripped length, before vs after a split) is a seam fault — a
  fixture pins it before the gate; comment-line count is one too — no
  script checks it.
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
 the example's diagram ruling (G5) stopped on a U1 regression — mermaidBoot draws hidden wraps broken — recorded with its fix shape, lands as its own fix commit |
| U5 | audit, release, rebuilds | sonnet | none | | surface audit green on dark/light/979/390/empty/loaded/keyboard; blind contract review passes; minor release published and resolving; five live pages + the exemplar rebuilt on it |

## Plan

- **Tactical map.** U1 (consult rulings folded): `html.ts` (delete
  `viewHeadFor`/`verdictFor`; add the table and tab renderers; `optOf`
  stays), `page.ts` (`viewsOf` becomes one compare region — tab strip plus
  every view in the DOM with all but the first hidden; `rulingSection`
  orders rhead → stake → today → `.vtable` → `.compare` as two bordered
  boxes, `.compare .stage` drops its own border, and the merged-ruling
  early return stays ahead of both; note inputs move into table rows with
  `data-note` byte-identical; the assemblyCss view-card rules die with the
  section), `seq.ts`/`bodies.ts`/`diagram.ts` (emit the stage only — heads
  and verdict tails deleted; `w` renders as one muted line under the
  caption/bcap), `style.ts` (delete the view-card block; add
  table/tabs/compare rules), `schema.ts` (fragment warning inside the
  gain/cost VAGUE loop — `stripTags(text).length > 90` against a named
  const beside `LONG_LINE`; not on `w`), `example.page.js` (trim g/c to
  fragments), `test/build.test.ts` and `test/pictures.test.ts` (pins move;
  pictures rewritten to the stage-only renderers), SKILL.md Step 4 gate +
  field table. Pick wiring: the letter disc (a real `<button>`) and each
  view wrap carry `data-pick`; rows and tabs carry `data-view` only, the
  row keeps `data-needs` and every row, disc and wrap carries its `o-<k>`
  hue; the tab strip iterates views, not rows — a letter-less today tab
  highlights no row; tabs emit `role="tab"` + `aria-selected` +
  `aria-controls`, wraps `role="tabpanel"` + `id`, and U3 maintains both on
  switch. The proven shape: `progress/.scratch/rulings-wall/mock-a.html`
  and its generator `gen2.mjs` (faked gestures — the wiring above, not the
  mock's, is law). U3: chrome.ts builds its needs→chip map per data-pick
  element with last-write-wins (chrome.ts:44) — rewire CARD to the rows
  and drop `data-needs` from the wraps in the same change. U2: `page.ts` or `html.ts` (the
  deterministic sentence split), `bodies.ts` (line-count fold), `schema.ts`
  (today sentence warning), SKILL Step 2. U3: `chrome.ts` (show/look/pick, the CARD rewire to rows, the fold-summary click exemption), `style.ts` (the row look/picked states and the `.fold` affordance — muted mono, dashed underline, per the mock; U2 left browser-default disclosure styling)
  wiring, restore-on-load, row states), `test/chrome.test.ts`, SKILL Step 6.
  U4: `example.page.js`, SKILL.md, README.md, plus two named one-liners from U3 — page.ts drops the now-dead data-needs emission on wraps (chrome reads rows), and chrome.ts's empty-chips copy says "pick a letter" with its pin (build.test.ts:642). Scoped gate
  `yarn workspace @v1nvn/rulings run test`; workspace gates `yarn test`
  then `yarn typecheck` at the repo root, ceiling 2 min (pre-flight
  measured 1m13s).
- **Small rows:** U5 — mechanics only, no code changes; review is none
  because it changes no code, with the audit list guarding the surface.
- **Enforcement inventory.** Determinism byte-identical (no clock, paths,
  randomness); the storage shape `{picks, onotes, note}` untouched; the
  answer text format (`G2a — its note, G3b (needs G3a) — its note`, blank
  line, page note) byte-identical — its tests survive unchanged; no fetch
  on fetch on open; build warnings are faults; files touched come out with
  fewer comment lines; the old view-card path is deleted, not shimmed.
  U1's builder writes `progress/.scratch/rulings-verdict-table/enforce.mjs`
  once from these: build twice and byte-diff (determinism), grep the
  emitted page for the storage shape and for `fetch(` (must be absent);
  every later builder runs it as its last gate step. Checklist: a suite value where two interpretations coincide
  (raw vs stripped length, before vs after a split) is a seam fault — a
  fixture pins it before the gate; comment-line count is one too — no
  script checks it.
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
