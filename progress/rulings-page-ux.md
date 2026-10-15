# Rulings — the page's fix pass

**Run:** one PR; the minor release and the five rebuilds ride the final unit

## Goal

The page reads as a working instrument: no render defect, one home per option
(gain and cost beside the picture), option views carrying their delta, a
composer bar that rests small, pick state visible in the sidebar — shipped,
the five live pages rebuilt on it, and the owner's look passes.

## Current state

U1 and U2 landed (`ee41b08` + `d2092f9`, PR #28, v0.50.0 green). The fix-pass
run is on branch `rulings-fix-pass`: U4+U5 landed as one batch commit
`1221898` and closed on the blind review's own output; U6 landed `55a5aae`
(compare folded into view cards) with its blind review in flight; U7's design
consult is ruling; U8, U9 and U3 open. One blocking finding is open, routed to
U7's builder's brief: the pictures test describe carries the run's name.
Queued nits for the PR group's sweep: the mermaid unit guard asserts source
tokens, not behavior; a captionless seq view renders `aria-label=""` — omit
the attribute when empty; the drag-select guard swallows keyboard-activated
picks while a selection is alive — scope the return to `[data-pick]`; the bar
textarea's 120px cap clips tall persisted notes (fact carried into U8's row);
a duplicated `viewSteps` comment in `seq.ts`; a dead `mq.addListener`
fallback in `diagram.ts`. Live verification runs programmatic (own headless
Chrome over raw CDP) — the harness's image-Read path uploads screenshots
off-machine, so no screenshot file is Read. The five pages under
`~/.claude/rulings/` still carry v0.49.0 builds.

## Next step

Dispatch U7's builder once its design consult reports; its brief leads with
the open blocking finding from the batch review (the pictures test describe
carries the run's name).

## Steps

| id  | unit                                       | model  | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------ | ------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | the design pass                            | session |        |         | landed: `ee41b08` + `d2092f9`, PR #28, v0.50.0                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| U2  | audit and review                           | session | role   |         | landed: surface audit + blind review fixed and live-verified, same PR #28                                                                                                                                                                                                                                                                                                                                                                                                                          |
| U4  | render defects — today card, sidebar, aria |        | role   |         | landed: `1221898`, closed on the blind review's own output (all criteria PASS, guard reverts red) |
| U5  | composer defects — chips, copy, notes      |        | role   |         | landed: `1221898` (batch commit naming both ids); one blocking finding open — test describe carries the run's name, routed to the next builder |
| U6  | one home for gain/cost                     |        | role   | design  | consult ruled: fold, delete the compare — each option's `w`, gain and cost render exactly once as the verdict tail of its own view card (head → stage → `w` if present → gain → cost, inside `section.view`); the compare block, its seven CSS rules and its duplicated chips are deleted, zero new CSS; a today-marked card carries its option's verdict tail, an unmarked today card none; `build.test.ts`'s compare pin flips to absent plus a `gc gain` row present inside a view; SKILL.md drops its compare-matrix clause in the same commit; if the grown card breaks the `role="button"` accessible name, pin it here; snapshots move; gates green |
| U7  | deltas not twins                           |        | role   | design  | a ruling draws today's picture once; each option view carries only its delta against it (seq: changed/new/gone rows banded on shared frame or delta-only frames; diagram: shared nodes, changed node tinted; bodies stays the model) per the consult's direction; the diff collapse fires for short bodies or the threshold is sized so it can; a diagram stage caps to its diagram's width; the example's G4 section is no longer ~39% of the page; snapshots move; gates green |
| U8  | bar, state, wayfinding                     |        | role   |         | the bar's resting state with no picks is a strip ≤ ~48px and expands on first pick; at 390px it collapses to a chip count that opens the bar; the sidebar marks each ruled ruling and states N of M ruled (masthead or sidebar); below 980px a wayfinding affordance reaches the current group/ruling; the page note's autogrow and the bar's height cap agree — a tall persisted note reaches its text by design; keyboard and focus behavior preserved; snapshots move; gates green |
| U9  | language pass                              |        | role   |         | the author's recommendation and the owner's pick carry distinct plain names ("recommended" / "picked") everywhere including the quick button; the letter follows one rule — outlined until picked, filled when picked — across view heads, stage tags, compare and chips, and the chip prints the letter once; today cards have one shape across rulings; the shipped example's captions and placeholders speak to the reader (no engine vocabulary, no `· n` chat syntax, no "rides the answer"); mono structural text uses two sizes; the merged sentence appears once; SKILL.md and README follow in the same commit |
| U3  | release and rebuild                        |        | none   |         | PR merged, the version shipping U4–U9 published and resolving, five pages rebuilt, live check on pr272-design, thread closed |

## Plan

- **Tactical map.** U4: `style.ts` (scope the `.today` paragraph rule),
  `chrome.ts` (scroll-spy, legend key is `seq.ts`), `seq.ts` (per-view
  aria-label), `diagram.ts` (theme follow). U5: `chrome.ts` (chipHue map,
  copy guards, selection guard, note autogrow). U6: `html.ts` (`optOf`
  extract, `verdictFor`), one verdict line each in `seq.ts`, `diagram.ts`,
  `bodies.ts`, `page.ts` (delete `compareHtml` and its call), `style.ts`
  (delete the compare rules), `build.test.ts` pin swap, `SKILL.md`. U7:
  `seq.ts`, `diagram.ts`, `bodies.ts`
  (collapse threshold) + `example.page.js` where the example's content must
  show the mechanism. U8: `chrome.ts` + `style.ts` + `page.ts` (sidebar).
  U9: `style.ts`, `html.ts`, `example.page.js`, `SKILL.md`, `README.md`.
  Scoped gate `yarn workspace @v1nvn/rulings run test`; workspace gate
  `yarn test` at the repo root, ceiling 1 min (pre-flight measured 48.5s).
  U3 adds validate +
  build-skills + set-version --check and the five live rebuilds; its review
  is none because it changes no code — release and rebuild mechanics only,
  with the audit list guarding the surface.
- **Small rows:** U4, U5 — mechanical defect fixes, one dispatch each.
- **Live checks** rebuild the example into
  `progress/.scratch/rulings-page-ux/example-check/` (`--no-open`) and walk
  it: the 621→812px measure, the chip letter's hue, scroll-to-masthead
  clearing the mark, dark/light/narrow/phone, empty and loaded states.
- **Enforcement inventory.** Determinism byte-identical (no clock, paths,
  randomness); the strict schema untouched; the storage shape
  `{picks, onotes, note}` untouched; no fetch on open; SKILL.md copy and
  README move in the same commit as the surface they describe.
- **Audit list.** Before U3: surface-audit on live screenshots of the
  rebuilt example (dark, light, narrow, phone, empty, loaded) with findings
  folded or fixed; a blind reviewer confirms the pick/copy/persist/needs/n/
  quick contract unchanged.

## Design

- The pick letter stays the protagonist; the ledger voice stays (mono
  structure, serif questions, sans prose) with two mono sizes, not five.
- One home per option: the picture, its gain and its cost are one block.
  Nothing an option says renders twice.
- Deltas not twins: today's picture once per ruling; an option view argues
  only what changes. Bodies' diff is the model; seq and diagram reach the
  same shape.
- The letter's one rule: outlined until picked, filled when picked. The
  author's star is "recommended" in words; the owner's mark is "picked".
- The bar rests small and grows with work; state is visible — the sidebar
  carries ruled marks and N of M.
- The sidebar stays the only fixed chrome on wide screens; everything else
  scrolls.
