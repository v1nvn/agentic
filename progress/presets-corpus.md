# Site presets — real-world corpus and backlog

## Goal

Extraction that serves the daily workload — stonks research on the Indian financial web — with per-site presets where generic extraction loses. The `suggest_preset` loop is shipped; the corpus feeds it and measures everything else. Design record: `archive/site-presets.md`.

Done means: every loss in the corpus is fixed with its fixture proving it (preset-able losses through `suggest_preset`, pipeline-level losses through extraction work), and the backlog rows below are landed or ruled out.

The corpus standard: no fixture without a failure. Capture (browser render → `scripts/trim-capture.mjs`) → baseline `extract` + `explain` recorded → the loss it proves stated → fixture + human label + bench row. One fixture per failure class; hunt negatives are recorded even when nothing fails. Losses land as scored rows — tracked debt, never a red bench. Server-side-truncated paywalls stay excluded — no selector recovers text the DOM never had. The corpus grows only when a real stonks read misbehaves: capture it instead of tolerating it.

Target classes:

| Source shape                  | Sites                                           | Hypothesized class                                                              |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| Fundamentals tables           | screener.in company pages                       | table-heavy output; `tables` option under test                                  |
| Announcements / filings lists | NSE/BSE corporate filings pages                 | list/feed detection                                                             |
| Market articles               | Moneycontrol, Economic Times, Business Standard | heavy debris + CMP consent walls; some server-truncated paywalls (out of scope) |
| IR press releases             | newsroom pages of held names                    | one-off layouts; preset candidates                                              |
| Live quote / ticker pages     | NSE/BSE quote pages, Google/Yahoo Finance       | client-rendered shells — browser-render captures only                           |
| Rating rationales             | CRISIL/ICRA/CARE pages                          | document-adjacent HTML around PDF links                                         |

The stonks repo's Tier-2 source allowlist (`progress/source-tiers.md` there) names the sources real usage reads; every allowlisted source whose extraction loses becomes a fixture here, and `suggest_preset` turns it into a validated per-site adapter.

## Current state

The corpus holds six captures, one per target class, browser-rendered through the live path and trim-captured. All six are registered in the bench with human main-content labels; the list-detector guard classifies five as composite.

| Fixture                   | Class               | Verdict                                                                                                                                                                                                           |
| ------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screener-reliance`       | fundamentals tables | **Loss.** Row labels wrapped in `<button>` vanish on the article path (`Readability._clean(…"button")`) — quarterly/balance-sheet rows keep numbers, lose names. `extract_tables` labels every row.               |
| `bse-announcements`       | filings feed        | **Loss.** 200 records fuse into one prose blob on the article path; `extract_list` reports the sidebar nav (`ul.ullist`), not the table. The PDF links exist only as `onclick` handlers — out of reach by design. |
| `moneycontrol-rvn-order`  | market article      | **Hunt negative.** Full body lands, furniture stays out.                                                                                                                                                          |
| `tcs-porsche-release`     | IR release          | **Hunt negative.** Body lands without a preset.                                                                                                                                                                   |
| `gfinance-reliance-quote` | quote shell         | **Loss.** Quote card lost — extraction returns a 17-word sector-table fragment; `main` scope recovers the name, not the card.                                                                                     |
| `crisil-ril-rationale`    | rating rationale    | **Loss.** Word-export sibling tables: Readability roots at a single `<tr>` and amputates the document — only the About block survives, reported as a healthy extraction.                                          |

All four losses are pipeline-level, not preset-able.

Held until evidence demands them: multi-include scopes (no specimen demands it); the `AwrJE`-shaped lint residual (defended upstream; revisit only on a real self-poisoning proposal).

## Next step

Triage the four pipeline-level losses (steps 1a–1d): pick the first to fix and its approach.

## Steps

| id  | unit                                                                                                                                                                                                                                 | model | review | close criteria                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | ------------------------------------------------------------------- |
| 1a  | `screener-reliance` — keep `<button>`-wrapped row labels on the article path                                                                                                                                                         |       |        | fixture scores the row names present                                |
| 1b  | `bse-announcements` — detect the filings table as the list, not the sidebar nav                                                                                                                                                      |       |        | fixture scores the records as a list                                |
| 1c  | `gfinance-reliance-quote` — recover the quote card                                                                                                                                                                                   |       |        | fixture scores the card present                                     |
| 1d  | `crisil-ril-rationale` — root Word-export sibling tables at the document, not one `<tr>`                                                                                                                                             |       |        | fixture scores the full body                                        |
| 2   | Live preset reload — the loader runs once at `createServer` (`preset-cache.ts`); a preset written by one running server is invisible to another until restart. `fs.watch` on the presets dir, debounced, re-entering `loadPresetDir` |       |        | a preset written by one server is served by another without restart |
| 3   | Per-site generation counter — one global counter busts every cached extraction on any store mutation; `Map<site, generation>` keeps the pre-preset-never-served-post-preset property without the all-site miss                       |       |        | a mutation for one site leaves other sites' cache entries hot       |
| 4   | Stale-preset retirement — a redesigned site leaves a dead `<site>.json` reporting `detectors-missed` forever; a `remove_preset` tool (or prune after N consecutive misses) closes the loop `suggest_preset` opened                   |       |        | a dead preset can be removed                                        |
| 5   | Gating recall for suffix-named surfaces — `article-paywall` / `content-paywall` no longer signal (`policy/gating.ts` head-noun rule). Specimen-gated: extend only with a captured real gate                                          |       |        | a captured real gate fixture signals                                |
| 6   | Debris-probe growth — probes are two Daily Mail player patterns + barrier phrases (`policy/lost-signal.ts`). Specimen-gated: one capture per new probe                                                                               |       |        | each new probe has its capture                                      |
| 7   | Consent-wall recovery policy                                                                                                                                                                                                         | owner |        | owner ruling recorded here                                          |
