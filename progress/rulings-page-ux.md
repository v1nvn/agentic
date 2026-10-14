# Rulings — the page's design pass

**Run:** one commit for the rework, one PR, minor release, five rebuilds

## Goal

The rulings page reads as a designed instrument: sidebar navigation with
current-position, today shown once per ruling with option views carrying only
their delta, unmistakable pick affordance and selected state, per-option notes
plus a page note riding the composer, notes entries as rows, group bands,
monospace ledger voice — shipped at v0.50.0 and all five live pages rebuilt.

## Current state

U1 and U2 landed (`ee41b08` + review fixes `d2092f9`, PR #28 merged; the
release cut v0.50.0 green): sidebar nav with active-ruling highlight, today
once per ruling with option views carrying only their diff, loud pick
affordance and selected state, per-option note inputs + page note riding the
copied answer, notes as rows, group bands, mono ledger voice. The surface
audit walked all ten standing rules on live screenshots (dark, light, narrow,
phone, empty and loaded); the blind reviewer's three blocking findings (dead
× chip, highlight key, the today-marked option's missing note input) are fixed
and live-verified. Stopped on the owner's order before U3's rebuilds: the five
pages under `~/.claude/rulings/` still carry their v0.49.0 builds.

## Next step

Rebuild the five pages on `npx -y @v1nvn/rulings@0.50.0` (page.js files need
no edits — the key/quick strip of the last thread already rides admitted),
update the installed plugin, and close the thread with the owner's look at
pr272-design.

## Steps

| id  | unit                                       | model  | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------ | ------ | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U1  | the design pass                            | session |        |         | sidebar nav with active-ruling highlight; content column ~820px; today block once per ruling, option views carry their diff only; explicit Pick affordance + unmistakable selected state (hue border, filled letter, ✓ line); per-option note inputs + page note, both persisted and riding the composer output inline; notes as rows; group bands; mono structural type; snapshots move; determinism byte-identical; scoped + workspace gates green |
| U2  | audit and review                           | session | role   |         | surface-audit run on live screenshots of the rebuilt example (light + dark + narrow) with findings folded or fixed; a blind reviewer confirms behavior preservation (pick/copy/persist/needs/n/accept-quick unchanged in contract, storage migrated) |
| U3  | release and rebuild                        | session | none   |         | PR merged, v0.50.0 published and resolving, five pages rebuilt, live check on pr272-design, thread closed |

## Plan

- **Tactical map.** Scoped: `yarn workspace @v1nvn/rulings run test`; workspace
  gate ceiling 2 min. U3 adds validate + build-skills + set-version --check and
  the five live rebuilds.
- **Invariants that hold.** No fetch on open; no browser dep; emitted HTML
  deterministic; the strict schema untouched; the skill surface follows the page
  (SKILL.md copy updated in the same commit if the answer format changed).
- **Storage migration.** v0.49.0 stored `{"picks":{},"notes":"..."}` — the page
  note moves to its own field; per-option notes add a keyed map; stale shapes
  load without error.

## Design

- The pick letter is the protagonist: letter chips large, hue-coded, the
  composer's chips and the view heads speak the same language.
- The sidebar is the only fixed chrome on wide screens; everything else scrolls.
- One bold move (the ledger voice: monospace structural text), everything else
  quiet.
