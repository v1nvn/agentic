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
and closed; U7 landed `e4834cc` (delta-only frames, G4 as a seq) and closed
on its review; U8 landed `de5adb7` (resting strip, ruled marks and N of M,
phone sheet, <980 pill, note-cap agreement) and closed on its review, its
drag-select keyboard nit closed with it; U9 landed `e25f417` (one name per meaning, the letter's one rule,
reader-facing example, two mono sizes, merged once) and closed on its review,
the `optOf` comment and dead `.mermaid svg` rule nits closed with it. U3
open. The nit sweep landed `cfd6e5a` and passed its review on A/B evidence —
all seven queued nits fixed. One fix round is open: `yarn typecheck` is red
with five errors CI would catch (`build.test.ts:360` `cb` on `never` from the
sweep's own `FakeIO.last` narrowing; four inherited from closed units —
`seq.ts:60`'s unused `view` param from U7, and three `number | undefined`
errors in `build.test.ts:85-87` from U6). The typecheck gate was missing from
the minted gate lines — now added to the map. Context nit for the final
report only: prettier drift on the three test files, identical before and
after the sweep. Live verification runs programmatic
(own headless Chrome over raw CDP) — the harness's image-Read path uploads
screenshots off-machine, so no screenshot file is Read; reviews on this
branch extract the commit under review to a pristine location while builders
run. The five pages under `~/.claude/rulings/` still carry v0.49.0 builds.

## Next step

Fix round for the five typecheck errors (one fresh builder), its commit, then
the audit list's surface audit, the archive fold, and U3.

## Steps

| id  | unit                                       | model  | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------ | ------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | the design pass                            | session |        |         | landed: `ee41b08` + `d2092f9`, PR #28, v0.50.0                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| U2  | audit and review                           | session | role   |         | landed: surface audit + blind review fixed and live-verified, same PR #28                                                                                                                                                                                                                                                                                                                                                                                                                          |
| U4  | render defects — today card, sidebar, aria |        | role   |         | landed: `1221898`, closed on the blind review's own output (all criteria PASS, guard reverts red) |
| U5  | composer defects — chips, copy, notes      |        | role   |         | landed: `1221898` (batch commit naming both ids); one blocking finding open — test describe carries the run's name, routed to the next builder |
| U6  | one home for gain/cost                     |        | role   | design  | landed: `55a5aae`, closed on the blind review's own output (all criteria PASS, accessible-name conditional verified not fired) |
| U7  | deltas not twins                           |        | role   | design  | landed: `e4834cc`, closed on the blind review's own output (delta pins red on revert, the stage-cap dissolution independently reproduced, G4 26% vs the 37% baseline) |
| U8  | bar, state, wayfinding                     |        | role   |         | landed: `de5adb7`, closed on the blind review's own output (pristine-commit walk, guard revert red; the pre-pick-note question ruled fine — zero-pick copy already refuses, a note alone un-rests the bar) |
| U9  | language pass                              |        | role   |         | landed: `e25f417`, closed on the blind review's own output (copy contract byte-unchanged, letter rule proven by computed color, SKILL/README conditional correctly unfired) |
| U3  | release and rebuild                        |        | none   |         | PR merged, the version shipping U4–U9 published and resolving, five pages rebuilt, live check on pr272-design, thread closed |

## Plan

- **Tactical map.** U4: `style.ts` (scope the `.today` paragraph rule),
  `chrome.ts` (scroll-spy, legend key is `seq.ts`), `seq.ts` (per-view
  aria-label), `diagram.ts` (theme follow). U5: `chrome.ts` (chipHue map,
  copy guards, selection guard, note autogrow). U6: `html.ts` (`optOf`
  extract, `verdictFor`), one verdict line each in `seq.ts`, `diagram.ts`,
  `bodies.ts`, `page.ts` (delete `compareHtml` and its call), `style.ts`
  (delete the compare rules), `build.test.ts` pin swap, `SKILL.md`. U7:
  `seq.ts` (delta frames, true step numbers, silent balance run), `style.ts`
  (the stage cap rule), `example.page.js` (G4→seq, G2 body growth),
  `SKILL.md` (one clause), `pictures.test.ts` + `build.test.ts` (pin flips +
  the could-fail delta pin) — `bodies.ts` and `diagram.ts` carry no diff; the
  real `quiet` at `packages/core/src/cli.ts` is a read reference for the
  example's cap. U8: `chrome.ts` + `style.ts` + `page.ts` (sidebar).
  U9: `style.ts`, `html.ts`, `example.page.js`, `SKILL.md`, `README.md`.
  Scoped gate `yarn workspace @v1nvn/rulings run test`; workspace gates
  `yarn test` then `yarn typecheck` at the repo root, ceiling 1 min
  (pre-flight measured 48.5s) — CI typechecks before testing, so both fire.
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
