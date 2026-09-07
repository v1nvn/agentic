# Site presets — real-world corpus and backlog

**Goal.** Extraction that serves the daily workload — stonks research on the
Indian financial web — with per-site presets where generic extraction loses.
The suggest loop ships in 0.18.0; the corpus is what feeds it and measures
everything else. Design and run history: `archive/site-presets.md`.

## Standard

No fixture without a failure: capture (browser render →
`scripts/trim-capture.mjs`) → baseline `extract` + `explain` recorded → the
loss it proves stated → fixture + human label + bench row. One fixture per
failure class; hunt negatives recorded even when nothing fails. Losses land as
scored rows — tracked debt, never a red bench.

Server-side-truncated paywalls stay excluded — no selector recovers text the
DOM never had.

## Target classes (stonks workload)

| Source shape | Sites | Hypothesized class |
|---|---|---|
| Fundamentals tables | screener.in company pages | table-heavy output; `tables` option under test |
| Announcements / filings lists | NSE/BSE corporate filings pages | list/feed detection |
| Market articles | Moneycontrol, Economic Times, Business Standard | heavy debris + CMP consent walls; some server-truncated paywalls (out of scope) |
| IR press releases | newsroom pages of held names | one-off layouts; preset candidates |
| Live quote / ticker pages | NSE/BSE quote pages, Google/Yahoo Finance | client-rendered shells — browser-render captures only |
| Rating rationales | CRISIL/ICRA/CARE pages | document-adjacent HTML around PDF links |

The stonks repo's Tier-2 source allowlist (`progress/source-tiers.md` there)
names the sources real usage reads; every allowlisted source whose extraction
loses becomes a fixture here, and `suggest_preset` turns it into a validated
per-site adapter.

## Queue

1. **Triage the seeded findings:**

   | Fixture | Class | Verdict |
   |---|---|---|
   | `screener-reliance` | fundamentals tables | **Loss.** Row labels wrapped in `<button>` vanish on the article path (`Readability._clean(…"button")`) — quarterly/balance-sheet rows keep numbers, lose names. `extract_tables` labels every row. |
   | `bse-announcements` | filings feed | **Loss.** 200 records fuse into one prose blob on the article path; `extract_list` reports the sidebar nav (`ul.ullist`), not the table. The PDF links exist only as `onclick` handlers — out of reach by design. |
   | `moneycontrol-rvn-order` | market article | **Hunt negative.** Full body lands, furniture stays out. |
   | `tcs-porsche-release` | IR release | **Hunt negative.** Body lands without a preset. |
   | `gfinance-reliance-quote` | quote shell | **Loss.** Quote card lost — extraction returns a 17-word sector-table fragment; `main` scope recovers the name, not the card. |
   | `crisil-ril-rationale` | rating rationale | **Loss.** Word-export sibling tables: Readability roots at a single `<tr>` and amputates the document — only the About block survives, reported as a healthy extraction. |

   Preset-able losses → `suggest_preset`; pipeline-level losses (all four) →
   extraction work with the fixture proving it. The corpus grows only when a
   real stonks read misbehaves: capture it instead of tolerating it.

## Backlog — mechanics (no specimen needed)

- **Live preset reload** — the loader runs once at `createServer`
  (`preset-cache.ts`); a preset written by one running server is invisible to
  another until restart. `fs.watch` on the presets dir, debounced, re-entering
  `loadPresetDir`.
- **Per-site generation counter** — one global counter busts every cached
  extraction on any store mutation; `Map<site, generation>` keeps the
  pre-preset-never-served-post-preset property without the all-site miss.
- **Stale-preset retirement** — a redesigned site leaves a dead `<site>.json`
  reporting `detectors-missed` forever; a `remove_preset` tool (or prune after
  N consecutive misses) closes the loop `suggest_preset` opened.

## Backlog — specimen-gated (no fix without a real capture)

- **Gating recall for suffix-named surfaces** — `article-paywall` /
  `content-paywall` no longer signal (`policy/gating.ts` head-noun rule).
  Extend only with a captured real gate; do not loosen from imagination.
- **Debris-probe growth** — probes are two Daily Mail player patterns + barrier
  phrases (`policy/lost-signal.ts`); one capture per new probe.

## Open decisions

Consent-wall recovery policy (owner call); multi-include scopes (no specimen
demands it); `AwrJE`-shaped lint residual (defended upstream; revisit only on a
real self-poisoning proposal).

**Log.**
- 2026-09-07 — branch review split the thread: design doc to `archive/`,
  follow-ups and corpus opened separately.
- 2026-09-07 — merge blockers landed on `feat/suggest-scope`: presets verify on
  a `secondPath` capture and refuse a capture whose canonical host differs from
  `baseUrl`; train bumped to 0.18.0 (671/671, typecheck + lint clean). The two
  files re-joined into this one; next is the merge, then seeding.
- 2026-09-07 — `feat/suggest-scope` merged to main (`e9e784f`); release
  workflow published 0.18.0 and cut `v0.18.0` — the pin resolves to the build
  with the loop. Branch deleted. Seeding is next.
- 2026-09-07 — corpus seeded in one sitting: one page per target class,
  browser-rendered through the live path and trim-captured (four losses, two
  hunt negatives above). All six registered in the bench with human main-content
  labels; the list-detector guard classifies five as composite. 719/719,
  typecheck + lint clean. Next: triage the four losses.
