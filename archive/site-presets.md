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
   stale entries on mismatch, so nothing needs to expire by clock. **Ran 2026-09-06 —
   loader landed in `src/preset-cache.ts`, wired at boot; outcome in Current state.**
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

**Landed mechanism (steps 2–3).** Step 2 landed the preset mechanism:
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

Step 3 landed storage as a **loader** (owner moved it ahead of the corpus widening the
previous state had gated it on): `src/preset-cache.ts` reads one `<site>.json` per
site into the same in-memory store at server start. Directory: `$READABILITY_MCP_PRESETS_DIR`,
else `$XDG_CACHE_HOME/readability-mcp/presets`, else the platform cache root
(`~/Library/Caches/readability-mcp/presets` on macOS, `~/.cache/…` elsewhere); an
empty env value disables loading entirely. Files that don't parse, fail shape
validation (non-empty `detectors`, `site` a real hostname, `scope` carrying `include`
or `exclude` — an empty scope would apply nothing while reporting `applied:true`), or
name a non-host site skip with a warning, never a boot failure; the directory is
bounded at 64 files with
oldest-by-mtime pruning at load. Staleness stays detector-based — no clock expiry —
so a loaded stale preset reports `detectors-missed` per page exactly as an
`addPreset` one does. Wiring: `createServer` loads before the first tool call, and
`dev.ts` re-loads on every hot reload (the vite module runner re-evaluates the graph,
so without the refill the store would silently empty on the first source edit).
Verified live in both boots: built binary over stdio (preset file → `applied:true`,
debris gone; empty dir → no preset diagnostic, debris kept) and a running `yarn dev`
session where writing the file *between* boot and a watcher-triggered reload flips
the next extract from no-preset to `applied:true`. Files land by hand in the
documented format, or through step 4's `suggest_preset` writer.

## Step 4 outcome (2026-09-06)

**Corpus widening.** Three fixtures landed alongside the loop. The Sun *with*
embedded video stays a hunt negative: the Brightcove player sits outside the text
container, extraction is clean (433 words), only a "Most read in The Sun" header
and a "Comment now" link leak (~12 words). `dailymail.co.uk` is unreachable from
this network (connection timeout) — the regional slot went to a US-desk `dailymail.com`
capture (`dailymail-aa-ducttape`): 14 video nodes plus a Connatix player, extraction
already clean, landed as the negative control with a `@preset` transfer row (the
measured detectors all hit a third DM page). The Mirror is the second-site positive:
Reach template, content complete, furniture interleaved — breadcrumb nav, a
"Preferred Source on Google News" promo, and commercial "Article continues below"
boxes inside `article#article-body` (baseline 420 words, ~10% junk). Scope
`article#article-body` + `[class*="commercial"]` cleans both Mirror captures
(420→411, 605→599 words); both landed as fixtures (`mirror-costa-dorada`,
`mirror-ecoli` = transfer). An apparent new gating false positive on the AA page
turned out to be the *installed* plugin server running the published (pre-step-1)
build — the workspace code is clean; corpus baselines now run through the workspace
worker, never the session's plugin tools.

**Validators** (`policy/identifiers.ts`, `policy/selector-lint.ts`). Char-class
transition scoring ported from readweb (22 labeled cases pass unchanged) with one
strengthening: the whole token **and** every delimiter-separated segment must clear
the 0.3 threshold — `BoxStyles_commercial__Wo6Z4` scores 0.252 whole but carries the
build hash as a segment (`Wo6Z4` 1.075). Known residual: a short digit-free hash
(`AwrJE`, 0.225) reads as a name to the transition table; the defense is upstream —
the outline never renders such classes, so the suggester cannot copy them. Static
rejection covers the full positional family (`:nth-*`, `:first/:last/:only-child`,
`-of-type`) and `:contains` (nwsapi honors it silently). Propose-time DOM checks are
stricter than runtime: include and detectors must hit, proposed excludes must hit on
the page they were proposed from, and no exclude may shadow the include root
(excludes run before include in `applySelectors` — an ancestor match deletes the
root and the include then quietly no-ops). `selectorMisses` is exported from
`presets.ts` as the one shared throw-is-a-miss predicate.

**Lost signal** (`policy/lost-signal.ts`): `fallbackUsed` OR word count < 120 OR a
debris probe over the extracted text (`Loaded: N%`, `Duration Time m:ss`, the metered
barrier phrases). A gating signal alone never fires — the pairing the spec demands is
enforced by construction: `gatedReason` rides as prompt/report evidence only. The
120-word floor is anchored to the corpus (smallest healthy extract 435; smallest
known-lost 180, caught by the barrier probe, not the size floor).

**Material** (`policy/outline-chains.ts`): built from the post-normalize document,
identically to what extraction normalizes. Round one renders the step-0 chain view
(≥200 own chars, real attributes — `div[itemprop="articleBody"]`, never shorthand —
hash classes filtered at render so they cannot be copied). Round two applies the
accepted include **alone** and renders the subtree's remaining blocks (≥40 own chars)
grouped by chain with count, range, and an 80-char sample: a66's 59 prose paragraphs
collapse to one line while the embedded related headline (`.vjs-title-text` inside
`.mol-video`) and the 11 caption figures stand out individually — the debris the
200-char view measurably hides.

**Loop** (`tools/suggest-preset.ts` + `host-sampling.ts`): registered inside the
sampling-gated family (no `dev.ts` wiring). Baseline extract with caching off →
trigger → round one (detectors + include; validator rejections fed back verbatim;
unparseable model replies are retryable rejections) → round two (excludes) →
`addPreset` → verification extract through the real preset path → converged iff the
preset applied **and** the extraction comes back clean; non-convergence removes the
preset and persists nothing. Sampling calls are bounded (budget visible in the
output, `budgetExhausted` distinct from a clean stop). `host-sampling.ts` owns the
`createMessage` seam (summarize converged onto it) and sets a 300s request timeout —
the SDK's 60s default cannot host a model round.

**Obligations landed:** store-generation counter (`presetGeneration()`) folded into
the cache args fingerprint, with the load-bearing test (a cached baseline entry plus
`addPreset` → miss, not the pre-preset result); `removePreset` for rollback; the
explain pin test (`addPreset` → explain output deep-equal to pre-preset, including
the snapshot).

**Bench:** `@suggest` rows (`test/bench/suggest-scenarios.ts`) replay the recorded
accepted proposals through the loop's own validators — static lint, the preset-level
match contract (excludes parse-only: the gatwick capture legitimately lacks
`.mol-video`, so the stricter propose-time rule does not apply to replays), and the
material budget. Precision 1.0 on both DM captures (identical to `@preset` — the
loop reproduces the hand-tuned outcome), 0.993/0.992 on the Mirror pair (default
0.960/0.994). The precision-holds guard carries a 0.01 tolerance: serializations
fuse adjacent inline nodes differently ("her son" + "07:47" → one token on one side).

**Live run (built binary, real local model as suggester).** `suggest_preset` on the
a66 fixture: trigger fired on `debris:player-controls`; the 27B model proposed
include `div[itemprop="articleBody"]` with excludes `div#socialLinks`,
`div#reader-comments`, `div.shareArticles`, `div.news.tabbed-headlines`,
`div.moduleFull.mol-video`, `p.imageCaption` and detectors `#js-article-text`,
`#content`, `.articleWide` — all validated, two sampling calls of four, 106s.
Converged 1793→1579 words (the step-0 hand-tuned delta) and persisted. Phase 2
booted a fresh server: the loader read the written file and the gatwick extract
reported `applied:true` with the debris gone — live transfer, loader → writer →
loader closed.

**Current state.** Steps 0–4 done: the loop is closed end-to-end. A lost extraction
(gating evidence, fallback, near-empty, or measured debris) can now end in a stored,
persisted, transferable site preset proposed by the host model, validated
deterministically, and verified through the real pipeline. The measured class list
is **debris on two templates** (Daily Mail, Reach/Mirror). The preset file is written
by the tool or by hand into the same bounded cache directory the loader reads.

**Next step.** The thread's core loop is complete; what remains is open by decision,
not by omission: the consent-wall recovery policy call (unchanged), multi-include
scopes (no specimen demands it), and further same-class captures as they turn up in
real use — the corpus grows only through the evidence standard. The residual lint
miss (`AwrJE`-shaped digit-free hashes) is documented in the identifiers test and
defended upstream by material filtering; revisit only if a real proposal ever
poisons itself that way.

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
- 2026-09-06 — step 3 ran, moved ahead of the corpus widening the previous state had
  gated it on. `preset-cache.ts`: `<site>.json` loader, env-resolved bounded
  directory, skip-don't-die on bad files, oldest-by-mtime prune at 64; wired into
  `createServer` and the dev reload loop. 8 tests (file → store → extract on the a66
  fixture, env matrix, bound/prune) plus live runs against the built binary and a
  `yarn dev` reload. Loader only — the writer is step 4; the CLI stays preset-free
  (it never passes `baseUrl`, so it could not resolve one anyway).
- 2026-09-06 — step 4 ran, with the corpus widening the owner folded into it. Corpus:
  Mirror debris pair + a clean video-heavy DM control landed as fixtures; The Sun
  with video and `dailymail.co.uk` recorded as hunt negatives. Deterministic pieces
  in order: store-generation counter in the cache fingerprint (with `removePreset`),
  selector lint (positional family, `:contains`, gibberish identifiers with
  segment-level scoring), lost-signal verdict with the debris probe, copy-safe
  chain-outline builder (grouped round-two view), preset writer (`savePreset`).
  Then the tool: `suggest_preset` in the sampling-gated family, two-round loop,
  validators feeding back verbatim, verification through the real preset path,
  persistence after convergence. Explain kept preset-free (pin test). Bench gained
  `@suggest` rows. Live run with the local 27B as suggester: converged on a66,
  persisted, and the fresh-boot loader transferred the preset to gatwick
  (`applied:true`, debris gone). Sampling seam gained a 300s request timeout — the
  SDK default could not host a model round.
