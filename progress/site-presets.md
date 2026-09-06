# Site-matched extraction presets

**Goal.** On a class of real pages — consent walls, paywall overlays, client-rendered
shells — `extract` returns chrome junk, gated text, or a fallback dump. Give the server
per-site knowledge: a **preset** (site-matched include/exclude selectors + a staleness
detector set) that the existing pipeline applies, reused across pages of the same site,
suggested by the host LLM only when diagnostics prove the deterministic path lost.
Every piece is gated on real captured pages with measured before/after scores.

**Origin.** Comparison with `tmp/readweb` (2026-09-05) — an LLM-generated per-site CSS
preset loop, demo-grade. Rejected verbatim port, its Firecrawl/OpenRouter fetch path,
and LLM-as-primary-path. Kept: the observation that site-specific selectors beat generic
heuristics on hard pages, and its validator-mediated feedback shape. Ours wires into
abstractions that already exist:

| readweb idea | Our existing path that already does (or can do) the job |
|---|---|
| preset apply (select main content, filter noise) | `SelectorScope {include, exclude}` + `applySelectors` — `packages/readability-mcp/src/pipeline/normalize.ts:234,241` |
| "this page needs help" trigger | `detectGating` (paywall overlay, metered text) — `packages/readability-mcp/src/policy/gating.ts`; plus `explain`'s `fallbackUsed`/candidate scores |
| LLM in the loop | sampling-gated tools — `src/sampling.ts` (the `summarize` pattern); no keys, host-provided model |
| reuse across calls | resource cache pattern — `src/resources.ts` (bounded, hash-keyed) |
| verification | bench harness with scored baselines — `test/bench/` |

**Evidence standard (non-negotiable).** No mechanism lands for a failure class without a
real specimen: a rendered capture of an actual website, a recorded `extract`/`explain`
result showing the deterministic path losing, and a bench before/after. Hand-curated
selector lists (gating.ts style) prove real sites fail generically; presets prove a
*specific* site is now correct.

## Design

0. **Step 0 — validate the whole loop before building any of it (owner, 2026-09-05).**
   Zero server code: the host model plays the suggester by hand, and `extract`'s existing
   `selectors` option plays the preset-apply role. Protocol per hard page:
   capture → run `extract`, record how it fails → propose a `SelectorScope` from
   `explain`/compacted DOM → re-run `extract` with it → judge. Success criteria:
   (a) the real article comes back; (b) deliberately bad proposals (non-matching,
   `nth-*`, generated class names) are rejectable by checks we can codify;
   (c) the same scope extracts a *second* page of the same site — transfer is the real
   bet, and a single `include` may prove page-specific; (d) the DOM material the
   suggester needs fits a sane token budget. The feature list freezes to what the
   spike proves. **Ran 2026-09-05 — outcome in "Step 0 outcome" below; passed with
   amendments.**

1. **Corpus first.** `test/fixtures/` grows rendered captures per failure class, taken by
   the host shell (curl, browser-render fallback for JS shells — same capture path the
   `read-url` skill uses; the server never fetches). Classes to hunt: consent/cookie
   walls (OneTrust, Quantcast, Cookiebot surfaces), member/paywall overlays, client-only
   rendered shells, metered-countdown walls. Run extract+explain over each, tabulate what
   fails and how → feature list freezes to measured classes only. **Step-0 boundary:
   walls that truncate content server-side (WIRED metered, Atlantic Zephr) are excluded —
   no selector can recover text the DOM never had. The huntable class is content-present
   failures: debris, mis-selection, junk interleaved with the article.** Paywalls
   resolve through honest gating reports and the site's own published metadata — no
   circumvention logic, in the server or the capture path (owner, 2026-09-06).
   **Ran 2026-09-06 — corpus tabulation below.** Trim policy (decided when landing the
   first fixtures): `scripts/trim-capture.mjs` drops executable scripts (keeps JSON-LD),
   style payloads, and base64 data URIs; every element and attribute stays — captures
   land at ~170–490KB from ~0.5–1.1MB raw. Capture gotchas: `evaluate_script`'s
   `filePath` output arrives JSON-wrapped — the `read-url` skill now documents the
   unwrap; heavy sites need direct article URLs, long waits, and a scroll pass.
2. **Preset shape.** `{ site, detectors: string[], scope: SelectorScope }` —
   `detectors` are layout fingerprints (nav, footer, logo) that must hit the live DOM or
   the preset is discarded and the normal cascade runs; a stale preset can never win.
   Application is `applySelectors` + the unchanged sanitize/turndown pipeline. No second
   apply mechanism.
3. **Storage.** Local to the user's machine only — a bounded cache directory keyed by
   site (owner decision 2026-09-05: no centralized or global store). The server never
   fetches and never phones home; the cache is ordinary files. Detectors invalidate
   stale entries on mismatch, so nothing needs to expire by clock.
4. **Suggest loop (sampling-gated).** Fires only when diagnostics say lost (gating signal,
   fallbackUsed, near-empty extraction) *and* the host advertises sampling. Loop: model
   proposes selectors → applied through the real pipeline (no toy preview) → deterministic
   validators reject bad proposals → converged preset returned structured + stored, bounded
   steps. Validators: every selector must hit the live DOM; no `nth-*`/`:contains`
   (brittle; rejection must be static — step 0 measured that nwsapi/jsdom *accepts*
   `:contains` and silently applies the result, so an engine error rejects nothing);
   no generated-identifier class names — reject via char-class transition scoring
   (readweb's `dom/identifiers.ts` idea, reimplemented our way) so `.css-1a2b3c` never
   becomes a detector. The step-0 gating false positives (`paywall-ineligible`,
   `is-paywalled`, `offer-header-piano`) are fixed at the source — class/id candidates
   now need the gate noun as head segment with a negation veto — but the trigger still
   pairs `gated` with content-present evidence (near-empty or debris-laden extraction)
   so vendor-SDK classes on unwalled pages can never false-fire it.
5. **Landing.** Each shipped piece = corpus fixture + validator/bench test + baseline update.

## Step 0 outcome (2026-09-05)

### Suggester rehearsal

The host-model-as-suggester role tested cold before any sampling code, under production
constraints: one bounded prompt (chain outline + baseline stats, no article text), one
structured answer, no tools. Suggester: the local 27B model (rounds 1–2); a fresh
host-class subagent was also launched on round-1 material but its run was never recorded
— recorded verdicts are the 27B's. Every proposal judged by the real pipeline on both
Daily Mail captures. Rehearsal prompt kept at
`tmp/site-presets-spike/suggest-prompt.txt`.

- Round 1 material rendered the article node with shorthand (`div[articleBody]`); the
  cold model copied it verbatim, the selector matched nothing, extract returned baseline
  byte-for-byte. Defect is in the material, not the model: the outline must render real
  attributes (`div[itemprop=articleBody]`) so proposals are copy-safe. A suggester
  trusts the outline as literal CSS.
- Round 2 (copy-safe material): the 27B model proposed a validator-clean, working scope
  (`div[itemprop=articleBody]` + carousel/comments/puff/tabbed excludes). Target page:
  parity with the hand-tuned result (382 vs 364 words, junk gone). Transfer: article
  text intact but the in-article video controls, related headline, and fused captions
  survived (1793 words, baseline-level) — that debris holds <200 chars of own text and
  never reaches the outline. Capability floor confirmed; the outline's text threshold
  hides in-article debris.
- Loop implication: one-shot proposing is not sufficient. Step 2 of the loop reports the
  included subtree's remaining blocks and asks for excludes against those — the bounded
  steps the design already assumed. Step 4's bench runs this two-step prompt + validator
  pair over the corpus; its numbers become the suggest-loop baseline.

Untestable pre-build: sampling capability negotiation and structured-output plumbing;
those land with step 4 itself.

### Specimens and verdicts

Specimens in `tmp/site-presets-spike/` (rendered captures + outlines; gitignored, same
treatment as `tmp/readweb`). Three captures, four sites attempted.

- **WIRED metered paywall** (`wired-perseid.html`): baseline extract returns the dek +
  first paragraph + barrier junk ("You've read your last free article" + trial offer),
  180 words; `gated: paywall overlay` fires correctly. The full article exists only in
  JSON-LD (`metadata.structured.articleBody`, already surfaced by the pipeline); the
  rendered DOM is server-truncated and scrolling does not fill it. Best-possible scope
  (`exclude: .journey-unit__container`) only cleans the barrier. **Criterion (a)
  unreachable by selectors → metered walls that truncate server-side are out of scope
  for presets**; their content path is structured metadata, not selection.
- **The Atlantic Zephr paywall** (`atlantic-crayfish.html`): same verdict — body ends at
  `article-end` divider, `hasPart.cssSelector` marks the cut, text beyond it absent from
  the DOM. Two sites confirm the class boundary.
- **Daily Mail debris class** (`dailymail-a66.html`, `dailymail-gatwick.html`): the
  positive case. Content fully in DOM; baseline extract carries video-player control
  text, an embedded related-headline, fused image captions, and a "Preferred Source"
  header. Proposal grounded in `explain` + text-chain outline:
  `{include: 'div[itemprop="articleBody"]', exclude: ['.mol-video', '.vjs-video-container', '.artSplitter']}`.
  Re-extract: junk gone, all paragraphs intact (A66: 1793→1579 words, delta is the
  removed debris; Gatwick: 410→364). **(c) transfer: same scope on the second capture,
  same win.** Traps the chain view caught: `#js-article-text` (the obvious human guess)
  also contains `#reader-comments`; the real body marker is `itemprop="articleBody"`.
  Related-content DOM text outweighs the article ~10:1 (17K+26K vs 4.5K chars) — the
  measured reason generic scoring is fragile here.

Verdicts on the four criteria:

- **(a) Partial, by class.** Works where content is in the DOM (debris class); provably
  impossible where the wall truncates server-side (metered class). Feature list freezes
  to content-present failures.
- **(b) Confirmed rejectable, none rejected today.** Four bad scopes through the real
  pipeline: non-matching include → silent no-op, output identical to baseline;
  `body > div:nth-child(4)` → silent no-op (a matching positional selector would apply);
  `div:contains("article")` → **no error** (nwsapi honors `:contains`, see step-4 fix);
  generated class `div.content_1tsiE` (read off `explain`'s own candidate list) →
  matched and replaced the article with the smart-feed junk list, `readerable: false`.
  All four need static/pre-apply validators; the pipeline alone rejects nothing.
- **(c) Confirmed.** Same scope, second Daily Mail capture, same win.
- **(d) Confirmed.** Text-chain outline (ancestor chains of every node with own text
  ≥200 chars, class/id/itemprop + own/all text sizes) = 2.5K chars ≈ 630 tokens, and it
  carries everything the proposal needed. Raw un-collapsed outline was 5.8K tokens —
  the compact form is the deliverable, not the raw dump.

Two measured defects outside the preset itself:

- `PAYWALL_SELECTORS` `[class*="paywall"]` matches Daily Mail's
  `<html class="article-page paywall-ineligible …">` on free articles — every Daily Mail
  page reports `gated: paywall overlay` falsely. It also survives scoping (gating runs
  before `applySelectors`, `tools/extract.ts:137`). The step-4 trigger "fire when
  diagnostics say lost" would false-fire site-wide.
- `explain`'s candidate list surfaces generated hash classes as top candidates
  (`content_1tsiE`); a suggester that trusts it verbatim poisons the preset. The
  char-class validator must run on candidates, not only on final proposals.

## Corpus tabulation (step 1, 2026-09-06)

Committed fixtures under `packages/readability-mcp/test/fixtures/` (slim-trimmed real
captures; each `saved.test.ts` pins its class). Bench registers all three with
`div[itemprop="articleBody"]` as the human label for the two Daily Mail pages.

| Capture | Class | Baseline extract | Scope applied (step-0 preset) | Verdict |
|---|---|---|---|---|
| `dailymail-a66` | debris | 1882 words; video-control text (`Loaded: 0%`, `Duration Time 1:13`), embedded related headline, fused captions; `fallback: false` | 1660 words, all debris gone, prose intact | positive — the debris class |
| `dailymail-gatwick` | debris (transfer) | 435 words, same junk shapes; Readability picks `#js-article-text` (contains `#reader-comments`) | 386 words, debris gone | positive — same scope transfers |
| `corriere-afd` | consent wall | 857 words, complete article from behind the rendered `privacy-cp-wall`; wall text absent; `fallback: false` | not needed | **negative — extract survives consent walls**; landed as the piano false-positive fixture |

Hunt negatives (measured, not committed as fixtures — no failure to pin):

- **The Sun** (`/news/40285322/…`, 90% furniture by text volume): clean 388-word
  extract, correct title, no fallback. Debris is not site-generic; Daily Mail's
  in-`articleBody` junk is the distinguishing shape.
- **BBC Good Food recipe**: ingredients + all 8 method steps intact (504 words).
  Recipe pages are not a mis-selection specimen.
- **Guardian live blog**: Readability picks `div#liveblog-body` (top candidate by a wide
  margin), 2402 words. Live-blogs are not a mis-selection specimen.
- **WIRED / Atlantic** (step 0, `tmp/site-presets-spike/`): still the excluded
  server-truncated class. `gated` fires correctly on WIRED; Atlantic fires nothing.

Gating false positives measured and fixed this step (own changes, each with its real
fixture): `[class*="paywall"]` on `paywall-ineligible` + ~240 `is-paywalled` feed badges
(Daily Mail), `[class*="piano"]` on `offer-header-piano` furniture (Corriere). Rule now:
a class/id candidate signals only when the gate noun (`paywall`, `piano`) is the head
segment and no segment negates it.

## Open decisions

- `SelectorScope.include` is a single selector (first match); readweb presets carry
  multiple content selectors. Single-include first; extend only when a specimen demands it.
- Whether consent-wall pages may be preset-recovered at all: measured reachable
  (Corriere from a US IP, wall rendered) and extraction already succeeds — but the wall
  gates consent, not payment, and "Rifiuta e abbonati" ties refusal to paying. Owner
  policy call open; no recovery logic built.

**Current state.** Steps 0–2 done. Step 2 landed the preset mechanism:
`src/policy/presets.ts` — the `{site, detectors, scope}` shape, an in-memory store
(`addPreset`/`presetForSite`/`resetPresets`), site keying (lowercased host, one `www.`
strip), and validation on the post-normalize DOM (every detector must hit; the scope
`include` must match — an unmatched include is `applySelectors`' silent no-op, so
reporting `applied:true` over baseline output would be a lie; excludes must parse but
need not match; any throw folds into `detectors-missed`, never a crash). `extract`
resolves the preset inside the normalize stage and applies the scope through the
existing `applySelectors` call — an explicit `selectors` argument wins and reports
`overridden`; `diagnostics.preset = {site, applied, reason?}` surfaces the outcome
(absent when the site has none). `extract_section` opts out via the internal
`resolvePreset:false` worker flag — its heading mode re-serializes a subtree document
whose page fingerprints are gone, so preset resolution there could only produce a false
`detectors-missed`. Bench scores the measured Daily Mail preset as
`<fixtureId>@preset` in its own table/aggregate (never folded into the default
aggregate): precision 1.0 on both captures (default 0.998/0.936), recall 0.846/0.821 —
recall vs the label *drops* because the label is the container **including** its
embedded debris; the removed token delta matches step 1's measured 1882→1660 words.
Nothing writes presets in production yet: the store fills at step 3 (file loader) and
step 4 (suggest loop), so default server behavior is unchanged. The measured class list
is still **debris (Daily Mail) alone**; `explain` still surfaces generated hash classes
as top candidates (step-4 validator must run on candidates, not only final proposals).

**Next step.** Storage (step 3) stays gated on corpus widening: more debris sites (The
Sun *with* embedded video, Mirror, regional DM titles) to test transfer across site
families, and a second pass at mis-selection. Two obligations recorded for step 4: (1)
fold a **store-generation counter** (bumped by `addPreset`/`resetPresets`) into the
cache args fingerprint — not the resolved scope, which would need a second document
parse and would conflate applied vs missed runs under one key; (2) keep preset
resolution **out of `explain`** so the suggester sees the pre-preset DOM and can
actually propose an improvement.

**Log.**
- 2026-09-05 — thread opened from the readweb comparison; anchors verified in source
  (`applySelectors`, `detectGating`, sampling gate, bench harness) before writing.
- 2026-09-05 — owner confirmed the storage direction (local, user's machine, no central
  store) and set step 0: validate the flow end-to-end before building. Spike costs zero
  server code because `extract` already accepts `selectors`; the host model stands in
  for the suggester by hand.
- 2026-09-05 — step 0 ran on WIRED (metered), The Atlantic (Zephr), Daily Mail ×2
  (debris/transfer). Four criteria judged; class boundary drawn; `:contains` assumption
  corrected; gating false positive and `explain` hash-candidate defect measured.
- 2026-09-05 — suggester rehearsal ran cold (see "Step 0 outcome"); material must be
  copy-safe, one-shot proposing insufficient, two-step loop confirmed as the design.
- 2026-09-06 — owner: skip the step-4 thin slice for now, corpus work goes first. Real-path
  validation of the suggest loop needs the sampling seam built — that lands with step 4.
  Paywall-bypass logic declined as out of scope; the boundary is written into step 1.
- 2026-09-06 — step 1 ran. Fixtures landed: dailymail-a66, dailymail-gatwick,
  corriere-afd (slim-trimmed via `scripts/trim-capture.mjs`; trim policy decided).
  Gating fixes shipped as own changes: paywall state markers (`paywall-ineligible`,
  `is-paywalled`, `is-paywall-processed` — the third found by token census, not in the
  step-0 notes) and piano offer headers (`offer-header-piano`, found on the Corriere
  hunt). Hunt negatives recorded: Sun, BBC Good Food, Guardian live, Corriere consent
  wall. `read-url` skill corrected on the JSON-wrapped capture gotcha.
- 2026-09-06 — step 2 ran. Preset mechanism landed through the existing apply path:
  `policy/presets.ts` (shape + store + validation), `extract` seam, `diagnostics.preset`,
  `extract_section` opt-out; 12 unit + 8 end-to-end tests over the committed fixtures;
  bench preset scenarios (`@preset` keys, own table). Measured detectors are the
  article-template containers (`#js-article-text`, `.artSplitter`), not the nav/footer/
  logo example — that is what the one measured class actually keys on. Cache
  fingerprint left untouched (no mid-process writer exists; step-4 obligation recorded
  above).
