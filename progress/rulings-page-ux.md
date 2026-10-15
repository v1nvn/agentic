# Rulings — the page's fix pass

**Run:** one PR; the minor release and the five rebuilds ride the final unit

## Goal

The page reads as a working instrument: no render defect, one home per option
(gain and cost beside the picture), option views carrying their delta, a
composer bar that rests small, pick state visible in the sidebar — shipped,
the five live pages rebuilt on it, and the owner's look passes.

## Current state

U1 and U2 landed (`ee41b08` + `d2092f9`, PR #28, v0.50.0 green). The owner's
look at the rebuilt example found the UX still poor; a three-round
investigation (session code walk + live probes, surface-audit skill,
frontend-design skill, all on live screenshots) confirmed it and minted the
fix list as U4–U9. Four hard defects: the bare `.today` paragraph rule
squeezes every today view card to 68ch (G1a 621px beside its 812px sibling,
the seq ledger's last two columns off-screen at 1440); the composer chip dots
resolve `var(--o-a)`, which the stylesheet never defines — `--opt-a` is the
variable — so the chip letters render white-on-nothing; the sidebar
scroll-spy clears `.here` only on intersect, so scrolling up leaves the mark
stale; every `svg.seq` takes `aria-label` from the ruling's base cap, so G1b's
picture announces today's conclusion. Structural: each option renders twice
(view card + compare column) with gain/cost only in the matrix below all
pictures; G4's three whole-chain mermaid cards are ~39% of the page's height;
the bar occludes the bottom ~100px at desktop and ~a third of a 390×844
viewport; no pick state or N-of-M progress anywhere; below 980px the sidebar
vanishes with nothing replacing it. Smaller: copy with zero picks says
"Copied", the clipboard promise has no hang guard, drag-selecting caption text
toggles the pick, the persisted page note renders clipped, mermaid's theme is
read once at load, "★ my pick" / "✓ picked" / "accept ★ recommended" are three
names for two meanings, the letter is outlined in cards but filled in bodies
stage tags, the shipped example's captions speak authoring vocabulary, the
merged sentence prints twice, an option without `w` leaves a hole in the
matrix, and mono structural text runs five sizes 11–13px. The five pages under
`~/.claude/rulings/` still carry v0.49.0 builds.

## Next step

Run U4.

## Steps

| id  | unit                                       | model  | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------ | ------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | the design pass                            | session |        |         | landed: `ee41b08` + `d2092f9`, PR #28, v0.50.0                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| U2  | audit and review                           | session | role   |         | landed: surface audit + blind review fixed and live-verified, same PR #28                                                                                                                                                                                                                                                                                                                                                                                                                          |
| U4  | render defects — today card, sidebar, aria | session | role   |         | every `.view.today` card spans the same width as its siblings and its stage shows the whole diagram at 1440 (G1a's three ledger columns visible without panning — the paragraph rule scoped so it cannot land on views); scrolling back above the first ruling leaves no `.here` mark in the sidebar; each option svg's accessible name is its own view's caption (G1b announces the Option b sentence); a view with no changed rows carries no "what this option changes" legend key; mermaid follows a system scheme flip without reload; snapshots move; determinism byte-identical; scoped + workspace gates green |
| U5  | composer defects — chips, copy, notes      | session | role   |         | chip dots carry their option's hue with a visible letter (class→variable mapped to `--opt-a`); Copy with zero picks is refused with a visible message, never "Copied"; the clipboard path always acknowledges or reports failure within a bound (no unguarded pending promise); a drag-select inside a card leaves the pick unchanged; the page note grows on input and shows whole after reload; storage shape `{picks, onotes, note}` unchanged; snapshots move; gates green |
| U6  | one home for gain/cost                     | session | role   | design  | each option's `w`, gain and cost render exactly once, in the same block as its picture; no ruling renders an option in two places; the compare matrix as a separate block is gone or folded per the consult's direction; reading one ruling top-to-bottom never leaves the picture to find its gain/cost; snapshots move; gates green |
| U7  | deltas not twins                           | session | role   | design  | a ruling draws today's picture once; each option view carries only its delta against it (seq: changed/new/gone rows banded on shared frame or delta-only frames; diagram: shared nodes, changed node tinted; bodies stays the model) per the consult's direction; the diff collapse fires for short bodies or the threshold is sized so it can; a diagram stage caps to its diagram's width; the example's G4 section is no longer ~39% of the page; snapshots move; gates green |
| U8  | bar, state, wayfinding                     | session | role   |         | the bar's resting state with no picks is a strip ≤ ~48px and expands on first pick; at 390px it collapses to a chip count that opens the bar; the sidebar marks each ruled ruling and states N of M ruled (masthead or sidebar); below 980px a wayfinding affordance reaches the current group/ruling; keyboard and focus behavior preserved; snapshots move; gates green |
| U9  | language pass                              | session | role   |         | the author's recommendation and the owner's pick carry distinct plain names ("recommended" / "picked") everywhere including the quick button; the letter follows one rule — outlined until picked, filled when picked — across view heads, stage tags, compare and chips, and the chip prints the letter once; today cards have one shape across rulings; the shipped example's captions and placeholders speak to the reader (no engine vocabulary, no `· n` chat syntax, no "rides the answer"); mono structural text uses two sizes; the merged sentence appears once; an option without `w` leaves no visible hole; SKILL.md and README follow in the same commit |
| U3  | release and rebuild                        | session | none   |         | PR merged, the version shipping U4–U9 published and resolving, five pages rebuilt, live check on pr272-design, thread closed |

## Plan

- **Tactical map.** U4: `style.ts` (scope the `.today` paragraph rule),
  `chrome.ts` (scroll-spy, legend key is `seq.ts`), `seq.ts` (per-view
  aria-label), `diagram.ts` (theme follow). U5: `chrome.ts` (chipHue map,
  copy guards, selection guard, note autogrow). U6: `page.ts` (`viewsOf`,
  `compareHtml`) + `style.ts`. U7: `seq.ts`, `diagram.ts`, `bodies.ts`
  (collapse threshold) + `example.page.js` where the example's content must
  show the mechanism. U8: `chrome.ts` + `style.ts` + `page.ts` (sidebar).
  U9: `style.ts`, `html.ts`, `example.page.js`, `SKILL.md`, `README.md`.
  Scoped gate `yarn workspace @v1nvn/rulings run test`; workspace gate
  ceiling 2 min. U3 adds validate + build-skills + set-version --check and
  the five live rebuilds.
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
