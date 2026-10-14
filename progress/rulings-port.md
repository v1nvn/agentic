# Rulings — port into the marketplace as the tenth plugin

## Goal

The rulings skill lives as the marketplace's tenth plugin, built the agentic way: a TS
builder in `packages/rulings` emits a static page whose pictures are `seq`, `bodies`
or `diagram`, with no browser QA anywhere; a fresh install serves `/rulings:consult`;
every PAGE-format page under `~/.claude/rulings/` rebuilds on the new builder;
`~/.claude/skills/rulings` is deleted;
AGENTS.md, the README and the marketplace manifest say ten.

## Current state

R1–R3 closed (see rows). R4 landed, awaiting blind review: `src/cli.ts` (the real
`<dir> [--new] [--no-open]` door) + `src/page.ts` (assembly — masthead, TOC,
sections, views, static matrix, merged boxes, notes); errors block and exit red,
warnings print; emit self-contained except mermaid, copied only on diagram pages;
byte-identical rebuilds proven; `--new` refuses an existing page.js; 64 scoped
tests; workspace gate green. The builder took one live chrome-devtools render
probe (light + dark) beyond the snapshot gate — ruled consistent: the plan cuts
browser QA as a gate, CLAUDE.md's look-at-the-surface law gets one probe.
Nits open for `/todo:review`: root README "seven verbs"; schema.test.ts mutation
tuples' dead expected-substring; two code-restating comments (bodies.ts:39-40,
seq.ts:48-50).

## Next step

R4 review and R5 build in flight. On R5's green report: commit, close R4, dispatch
R5's reviewer; R6 (cutover) follows — npm bootstrap first per
references/npm-publishing.md.

## Steps

| id  | unit                                                   | model      | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------ | ---------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | the home, tenth in the marketplace                     | sonnet/low |        |         | `packages/rulings` holds the manifest (author v1nvn) and a `@v1nvn/rulings` package.json on the train: `bin` pointing at `./src/index.ts` (the `packages/statusline`/`packages/rm` pattern), deps `zod`, `diff`, `prismjs` plus its lock, a `test` script (`yarn run -T vitest run`) so root `yarn test`'s `foreach --all` stays green from day one; `src/index.ts` is the CLI as `.ts` source — no vite, no standalone bundle, no root build step, no tsconfig edit (root typecheck's `packages/*/src` include already covers it); marketplace.json lists rulings; AGENTS.md and the README say ten plugins with the npm count that follows; `packages/rulings/README.md` joins set-version.mjs's `MD_SURFACES` and `node .github/scripts/set-version.mjs --check` is green; `claude plugin validate packages/rulings` and root `typecheck`/`lint`/`test` green — landed `e10b787` + Bash-rule fix `0554980`; review 10/10 on re-run output                                                                                                                                                                                                                                             |
| R2  | the page schema — one typed door                       |            |        |         | strict zod schema rejects every unknown key — `when`, `withdrawn`, `key`, group `quick`, the legacy `fix`/`context`/`story`/`odds`/`extra`/`from` all red — and admits every field `validatePage` checks plus every field the five live pages carry: `eyebrow` (5/5 pages, never validated), `opt.w` (all 49 options of the newest page, 3 on function-library), `body.cap`/`body.what`, `caps`, step `s`/`b`, overlay `s`/`n`/`a`/`b`, `page.notes`, `merged`+`changed`, `body.state`/`lang`/`diff`, step `in`, `opt.needs` as string or array (`validatePage`'s `[].concat`; 3 live uses; renders as the "only with G\*" chip, its pick-validation job dying with the panel); lib.js's error/warning split survives — errors block the emit, warnings print (the >10-rulings count stays a warning in the build; the skill's "past ten, decide the smallest yourself" gate is contract, not advice — the 21-ruling page drew "why for a single thing are you asking for so many rulings?"); refinements: exactly one recommended option, two-to-four live options, at most one `today`, title ends in `?`, stake carries a digit, stake names no `<code>` internal, stake/today word-overlap, near-duplicate `today` texts, vague words, caption opens `<b>`, body line 76 chars, option body identical to today, every live option has a picture, ledger widths match, ruling ids and group references closed, `needs` references closed — the named list is the delta, not the inventory: R2 ports every `validatePage` check minus the cut fields' checks, rewrites the >10 warning's text (it still says "split by `fix`", a removed field), and drops the dead `strict` param and `gap` local (root tsconfig sets `noUnusedLocals`); the ported example — grown to carry `w`, `cap`, `what`, a `needs` and one merged ruling — parses green; vitest fixtures cover red and green — landed `2470562`; review pass on a 63-mutation old-vs-new A/B and a live-probe re-run, no blocking findings |
| R3  | the picture emitters                                   |            |        |         | `seqSvg` ported to TS as build-time inline SVG — overlay expansion per view, `new`/`changed`/`gone` tags, ledger with change highlight, legend of used kinds, `caps` per view; `bodies` emits prism-highlighted diff with the ≥7-line collapse, state chips, `what` labels, `cap` captions, the `w` how-paragraph beside gain/cost, and the `needs` chip; `diagram` emits one mermaid block per view, and the page loads mermaid only when a diagram ruling exists — an unmodified upstream mermaid@11 classic-script bundle that defines the global, no ESM imports (module scripts CORS-fail on `file://`); nothing fetches on open — the old engine's Google-Fonts CDN is replaced by a system font stack, mermaid is the only vendored asset; snapshot specs pin the emitted HTML of the example's three kinds, including a bodies ruling carrying `w`/`cap`/`what`/`needs` and one merged ruling (bodies is the workhorse at scale: the 21-ruling page is 0 seq, 52 bodies) — landed `5bacebb`; review pass, no blocking findings (grid math hand-recomputed, vendor bundle diffed against a fresh npm fetch) |
| R4  | the builder — one command writes and verifies the page |            |        |         | `src/index.ts <dir> [--new] [--no-open]` loads the page file in a vm, parses it through R2 (errors block the emit and exit red; warnings print), emits a self-contained `index.html` — self-contained except the one vendored mermaid file a diagram page carries — (TOC, one section per ruling, every view stacked with its caption, static compare matrix, notes), opens the page, and the output is deterministic: no timestamps, no absolute paths, two rebuilds byte-identical; `--new` seeds `page.js` from the ported example; a plain rebuild is the hot path — the live page was rebuilt three times in forty minutes one morning; the emitted-HTML snapshot is the regression gate; no `from` anchors, no `--repo`, no `verified` stamp — zero pages ever wrote a `from` (the old example itself carried none and said so), and the old shots gate already lagged the final build in live use, so the builder's exit code carries correctness alone |
| R5  | the skill surface                                      |            |        |         | SKILL.md written only after review against skill-creator (`anthropics/claude-plugins-official` via `gh`, uninstalled) and `references/skill-review.md`, new findings promoted into the reference; the surface keeps the flow gates, the ruling-selection gate, the writing rules, the three picture kinds, the answer protocol, the pushback taxonomy, AskUserQuestion for one-to-three simple decisions, and one line naming free-mermaid syntax as checked only on open; the cut list covers everything the static page makes false: card pressing, "Copy the answer", localStorage, `--shots`, the verify gate, every `when`/`withdrawn` sentence in Steps 3–7 (a dropped option is deleted and its letter never reused), the page-added `n` button (the answer protocol reads a typed `Gn`), and the "For the owner" section (one open-and-read line replaces it); named `consult` so the invocation is `/rulings:consult`; home README plus the README table row; `plugin validate` + `node .github/scripts/build-skills.mjs` green — `plugin test` has nothing to fire on a skill-only home, the R2/R3 vitest suite is the home's test gate                                                                                      |
| R6  | cutover                                                |            |        |         | the never-published-name bootstrap lands first, exactly as `references/npm-publishing.md` sequences it — a name unpublished or untrusted when the PR merges re-fails release.yml for the whole train; then the train bump and install from the marketplace; every PAGE-format page under `~/.claude/rulings/` (five: todo-run-costs, run-costs-plan, enhansome-search-audit, function-library, pr272-design) rebuilds on the new builder and renders — the rebuild edits away the two dead fields every page carries (`key`, group `quick`) that the strict schema rejects, while `in`/`needs`/`merged` ride admitted; popover-rhythm (hand-built, self-contained, references no engine file) needs nothing and keeps working after the skill dies; the owner has opened one rebuilt page — pr272-design, the 21-ruling, 52-body scale case; `~/.claude/skills/rulings` deleted with its 29 MB `node_modules`; old `shots/` dirs not ported; thread closed |

## Plan

- **Sequencing.** R1 → R2 → R3 → R4 strict; R5 after R4 (the surface documents the
  real CLI); R6 last. One commit per unit, one PR for the thread.
- **R1.** The skill→CLI door is statusline's: one version-pinned
  `npx -y @v1nvn/rulings@<train> <dir>` line in the skill body
  (`packages/statusline/SKILL.md:18` proves the pattern), re-pinned every bump once
  `packages/rulings/README.md` and the SKILL.md join set-version.mjs's
  `MD_SURFACES`; the plain shell runs the same line, so there is one resolution
  path and nothing to probe. The home's README carries the one `Bash(...)` allow
  rule (the mods.md fresh-install precedent). Deps `zod`, `diff`, `prismjs` are
  plain package deps; `bin` points at `./src/index.ts`. The only npm machinery
  beyond the train is `references/npm-publishing.md`'s one-time bootstrap, sequenced
  in R6.
- **R2.** The authoring format stays `var PAGE = { … }` data loaded in a vm — pages
  live outside any tsconfig and JSON cannot carry multi-line bodies readably; the
  schema is the door, and anything it does not list dies with `lib.js`'s
  `validatePage`. Letter `n` stays reserved by the answer protocol alone — the page
  button is gone. Sources to port from: `engine/lib.js` (`validatePage`) and
  `example.page.js`, grown to carry the fields the live pages use (`w`, `cap`,
  `what`, `needs`, `merged`) so the fixture pins them.
- **R3.** Port the grid math and CSS classes of `seqSvg` and `engine/engine.css`;
  prune the nav/panel/answer chrome styles — the page is one long document now.
  Theme door: `?theme=` param plus `prefers-color-scheme`; mermaid's init reads it.
  Vendor mermaid once as an unmodified upstream mermaid@11 classic-script bundle
  (defines the global, no ESM imports — module scripts CORS-fail on `file://`) with
  a header comment; the builder copies it into a page dir only when a `diagram`
  ruling exists. The vendored diff/prism of `lib.js` do not move — they are plain
  npm deps of the package.
- **R4.** Pages live in `~/.claude/rulings/<topic>/`, never `/tmp`, never published.
  `--new` seeds `page.js` from the ported example; a rebuild without `--new` is the
  same door (the old `--stub` collapses into it).
- **R5.** Review before writing, never after. The description keeps the trigger words
  ("rulings", "consult me"); maintainer rules stay out of the surface; the old
  SKILL.md's Steps 0–8 are the raw material, not the shape — cut what the static page
  made false (the R5 cell's cut list) and keep the flow gates and writing rules.
- **R6.** The old pages are ruled and closed threads' artifacts; rebuilding them is a
  compat check on real data, not a promise to keep old pages alive. `key` and
  `quick` die with the page chrome they served (localStorage keys, the accept-all
  button) — five pages carry them, zero non-chrome uses.
- **Enforcement inventory.** Unknown-key red; emitted-HTML snapshot green on the
  example; byte-identical rebuild; `claude plugin validate` + `node
  .github/scripts/build-skills.mjs` on the home; `node
  .github/scripts/set-version.mjs --check`; root `typecheck`/`lint`/`test`. No
  browser dep may enter the package — no jsdom, no
  puppeteer, no screenshot path; their absence is itself the invariant.
- **Tactical map.** Workspace gate: `yarn typecheck && yarn lint && yarn test`,
  ceiling 2 min (pre-flight measure: 1 min; one minute of headroom). Scoped lines — R1:
  `node .github/scripts/set-version.mjs --check` + `claude plugin validate
  packages/rulings`; R2–R4: `yarn workspace @v1nvn/rulings run test`; R5:
  `claude plugin validate packages/rulings` + `node .github/scripts/build-skills.mjs`;
  R6: no repo gate — the five live rebuilds are the check. R1's builder writes the
  enforcement gate script once into `progress/.scratch/rulings-port/` from the
  inventory (no-browser-dep absence, `--check`, validate) and every builder after
  runs it.
- **Small rows:** none — every row carries design freedom.
- **Landed layout (R2).** `src/schema.ts` is the door — zod strict schemas for
  page/group/ruling/opt/body/seq/step/overlay plus `validatePage(input) -> { errors,
  warnings }`, exporting `Page`, `Ruling`, `Opt`, `Seq`, `Verdict`. R4 parses through
  it: errors block and exit red, warnings print. `src/example.page.js` is the grown
  example in authoring format (`var PAGE = { … }`, vm-loaded, no exports; carries
  eyebrow, `w`, `what`+`cap`, `needs`, one merged) — it ships (`files: ["src"]`) and
  `--new` seeds from its text. Live-page probe (R2, script in scratch): rulings per
  page — todo-run-costs 6, run-costs-plan 4, enhansome-search-audit 6,
  function-library 4 (one merged), pr272-design 21 (49 options; the only warning in
  the field, the rewritten >10 text); zero errors anywhere once `key`/`quick` strip.
- **Landed layout (R3).** Emitters: `src/html.ts` (head/esc helpers), `src/seq.ts`
  (`seqView(q,id,view)` — ported grid math), `src/bodies.ts` (`bodiesView`),
  `src/diagram.ts` (`diagramView` + `mermaidBoot`), `src/style.ts` (pageCss),
  `src/theme.ts` (`themeScript`). The schema door admits the third kind as
  `diagram: { cap?, views: { today|letter: { text, cap? } } }` — view keys name
  live non-today options; one-picture-per-ruling spans all three kinds. Mermaid
  vendored at `src/vendor/mermaid.min.js` — mermaid@11.17.2 dist classic build,
  unmodified, one header comment, 3,572,782 B; run() entity-decodes innerHTML, so
  escaped `--&gt;` parses. R4 copies the vendor file into a page dir only when a
  diagram ruling exists, and includes the boot only on diagram pages.
- **Stop rules.** Vendored mermaid over ~5 MB, importing ESM, or not defining the
  global → stop and surface. Skill review findings that reshape the surface
  materially → fold into this file and continue.

## Design

- **Three picture kinds, one door each.** `seq` stays, as typed data plus the ported
  85-line build-time SVG template: its two load-bearing features have no mermaid
  equivalent — the ledger (every real seq used one) and per-option overlays with
  `new`/`changed`/`gone` tags, which structurally enforce "options differ on one
  axis"; per-view mermaid duplication would drift silently, and a seq→mermaid
  compiler would delete exactly those two while adding a compiler to own. `bodies`
  stays — prism and diff run headless fine, and usage crowns it the workhorse: of 41
  rulings across the five pages, 30 are bodies and the 21-ruling page (Oct 14, still
  growing) is zero seq, 52 bodies — the owner asked for that page in place of the
  agent's chat decision list, "code diff in before/after of all". `diagram` is new:
  free mermaid text for flowcharts, state and everything else, loaded only by pages
  that use it. Evidence (vm tallies over `~/.claude/rulings/`, Oct 14): five
  PAGE-format pages (a sixth, `popover-rhythm`, hand-built, self-contained), 41
  rulings, 10 seq all with ledger, 80 bodies; step `in` 16 uses — it is the `new`
  tag and the per-view step filter in `seqSvg`, so the schema admits it, no question
  open; `needs` 3 (renders as a chip); `opt.w` on every
  option of the newest page and 3 on function-library; `when`, `withdrawn` options
  and `from` anchors never, `key`/`quick` only as chrome inputs.
- **Static page, chat answer protocol.** The interactive gating had zero uses; the
  page is the comprehension medium, chat the answer channel. The Oct 14 session
  proves the loop twice in one morning: "this is just too much for me to
  comprehend" → page with code diffs → "I think I get it now" thirteen minutes
  later → the bigger change set got the same ask ("all the changes… code diff in
  before/after of all") → picks came back as one terse line (`G3a, G4a, G6b, …`)
  with the not-understood cluster pushed back to chat, and the follow-up small
  decision answered `A`. The compare matrix and every view render as static HTML.
  Rejected en route: pure-CSS radio cards — tactility with no job, since the owner
  never needed the page to remember picks.
- **zod replaces check.js; the snapshot replaces the jsdom run.** The owner ruled out
  the agent-QA loop (screenshots, chrome-devtools, headless card-pressing); the
  builder's exit code and the emitted-HTML snapshot carry correctness. The one thing
  the build cannot check — free-mermaid syntax — fails visibly on open, and the
  skill says so in one line.
- **Packaging follows statusline's skill door.** Published on the train, `bin` at
  `./src/index.ts`, mermaid vendored once. One resolution path: skill and plain
  shell run the same pinned `npx` line, and set-version re-pins it every bump — the
  plugin-cache exec door was rejected because it would add a second path for one
  CLI.
- **The skill is named `consult`** (`/rulings:consult`): the plugin prefix is
  irremovable, and statusline set the precedent with `lab`.
