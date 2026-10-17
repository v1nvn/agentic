# Rulings — the verdict-table layout

**Run:** one commit per unit, one PR per thread

## Goal

A ruling reads as one decision on one screen: question, one-line stake, two
sentences of today, a verdict table (one row per option — letter, title,
gain, cost fragment; "none of these fit" as its last row) and one picture
region below it. The option is listed exactly once. The pick → chip → Copy
answer format, persistence, needs tracking and the ledger voice are
byte-unchanged. Shipped as a minor release with the five live pages and
the exemplar rebuilt on it.

## Current state

U1–U4, the nit sweep and U6 landed; U7 in flight. Live at 1440 painted:
page 4354px (baseline 8671), rulings 738–1030px (baseline 1533–2643;
paint-time is the real measure — pre-paint undercounts diagrams).

Landed, with evidence: U1 `cd4696d` (verdict table + one stage, consult
rulings folded), U2 `a97d004` (the three folds + three-sentence warning),
U3 `61b7ce6` (look vs pick; its keyboard-exemption hole fixed inside
U4's `a80db17`, watched red), U4 `a80db17` (example + docs; its pin fault
and selector nit fixed in the mermaid fix), the mermaid fix `909fbe4`'s
parent (draw-on-first-visibility boot, `startOnLoad` off, G5 reinstated),
the nit sweep `f64a2ac` (six nits, watched-red proofs), the audit fixes
`909fbe4` (390 table stacks, stake widow, pill shadow; dashed disc and
header band verified non-faults), U6 `b14fc34` (one listing per option —
tab strip dead, rows switch views, stage tags letterless; closed on
review, no blocking).

U5's audit half: 74→76/74 programmatic across dark/light/979/390/
empty/loaded/keyboard, the blind contract review all six points PASS
(answer path byte-diff identical; its two nits are the fix-pass's
already-landed changes, declared), the vision round clean after `909fbe4`.
U6 and U7 change the surface the audit walked — the audit re-runs (the
touched probes at minimum) before the release.

Everything lands closed: the vision-fix round (ghost band, open-bar
pill, row hint, merged-last) passed its blind review on all six points;
the two trailing nits (empty `in` rejected at the schema door, merged-last
taught in Step 7) landed watched-red. Final surface: 148/148 scoped,
enforce green, painted page 4434px. The where-pill/heading overlap and
the look-vs-picked accent pair are accepted cosmetics.

The audit re-run on the U6+U7 surface: 92/92, painted page 4434px (the
none row + note footer cost +20px per ruling, net of the dead rhead
button). The final vision round: all three owner complaints fixed; four
findings — G4's today diagram reserves a blank numbered band for an
option-only step (reads broken), "no picks yet" renders twice when the
390 bar is open, the row-drives-picture signal is inferable not evident,
and the example's merged G3 sits between G1 and G2 down the page. One
fix dispatch takes the four; the where-pill/heading overlap and the
look-vs-picked accent pair are accepted cosmetics for the final report.

Final-report nits: pictures.test.ts's option-diff test name still
promises a "needs chip" its snapshot lacks (pre-existing). U6's
wrap-id dead surface is routed to U7.

## Next step

On the owner's merges (#29 then this PR):
owner's merges (#29 then this PR): retarget the PR base if needed,
dispatch the minor release per references/npm-publishing.md, wait for the
registry, rebuild the five live pages and the exemplar on the published
version, live-check one, close the thread (archive + index delete).

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | ------- | -------------- |
| U1 | one home per ruling — verdict table + one stage | sonnet | role | design | landed: `cd4696d`, closed on the blind review (all criteria PASS, needs carrier confirmed) |
| U2 | the folds — today, notes, long today-code | sonnet | role | | landed: `a97d004`, closed on the blind review (all criteria PASS live, the diff:false seam pinned) |
| U3 | the gestures — look vs pick | sonnet | role | | landed: `61b7ce6`, closed on the blind review; its one blocking finding fixed inside U4's `a80db17` on a green gate, pinned by a watched-red test |
| U4 | example and docs to the new authoring | sonnet | role | | landed: `a80db17` and closed — its routed pin fault and selector nit fixed in the mermaid fix commit, G5 reinstated with it |
| U6 | one listing — the tab strip dies, rows switch views | sonnet | role | | landed: `b14fc34`, closed on the blind review (all seven criteria PASS; wrap-id dead surface routed to U7) |
| U7 | none joins the table, the note joins the ruling | sonnet | role | | landed: `86914d3` + the harness-fix commit (the emitted harness sees the 8 wrap picks again, watched red); closed on the blind review — every criterion PASS live, onotes keys move to ruling ids with load validation, stale keys drop. Original cell: "none of these fit" is the verdict table's last row (dashed n disc, picks n, the rhead button dies), one note input per ruling sits directly under the table (always present, rides the ruling's pick in the answer), per-option note inputs and their CSS die, onotes keys change pick-id → ruling-id (old stored notes drop — break clean), the answer format string stays byte-identical, the dead wrap ids die, SKILL Step 6's note law and README move in the same change |
| U5 | audit, release, rebuilds | sonnet | none | | audit half landed: programmatic 74/74 over the seven states (re-run at 76 after U6), the blind contract review all-PASS, the vision round's findings fixed (`909fbe4`). Re-audit after U7; open: the minor release and the six rebuilds, held for the owner's merges |

## Plan

- **Tactical map.** The U1 wiring (consult-folded): disc and view wraps
  carry `data-pick`, rows carry `data-view` + `data-needs` + hue, the
  merged-ruling early return stays ahead of table and compare, `w` is one
  muted line under the caption. U6 rewired look to the rows alone
  (tabindex + Enter/Space, aria-current; disc and shown picture pick).
  U7: the none row and the ruling note live in the verdict table's box
  (html.ts/page.ts), chrome.ts keys `onotes` by ruling id and rides the
  note on the ruling's pick, style.ts drops the per-row note rules,
  SKILL Step 6 + README move, build/chrome tests + snapshots move. Mocks
  (`progress/.scratch/rulings-wall/`) are pre-U6 reference only. Scoped
  gate `yarn workspace @v1nvn/rulings run test`; workspace gates `yarn
  test` then `yarn typecheck`, ceiling 2 min (pre-flight measured 1m13s).
- **Small rows:** U5 — mechanics only, no code changes; review is none
  because it changes no code, with the audit list guarding the surface.
- **Enforcement inventory.** Determinism byte-identical (no clock, paths,
  randomness); the storage shape `{picks, onotes, note}` holds (U7 moves
  the onotes key semantics pick-id → ruling-id — the shape string, not
  the keys, is what enforce pins); the answer text format string stays
  byte-identical — its assertion values move only where U7's note-home
  change demands, never weakened; no fetch on open; build warnings are
  faults; files touched come out with fewer comment lines; the old
  view-card path and the tab strip are deleted, not shimmed.
  `progress/.scratch/rulings-verdict-table/enforce.mjs` (double-build
  byte-diff, storage shape, no-fetch) runs as every builder's last gate
  step. Checklist: a suite value where two interpretations coincide (raw
  vs stripped length, before vs after a split) is a seam fault — a
  fixture pins it before the gate; comment-line count likewise.
- **Run mechanics.** Branch `rulings-verdict-table` off
  `rulings-fix-pass`; the PR targets main once #29 merges. Rebuild-check
  pages into `progress/.scratch/rulings-verdict-table/` with `--no-open`;
  live checks run programmatic (own headless Chrome over raw CDP; no
  screenshot file is Read through the harness — vision rounds dispatch to
  sonnet subagents).
- **Audit list.** Before the release, after U7: the touched probes of the
  U5 audit re-run (look/keyboard, none, notes, persistence) plus a fresh
  vision round on the rebuilt example (dark, light, 979, 390); the blind
  contract check re-runs on the U7-diff alone (the note-home change).

## Design

- The verdict table is the option's one home and one listing: letter
  disc, title, `★ recommended` / `as today` / `needs` chips, `+ gain` and
  `− cost` fragments in aligned columns — nothing else repeats an
  option's identity. "none of these fit" is the table's last row.
- One picture region per ruling below the table: the row switches the
  shown view; sequence keeps delta rows on the shared frame, bodies shows
  today or an option's diff, mermaid draws on first visibility.
- One note per ruling, under the table, riding whatever is picked — no
  per-option notes.
- `w` keeps its field and renders as one muted line inside the stage; a
  caption opens on its conclusion, never the option's name.
- Gestures: row body is look (click and keyboard); the letter disc and
  the shown picture pick. Flipping views never picks.
- Folds are deterministic: today splits at the second sentence boundary;
  a bodies today block folds past 20 lines with its count in the label.
- The ledger voice, the sidebar with ruled marks and N of M, and the
  resting composer bar survive.
