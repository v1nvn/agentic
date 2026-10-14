# Rulings — the interactive page returns

**Run:** one commit per unit, one PR for the thread

## Goal

The rulings page selects again: click-to-pick per ruling with a persisted pick
state, an answer composer with a Copy button, a notes input, the none-of-these n
button, and per-group accept-recommended — all vanilla JS in the emitted page,
storage under the page's `key`; a sticky nav-tree returns; the `?theme=` machinery
dies (`prefers-color-scheme` alone); the five live pages carry `key`/`quick` again
and rebuild on the released train; shipped as v0.48.0.

## Current state

V1 closed (`10ee47e`) and V2 closed (`49e0905`), both review-pass with no
blocking findings. The interactive chrome is live in the emit: data-pick views,
none button, accept-recommended on quick groups, needs-unmet chips, composer bar
with notes + copy (picks first, blank line, notes), persistence under the page
key on `<body data-key>`; sticky nav-tree, static under 900px; theme.ts deleted,
`prefers-color-scheme` alone. V3 closed (`a057edf`; review pass, no blocking findings). Nits open for
`/todo:review`: schema.test.ts:50-51 dead `Q` half; :57 empty-key asserts via
allText; page-`quick`/group-`key` asymmetry unpinned; a quick group with zero
`rec` options emits a no-op accept button (page.ts:244-246); "collapse" under
900px is unstuck, not shrunk — the V5 live check looks once at a narrow
viewport; chrome.ts:49 non-string stored letter passes `LIVE[k][p[k]]`
(hostile-storage only); plus the port thread's eight (archive/rulings-port.md).

## Next step

On V3's review: V4 — rebase onto main (v0.48.0), PR, merge, minor dispatch
cutting v0.49.0 — then V5, the five pages re-keyed and rebuilt on `@0.49.0`,
closing with the orchestrator's live check on pr272-design (selection, copy,
notes, n, accept-quick, narrow-viewport nav).

## Steps

| id  | unit                                       | model      | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------ | ---------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | schema: `key` and `quick` re-admitted      | sonnet/low |        |         | the schema admits page-level `key` (non-empty string) and group `quick` (boolean); every other unknown key still rejects — the `when`/`withdrawn`/legacy-field red fixtures all stay red; the flipped fixtures assert admission (a page carrying `key` parses green, a group carrying `quick` parses green, `keys:` plural still red); scoped vitest green; enforcement gate script written once into `progress/.scratch/rulings-interactive/gate.sh` (no browser dep anywhere in `packages/rulings/package.json`, `set-version --check`, `plugin validate`) and green — landed `10ee47e`; review pass on a clean clone (adversarial red probes: page-level `quick`, group-level `key`, both polarities of `quick`, `key: ''`/`7` all reject), no blocking findings |
| V2  | the interactive page, nav-tree, theme cut  |            |        |         | the emitted page carries one vanilla-JS block, no new deps: clicking a view card picks that ruling's letter (one pick per ruling, toggle off allowed), the pick summary lists current picks, the composer assembles `G3a, G4b…`, a Copy button copies it plus the notes textarea's text, the n button adds a virtual `G<n>` pick (authored letters never n — unchanged), each `quick` group gets an accept-recommended button, an option whose `needs` target is unpicked shows its dependency and the composer names it unmet until picked; picks and notes persist in localStorage under the page's `key`; a sticky nav-tree (groups, ruling links) shows desktop-wide and collapses under ~900px; the `?theme=` param, `data-theme`, and `:root[data-theme]` block are deleted — `prefers-color-scheme` alone decides, mermaid's boot follows it; emitted-HTML snapshots updated, two rebuilds byte-identical, scoped vitest + workspace gate green — landed `49e0905`; review pass on an adversarial stub-DOM drive (pick/move/unpick/none/accept-quick/unmet/persist/keyless all verified in the artifact), no blocking findings |
| V3  | the skill surface follows the page         |            |        |         | SKILL.md's answer protocol gains the click-then-copy flow (typed picks still read verbatim), the n-button sentence returns, the notes input is named; the cut list keeps "For the owner" and the AskUserQuestion floor; `plugin validate` + `build-skills.mjs` + `set-version --check` green — landed `a057edf`; review pass (every surface claim checked against the shipped chrome.ts; 6 pin lines byte-identical), no blocking findings |
| V4  | release                                    | owner     | none   |         | orchestrator ops, no diff to review: rebase onto main (already at v0.48.0 from `notify`), PR merged, `gh workflow run release.yml -f bump=minor` cutting v0.49.0, green on `npm view @v1nvn/rulings@0.49.0 --prefer-online` |
| V5  | the five pages re-keyed and rebuilt        | sonnet/low |        |         | every `page.js` under `~/.claude/rulings/` carries its `key` again (todo-run-cost-fixes, run-costs-plan-doors, enhansome-search-audit-2026-10, rulings-function-library-2026-10-12, rulings-testril-pr272-design) and `quick` where it was (enhansome-search-audit groups rank+surface, pr272-design groups fns+core+tests); all five rebuild exit 0 via `npx -y @v1nvn/rulings@0.49.0`; the orchestrator live-checks selection, copy, notes, n, and accept-quick on pr272-design in a browser |

## Plan

- **Sequencing.** V1 → V2 → V3 strict; V4 after the PR; V5 after v0.48.0 resolves.
- **Behaviors, not a port.** The old engine is gone; this plan's V2 cell is the
  contract. Design freedom inside it goes to the builder; the orchestrator's
  closing live check is the surface's verdict (one look, not a gate — the
  snapshot and exit code stay the correctness doors).
- **Tactical map.** Workspace gate `yarn typecheck && yarn lint && yarn test`,
  ceiling 2 min (measured ~1 min all week). Scoped: `yarn workspace @v1nvn/rulings
  run test`. V3 adds `claude plugin validate packages/rulings` + `node
  .github/scripts/build-skills.mjs`. V4–V5 live outside the repo.
- **Enforcement inventory.** No browser dep may enter the package; unknown-key
  red everywhere except the two re-admitted fields; emitted-HTML snapshot green;
  byte-identical rebuild; `set-version --check`; `plugin validate`;
  `build-skills.mjs`.
- **Stop rules.** Interaction logic that needs a dep (framework, storage lib) →
  stop and surface. A test that would need jsdom → do not write it; pin the
  emitted HTML instead.
- **PR.** One branch `rulings-interactive`, one PR, base main. The merge order
  stands: no bootstrap needed (name trusted since v0.46.3).

## Design

- **The file stays an artifact.** Determinism holds: the script and chrome are
  static text in the emit; all mutable state lives in localStorage keyed by the
  page's `key`. Old picks from before the port resurface if the browser still
  holds them under the same key — accepted.
- **One theme behavior.** The system decides light or dark; there is no theme
  feature. Mermaid's boot reads `matchMedia`, nothing else.
- **`/rulings:consult` stays.** A marketplace plugin's skill prefix is
  irremovable; bare `/rulings` meant the personal-skill home the port replaced.
