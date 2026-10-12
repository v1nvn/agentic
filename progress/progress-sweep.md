# Progress sweep — every plan onto the role-agent Steps shape

**Run:** hand-run in sittings, no `/todo:run` dispatch — retired-cell meaning is per-row judgment and the instrument (`/todo:audit`) is owner-invoked; one commit per repo.

## Goal

Every `progress/` plan under `~/git` (two levels deep) is on the todo 0.43.0 Steps shape: `/todo:audit` clean in each of the seven repos, and testril's `references/run-rules.md` folded into the four plans citing it and deleted.

## Current state

Scanned: 34 plan files across seven repos — agentic 4, firstmenu 5, homelab-gitops 2, stonks 5, streamdeck 1, enhansome/webapp 4, ormi/testril 13. Drift: 24 files on the old five-column table (no `consult` column); 15 `checklist` review cells (audit-refactor 5, rules-plugin 4, rulings-port 5, webapp slug-addressing 1); bare `sonnet` model cells carrying the old "mechanical row" meaning; six no-table files (firstmenu resource-monitor, homelab offsite-backups, stonks kite/kotak book reviews + smallcap-battery, testril refund-undelivered) and webapp's `finding/disposition` search-audit table — each ruled by audit, not force-migrated. testril's three x402 files are already on the new shape. Unit 3 landed `304cba6` — the park's trigger fired, audit-refactor un-parked and its `/todo:run` is live. Unit 1 is migrated but uncommitted in homelab-gitops. `tokencount-reader.md`, minted after the scan, is ruled by the no-table clause — a standing watch loop owing no Steps, `/todo:audit` clean over it. The owner ruled the pull — agentic landed first so the audit-refactor run tests the role agents before the mass migration.

## Next step

Owner runs `/todo:audit` in homelab-gitops over unit 1 and commits it — the last gate before units 2, 4–7 fan out.

## Steps

| id  | unit                                                                                                                                      | model | review | consult | close criteria                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------- | -------------------------------------------------------------- |
| 1   | homelab-gitops pilot: threadripper-dev-server onto the new shape                                                                          | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 3   | agentic: audit-refactor, presets-corpus, rules-plugin, rulings-port                                                                       | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 2   | streamdeck: tile-grid-baseline                                                                                                            | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 4   | enhansome/webapp: bge-large-retune, rename-currency, slug-addressing; search-audit's `finding/disposition` table ruled                    | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 5   | firstmenu: claude-usage-plugin, code-smell-splits, popover-consistency-rework, strictness-ratchet; resource-monitor's missing table ruled | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 6   | stonks: india-calibration-audit, source-tiers; the three no-table files ruled                                                             | owner | none   |         | `/todo:audit` clean in the repo; one commit                    |
| 7   | ormi/testril: the ten old-shape plans; `references/run-rules.md` folded into the four plans citing it and deleted                         | owner | none   |         | `/todo:audit` clean in the repo; no `run-rules.md`; one commit |

## Plan

- Cell mapping, pinned against the 0.42→0.43 rules diff: review `checklist` → blank (blind default); model bare `sonnet` (old "mechanical row" marker) → `sonnet/low`; `trivial` rows → a `Small rows:` line in `## Plan`; header `| id | unit | model | review | close criteria |` → `| id | unit | model | review | consult | close criteria |`, consult blank unless a row needs one; review `none` survives only with its low-risk reason named in that file's `## Plan`.
- Review `none` on every row: docs-only, low-risk edits, and the per-repo `/todo:audit` is the review — it walks the rules' clauses over the migrated files.
- No-table files are ruled, not force-migrated: a standing or not-yet-planned thread owes no Steps; audit confirms or flags.
- Scope per repo is what `/todo:audit` flags — the Steps shape first, mechanical index fixes ride along.
- One commit per repo, conventional one-liner: `docs(todo): plans onto the 0.43.0 steps shape`.
- Origin: unit S1 of the run-costs thread (`archive/run-costs.md`) — the close criteria and the `run-rules.md` fold ruling are recorded there. The re-measure entry stays parked on this thread's unit 3 landing.

## Design

- Manual, owner-driven: what a retired cell meant is a per-row judgment (checklist sometimes means blind, sometimes none), and `/todo:audit` is `disable-model-invocation`, so the sweep sitting executes its checks by hand and the owner verifies.
- Un-archiving run-costs rejected: its close followed the deferral rule — this thread and the re-measure carry the leftovers as their own entries.
- Pilot before fan-out: the audit surface was rewritten with 0.43.0 and becomes the close-criterion instrument for 33 files; one cheap repo verifies mapping and instrument agree before the heavy pass.
