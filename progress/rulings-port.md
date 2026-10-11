# Rulings — port into the marketplace as the tenth plugin

## Goal

The rulings skill lives as the marketplace's tenth plugin, built the agentic way: a TS
builder in `packages/rulings` emits a static page whose pictures are `seq`, `bodies`
or `diagram`, with no browser QA anywhere; a fresh install serves `/rulings:consult`;
every PAGE-format page under `~/.claude/rulings/` rebuilds on the new builder;
`~/.claude/skills/rulings` is deleted;
AGENTS.md, the README and the marketplace manifest say ten.

## Current state

Nothing landed. Design settled with the owner: no agent-run page QA
(screenshots, chrome-devtools, headless jsdom all cut — the owner ruled); adapt to the
repo's stack, not a verbatim port; three picture kinds; a static page with the chat
answer protocol. The old home is one commit at `~/.claude/skills/rulings` (its own git
repo; `lib.js` is 18 vendored minified lines (upstream diff + seven prism builds)
plus ~275 hand-written — `validatePage`, `seqSvg` — and `app.js` is pure page chrome
that dies). The exec-door
probe is open (Next step).

## Next step

Probe the exec door on a scratch branch: a throwaway plugin whose skill runs a
committed bin from the _installed_ plugin folder (validate → install → invoke). This
gates R1's bin wiring. Delete the scratch after.

## Steps

| id  | unit                                                   | model      | review | consult | close criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------ | ---------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | the home, tenth in the marketplace                     | sonnet/low |        |         | `packages/rulings` holds the manifest (author v1nvn), `@v1nvn/rulings` package.json on the train, vite standalone via core's `modVite`, and an empty `src/`; root `yarn build` syncs `bin/rulings.mjs`; marketplace.json lists rulings; AGENTS.md and the README say ten plugins with the npm count that follows; `claude plugin validate packages/rulings` and root `yarn build`/`typecheck`/`lint` green                                                                                                                                                                                                                                                                                              |
| R2  | the page schema — one typed door                       |            |        |         | strict zod schema rejects every unknown key — `when`, `needs`, step `in`, `key`, group `quick`, the legacy `fix`/`context`/`story`/`odds`/`extra` all red; the semantic survivors live as refinements (exactly one recommended option, two-to-four live options, at most one `today`, title ends in `?`, stake carries a digit, stake names no `<code>` internal, stake/today word-overlap, near-duplicate `today` texts across rulings, vague words, caption opens `<b>`, body line 76 chars, option body identical to today, every live option has a picture, ledger widths match, ruling ids and group references closed); the ported example page parses green; vitest fixtures cover red and green |
| R3  | the picture emitters                                   |            |        |         | `seqSvg` ported to TS as build-time inline SVG — overlay expansion per view, `new`/`changed`/`gone` tags, ledger with change highlight, legend of used kinds, `caps` per view; `bodies` emits prism-highlighted diff with the ≥7-line collapse, state chips and `from`; `diagram` emits one mermaid block per view, and the page loads vendored mermaid only when a diagram ruling exists; snapshot specs pin the emitted HTML of the example's three kinds                                                                                                                                                                                                                                             |
| R4  | the builder — one command writes and verifies the page |            |        |         | `bin/rulings.mjs <dir> [--new] [--repo <root>] [--no-open]` loads the page file in a vm, parses it through R2, emits `index.html` (TOC, one section per ruling, every view stacked with its caption, static compare matrix, notes), re-extracts `from` anchors against `--repo` and fails naming the drift, stamps `verified` when clean, opens the page; the example builds green and opens for the owner; a mutated-anchor fixture goes red; the emitted-HTML snapshot is the regression gate                                                                                                                                                                                                         |
| R5  | the skill surface                                      |            |        |         | SKILL.md written only after review against skill-creator (`anthropics/claude-plugins-official` via `gh`, uninstalled) and `references/skill-review.md`, new findings promoted into the reference; the surface keeps the flow gates, the ruling-selection gate, the writing rules, the three picture kinds, the answer protocol, the pushback taxonomy, AskUserQuestion for one-to-three simple decisions, and one line naming free-mermaid syntax as checked only on open; named `consult` so the invocation is `/rulings:consult`; home README plus the README table row; `plugin validate` + `plugin test` green                                                                                      |
| R6  | cutover                                                |            |        |         | train version bumped per `references/npm-publishing.md` and rulings installed from the marketplace; every PAGE-format page under `~/.claude/rulings/` rebuilds on the new builder and renders (none uses a cut field — verified by grep); the owner has opened one; `~/.claude/skills/rulings` deleted; old `shots/` dirs not ported; thread closed                                                                                                                                                                                                                                                                                                                                                     |

## Plan

- **Sequencing.** R1 → R2 → R3 → R4 strict; R5 after R4 (the surface documents the
  real CLI); R6 last. One commit per unit, one PR for the thread.
- **R1.** Follow the mods' bin discipline exactly: the package publishes on the train
  (plain-shell door) and root `yarn build` copies the standalone build to a committed
  `bin/rulings.mjs` the skill execs plugin-relative — the pattern `packages/rm/bin/send.mjs`
  already proves. Deps: `zod`, `diff`, `prismjs`; dev: `vite`, `vitest`. No new npm
  bootstrap beyond `references/npm-publishing.md`.
- **R2.** The authoring format stays `var PAGE = { … }` data loaded in a vm — pages
  live outside any tsconfig and JSON cannot carry multi-line bodies readably; the
  schema is the door, and anything it does not list dies with `lib.js`'s
  `validatePage`. Letter `n` stays reserved by the answer protocol alone — the page
  button is gone. Sources to port from: `engine/lib.js` (validate 43–204) and
  `example.page.js` with the cut fields removed.
- **R3.** Port the grid math and CSS classes of `engine/lib.js:206–290` (`seqSvg`) and
  `engine/engine.css`; prune the nav/panel/answer chrome styles — the page is one long
  document now. Theme door: `?theme=` param plus `prefers-color-scheme`; mermaid's
  init reads it. Vendor mermaid once as an unmodified upstream UMD with a header
  comment, the way `lib.js` vendors diff/prism; the builder copies it into a page dir
  only when a `diagram` ruling exists. The vendored diff/prism of `lib.js` do not
  move — at build time they are plain npm deps inside the bundle.
- **R4.** Pages live in `~/.claude/rulings/<topic>/`, never `/tmp`, never published.
  `--new` seeds `page.js` from the ported example. The `--stub` mode (re-emit an older
  page onto the current builder) rides the same door: rebuild without `--new`.
- **R5.** Review before writing, never after. The description keeps the trigger words
  ("rulings", "consult me"); maintainer rules stay out of the surface; the old
  SKILL.md's Steps 0–8 are the raw material, not the shape — cut what the static page
  made false (card pressing, "Copy the answer", localStorage, `--shots`, the
  verify gate) and keep the flow gates and writing rules.
- **R6.** The old pages are ruled and closed threads' artifacts; rebuilding them is a
  compat check on real data, not a promise to keep old pages alive.
- **Enforcement inventory.** Unknown-key red; anchor-drift red; emitted-HTML snapshot
  green on the example; `claude plugin validate` + `plugin test` on the home; root
  `yarn build`/`typecheck`/`lint`/`test`. No browser dep may enter the package — no
  jsdom, no puppeteer, no screenshot path; their absence is itself the invariant.
- **Stop rules.** Standalone bundling of `zod`/`prismjs`/`diff` fighting vite → stop
  and surface, no bundler hacks. Vendored mermaid over ~5 MB or not UMD → stop and
  surface. Skill-review findings that reshape the surface materially → fold into this
  file and continue.
- **Open question for the owner.** The pages use step `in` (nine uses) and `needs`
  (once) — R2's strict schema rejects both as unknown keys. Either the schema admits
  them or the R6 rebuild edits the pages to drop them; rule before R2.

## Design

- **Three picture kinds, one door each.** `seq` stays, as typed data plus the ported
  85-line build-time SVG template: its two load-bearing features have no mermaid
  equivalent — the ledger (every real seq used one) and per-option overlays with
  `new`/`changed`/`gone` tags, which structurally enforce "options differ on one
  axis"; per-view mermaid duplication would drift silently, and a seq→mermaid
  compiler would delete exactly those two while adding a compiler to own. `bodies`
  stays — prism and diff run headless fine. `diagram` is new: free mermaid text for
  flowcharts, state and everything else, loaded only by pages that use it. Evidence
  (greps over `~/.claude/rulings/`): three PAGE-format pages (a fourth,
  `popover-rhythm`, is hand-built with no page.js), sixteen rulings — eight `seq`,
  all with ledger, eight `bodies`, sixteen overlay blocks; step `in` used nine
  times, `needs` once, `when` never.
- **Static page, chat answer protocol.** The interactive gating had zero uses; picks
  already came back in chat as `G1a, G2c`; the compare matrix and every view render
  as static HTML. Rejected en route: pure-CSS radio cards — tactility with no job,
  since the owner never needed the page to remember picks.
- **zod replaces check.js; the snapshot replaces the jsdom run.** The owner ruled out
  the agent-QA loop (screenshots, chrome-devtools, headless card-pressing); the
  builder's exit code and the emitted-HTML snapshot carry correctness, and the
  `from`-anchor drift check survives as file reads. The one thing the build cannot
  check — free-mermaid syntax — fails visibly on open, and the skill says so in one
  line.
- **Packaging follows the mods.** Published on the train, committed `bin/rulings.mjs`
  exec'd plugin-relative, mermaid vendored once. No second invocation path: the skill
  runs the bin, the plain shell runs the published CLI.
- **The skill is named `consult`** (`/rulings:consult`): the plugin prefix is
  irremovable, and statusline set the precedent with `lab`.
