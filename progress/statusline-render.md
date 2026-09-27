# Statusline — the renderer moves into the package

**Run:** two PRs — PR 1 the transposition units (r1–r4, renders byte-identical),
PR 2 the theme units (t1–t6, one deliberate re-baseline); one commit per unit.
Branch `statusline-render` (r1–r4) → PR 1, base `main`; branch
`statusline-render-themes` cut at r4 → PR 2, base `statusline-render` (the run
never merges; GitHub retargets PR 2 when the owner merges PR 1). Each unit's
code commit is followed by a `docs(tracking)` fold commit for this file.

## Goal

Every line of renderer logic is TypeScript in `packages/statusline`; the plugin
ships only `.claude-plugin/plugin.json` and `SKILL.md`; a paint is
`node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs"`. Done when:

- `plugins/statusline/runtime/` does not exist; no `.sh` file, no bash spawn, no
  `jq` call anywhere in the plugin or the package.
- The settings keys are direct data-dir paths — no glob resolver, no
  cache-layout coupling — and the same picks + payload + width render as
  today's bash (goldens byte-identical through r3).
- Decisions ride argv, environment rides env. The keys:
  `node "$HOME/…/render.mjs" --theme=lean --bar=gauge || true` and
  `node "$HOME/…/render.mjs" panel --theme=lean || true` — theme
  plus overrides only, `--layout` only when passed; the renderer resolves the
  theme at paint, item flags beating it, both keys carrying it. `NO_COLOR`,
  `COLUMNS`, `TZ`, `HOME` stay env (ambient, not ours). No `STATUSLINE_LAB_`
  anywhere in `src/`.
- `configure` is the sole writer: one run writes both keys and syncs the
  bundled `render.mjs` into the data dir; `preview`/`catalog` write nothing.
- `status` names the theme straight from the key, swaps included; `catalog`
  stars it the same way; `live-theme.ts` is deleted.
- A wizard save keeps the theme name through refinement; `style` is offered in
  the refine list.
- One e2e test runs a theme write's both keys through the real node renderer
  and asserts the theme's markers on the line and the panel row.
- READMEs, SKILL.md, and the plugin manifest state the new contracts; no live
  string claims the runtime never learns themes exist.

## Current state

Not started. The launching sitting measured the render paths (bash render
158 ms, bare node 27 ms, npx 230 ms — the bash subshell-per-segment style costs
more than one node boot), settled the port design against the Claude Code
plugin docs (`${CLAUDE_PLUGIN_DATA}` is the documented durable per-plugin dir;
version cache dirs churn and are GC'd; `CLAUDE_PLUGIN_ROOT` is not documented
for statusline commands), and merged the port with the theme-key thread by
owner ruling. A design sitting ruled flags over env and audited every plan
anchor against the source; a docs pass then confirmed the platform contract
(the rulings below carry what it found).

## Next step

r1 — port the renderer core, goldens byte-identical.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| r1 | renderer core in TS | | checklist | items, alternatives, defaults, `DEFAULT_LAYOUT`, rung orders are TS data in `src/render/` — 16 items (the `COMPS` order = `components/*.sh`) plus the 3 inline shims (`branch=none`, `bar=flat6`, `bar=flat4`); payload parse, git read, every component, `compose`/`vlen`/fit engine ported as functions; the TS engine renders byte-identical against the **existing** `test/goldens/*.ans` corpus, extended where fixture × width × pick gaps exist (new `.ans` captured from the bash runtime in this unit, never regenerated later); bash runtime and its tests untouched and green |
| r2 | entry + panel mode | | | `render.mjs` entry owns its argv grammar — `node:util` parseArgs, never commander/agentic-core; it shares only the registry data with the CLI. Flags: `--theme`, `--layout`, `--now=<epoch>`, `--<item>=<alt>`; `panel` positional. Ambient reads stay env: `NO_COLOR`, `COLUMNS`, `HOME`, `TZ`. Unknown flag name → stderr warning + ignored; unknown value → warning + default (the `check_config` rule). Keeps the capture tee to the data dir. `panel` argv mode ports `subagent.sh`'s own engine — its `vlen` (codepoint semantics), fit ladder, `make_bar`, `fmt_k`, 24-char description truncation, ms-vs-s `startTime` heuristic — exact, not unified with the main engine; panel goldens (ticks/multi.json × widths) byte-identical |
| r3 | ship + sync | | | vite emits `dist/render.mjs` beside the CLI bundle; the tarball needs no manifest change (`files: ["dist","assets"]` already ships it; the entry shebang banner is harmless under `node`). `configure` syncs its bundled renderer into `$DATA_DIR` on every write, content-diffed; `restore` deletes `render.mjs` with the rest of the lab data by explicit path; `status` replaces the cache-version `runtime:` row with two rows — `node` on PATH, data-dir renderer vs the CLI's bundle (hash) — each with a runnable fix |
| r4 | switchover | | checklist | key constants become the direct data-dir flag commands (main: `node "$HOME/…/render.mjs" --theme=… --<item>=<alt> \|\| true`; panel adds the `panel` positional); ours-matcher and `readKeyConfig` re-derived on the new prefix/suffix — the prefix is the program itself, so the assignments-hug-the-command constraint dies; wizard/preview/tests render through the TS entry (engine-level tests in-process, below the argv layer; the only argv-seam tests are `key-e2e` and t3's e2e); every bash-spawning suite (`statusline`, `responsive`, `ramps`, `subagent`, `runtime-tee`, `plugin-runtime`) plus the `test/{runtime,plugin-runtime}.ts` helpers converts or dies in this one motion; `plugins/statusline/runtime/` deleted; `key-e2e`/`configure` pins re-baselined (PR 1's only re-baseline); CLAUDE.md layout rule drops the runtime exception |
| t1 | themes as data + the resolver | | checklist | the five themes (layouts, per-item picks, summaries, `custom`'s absence seeds) are a static `THEMES` const beside the registry — `themesFor(runtime)` the function is deleted, layouts embedding the default layout's string; one resolver function in `src/render/` resolves theme + item flags + layout at paint; the panel resolves the theme's `style`; for every theme, today's compile output and the `--theme` spelling render byte-identical (goldens untouched) |
| t2 | the key shape | | checklist | `configure --theme lean` writes `node … --theme=lean` and nothing else — no item flags, no layout; `--theme lean --bar gauge` adds only `--bar=gauge`; `--layout` rides only when passed; the panel key carries `--theme` (and `--style` on a flags-only style write) with a prefix/suffix ours-matcher like the main key's; `readKeyConfig` parses flags — theme without layout is legal, the theme carries it; `resolveSelection` slims to validation (name in table, overrides valid, layout items known) — the every-item-needs-a-pick error dies with the wall; key-text and footprint pins re-baselined once |
| t3 | e2e door | | | a scratch-home test configures `--theme lean`, asserts the key text, then runs both written keys through the real node renderer at the data-dir path with the fixture payload and tick (`--now` pinned), asserting lean's markers on the line and the panel row (`·` separators, percent bar) |
| t4 | status + catalog read the name | | | `status` prints `theme: lean` from the key with swaps appended, and the panel row carries its theme; `catalog` stars the theme by name and stars resolved picks per item through the shared resolver; `live-theme.ts` and its tests deleted; fix strings still name a runnable fix |
| t5 | wizard rides names | | | the themes pass previews by `--theme`; refine edits overrides and offers `style`; the save writes `--theme` plus **only the picks that differ from the theme** — the full draft must not ride, that rebuilds the assignment wall; the fake-deps test asserts the saved key text, not just the outcome |
| t6 | contracts + docs | | | README contracts rewritten (renderer in the package, data-dir key, configure sole writer, flags carry decisions, theme resolution at paint, name rides the key, swaps keep the name); module table current; SKILL.md status example current; the plugin manifest description drops "bash render runtime"; root README checked; repo grep finds no "runtime never learns themes", no "no theme name is stored", and no `STATUSLINE_LAB_` in `src/` outside `archive/` and `progress/` |

## Plan

Per-unit reading:

- r1: `plugins/statusline/runtime/{statusline.sh,lib.sh}` and
  `components/*.sh` (the port's source; the 3 inline shims live in
  `statusline.sh`), `src/resolve.ts` (the registry the parsers replace),
  `src/themes.ts` (the table that becomes data), `test/runtime.ts` +
  `test/goldens/` (the corpus and harness to extend),
  `test/{statusline,responsive,ramps}.test.ts` (the golden cases to draw).
- r2: `runtime/subagent.sh` (its own `vlen`, fit ladder, `make_bar`, `fmt_k`,
  truncation, startTime heuristic), `src/payloads.ts` (`renderPreview` env
  contract, capture tee), `assets/ticks/multi.json`.
- r3: `vite.config.ts` (second entry), `src/{configure,restore,status}.ts`,
  `references/npm-publishing.md` before touching the tarball surface.
- r4: `src/{resolve,configure,payloads,preview,wizard-tui}.ts`,
  `test/{key-e2e,configure,plugin-runtime,runtime-tee}.ts`, the bash-spawning
  suites and their helpers, then the CLAUDE.md layout rule.
- t1: `src/themes.ts` (`THEMES` replaces `themesFor`), `src/render/`
  (resolver home), `test/themes.test.ts`.
- t2: `src/{configure,resolve}.ts`, `test/{configure,key-e2e,fixtures}.ts`, any
  `restore`/`subagent` pin on the old exact panel constant.
- t3: `test/key-e2e.test.ts` — the door extends the real-renderer harness
  from r4.
- t4: `src/{status,catalog}.ts`, `src/live-theme.ts` (deleted),
  `test/{status,catalog,themes}.test.ts`.
- t5: `src/wizard.ts`, `test/wizard.test.ts`.
- t6: `packages/statusline/README.md`, `plugins/statusline/SKILL.md`,
  `plugins/statusline/.claude-plugin/plugin.json`, root `README.md`.

Enforcement inventory:

- Goldens byte-stable r1–r3 and t1: same picks resolve, so a moved golden is
  a defect, never a re-baseline. The existing `test/goldens/*.ans` corpus is
  the r1 baseline; r1 extends it, never regenerates it.
- The registry/flag-surface pins stay green throughout.
- Key-text and footprint pins re-baseline exactly twice in the thread: r4
  (path + flag swap) and t2 (theme shape) — nowhere else. The `check_config`
  warning text is pinned nowhere — free to re-spell for flags.
- Goldens pin `--now` and `TZ` — the TS harness keeps that discipline or
  clock/ramp goldens wobble.
- After r4: no `.sh` under `plugins/statusline`; no bash spawn in package,
  plugin, or tests; no cache-glob resolution in `resolve.ts`; no
  `STATUSLINE_LAB_` in `src/`.
- After t4: no `live-theme` import anywhere; no exact-equality panel matcher.
- After t6: no "runtime never learns themes", no "no theme name is stored"
  outside `archive/` and `progress/`; the plugin manifest description carries
  no "bash render runtime".
- The renderer bundle stays runtime-dep-free (node built-ins only), so
  `render.mjs` runs on any node ≥ 18 the host may have; it parses its own
  argv — never commander, never `@v1nvn/agentic-core`.
- r4 and t2 are reviewed blind despite their `checklist` rows: both rewrite
  the settings-key wire text and re-baseline pins — a silent-failure carrier.

Run gate per unit: `yarn typecheck && yarn lint && yarn workspace
@v1nvn/statusline run test && yarn workspace @v1nvn/statusline run build`;
whole-repo `yarn test` at each PR boundary.

Known costs, owner-ruled:

- A plugin update alone does not refresh the paint code — the renderer updates
  when `configure` next runs; the updated SKILL.md pin makes the next `/lab`
  run the new CLI, and `status` names a stale renderer. No hook, no per-session
  side effects.
- `node` on PATH at paint time is not documented by Claude Code; `status`
  covers it, and `|| true` keeps a broken render a blank line — stderr stays
  open as the `claude --debug` channel (the docs render stderr never).
- The key hardcodes `$HOME/.claude/plugins/data/…`; a user who relocates the
  plugin tree via `CLAUDE_CODE_PLUGIN_CACHE_DIR` breaks it — `status`'s
  renderer row names the miss.
- Multi-line and wide-row corruption fixes are 2026-era Claude Code changes;
  very old builds may garble the two-line render.

Adjacent, not in scope: the preview width flag entry stays its own thread —
cheapest after this one, since it touches the preview plumbing rewritten here.
Unifying the main and panel `vlen`/fit engines is its own deliberate
re-baseline, never a side effect of this thread. Caching git reads keyed on
`session_id` (the docs' official guidance, ~5 s TTL) — the port's ~50 ms paint
doesn't need it.

## Design

One system: the renderer is package code, spawned by the user's own settings
keys at a stable documented path; the key records decisions (`--theme` +
overrides) as argv, and the renderer resolves them at paint.

Rulings from the launching sittings:

- The port is a performance win, not a trade: measured 158 ms per bash render
  (jq + subshell per segment: `vlen` spawns `wc`+`tr`+`grep`, `strip_sgr`
  spawns `sed`) vs 27 ms node boot with `JSON.parse` and only the git spawns
  left (~50–60 ms total).
- The paint path never touches npm: npx measured 230 ms warm, and its version
  pinning is unfixable in a key that must survive plugin updates (pinned goes
  stale, unpinned resolves through the npx cache — the repo's own set-version
  rule). The data dir is the one stable, documented home
  (`${CLAUDE_PLUGIN_DATA}`; `statusline@agentic` → `statusline-agentic`).
- `configure` is the sole writer; `preview` keeps its writes-nothing contract.
- Theme rulings carried from the merged predecessor: the key carries the theme
  (a write's key must read as what was configured); item flags beat the theme,
  `--layout` beats the theme layout; the panel follows the theme through the
  same door — `--theme` in both keys; `custom` seeds absence variants; `style`
  becomes visible (wizard refine, status panel row); a runtime retune changing
  the live bar under an unchanged key is accepted.
- Rejected in the launching sitting: WASM (no host without node, and no
  compute to win — rendering is ~1 ms of the budget); AOT native binaries via
  bun/deno (toolchain and platform matrix for ~20 ms over node); generating
  the bash from TS (a codegen more complex than the code); a SessionStart hook
  sync (per-session side effect for a one-time cost — the docs now document
  this idiom; still rejected); plugin-shipped `subagentStatusLine` (the docs
  confirm plugin `settings.json` survives with `agent` + `subagentStatusLine`,
  but it sits at lowest precedence and splits the two keys out of configure's
  one writer).
- Rejected by the predecessor, standing: compile-away with the name as
  decoration (two sources of truth in one command); a style-less panel
  (deletes a working, tested feature).

Rulings from the design sitting:

- **Flags, not env.** Decisions ride argv (`--theme`, `--layout`, `--now`,
  `--<item>=<alt>`); environment rides env (`NO_COLOR`, `COLUMNS`, `TZ`,
  `HOME`). The env wall was the bash runtime's interface; carrying it into a
  node entry fits the new system to the old one — and keeps the bespoke
  `STATUSLINE_LAB_` prefix alive for no job argv doesn't do. `NOW` is ours —
  a test/preview injection — so it is `--now=<epoch>`, not env.
- Unknown flag name → stderr warning + ignored; unknown value → warning +
  default. Bash could only ignore unknown env names silently; a typo'd flag on
  a key deserves to be seen.
- `render.mjs` owns its own ~15-line argv grammar. The CLI's commander program
  is a different program; the two share only the registry table and the theme
  resolver — never a parser.
- One resolver, two doors: theme resolution is a function in `src/render/` —
  the renderer resolves at paint; catalog/status/wizard import the same
  function for display. No second resolution path.
- The theme table is data: a static `THEMES` const beside the registry;
  `themesFor(runtime)` the function is deleted — it existed only to serve
  scrape-derived inputs.
- `subagent.sh` is a second renderer with different semantics — its `vlen`
  counts codepoints (jq `length`), the main `vlen` counts bytes with a `⚡`
  adjustment; different fit ladders. Ported exact, kept separate.
- Zero migration is dead by owner ruling: an old bash key reads foreign after
  r4, and configure's existing foreign-key rule already names `--force`.
  Breaking clean beats carrying the env-wall shape.
- **Stderr rides `claude --debug`.** The docs render stderr never, log it
  under `claude --debug`, and blank the line on non-zero exit by themselves —
  so the key carries `|| true` and no `2>/dev/null`. Warnings and crashes keep
  their one debug channel, and `status` names it.
- The docs pass confirmed the contract the plan assumed: statusline commands
  receive only `COLUMNS`/`LINES` (no `CLAUDE_PLUGIN_*` at spawn), no manifest
  field registers a statusline, width is `COLUMNS` env for the main line and
  the payload's `columns` field for the panel, and the data-dir id mangling
  (`statusline@agentic` → `statusline-agentic`) matches ours.

Anchors (read across the launching and design sittings; re-read before use):
runtime `statusline.sh` (jq row, git block, compose, `vlen`, rungs/steps, fit,
the 3 inline shims), `lib.sh` (`DATA_DIR`, `read_config`/`check_config`,
capture, `strip_sgr`), `subagent.sh` (its own `vlen`, `make_bar`, `fmt_k`,
STEPS, truncation, startTime heuristic), `components/*.sh` (`bar.sh` read in
full; the rest are 7–20 lines each), `src/resolve.ts` (`KEY_RESOLVER`,
`mainKeyValue`, `subagentKeyValue`, `readKeyConfig`, `resolveRuntime`,
`readItems`/`readAlternatives`), `src/configure.ts` (`resolveSelection`,
`planSettings`, splice engine, backup), `src/themes.ts` (`themesFor`,
`CUSTOM_SEEDS`), `src/payloads.ts` (`runtimeRenderer`, `renderPreview`,
capture use), `src/{status,catalog,wizard,live-theme,index,cli}.ts`,
`vite.config.ts`, `package.json`, `.claude-plugin/plugin.json`,
`test/runtime.ts` + `test/goldens/`. Not yet read, due at their units:
`src/{restore,wizard-tui,demo-repo}.ts`, the 15 unread `components/*.sh`, the
test suite bodies.
