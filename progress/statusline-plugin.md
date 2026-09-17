# Statusline — plugin 8 + statusline-lab package (trampoline runtime)

**Goal.** Ship `~/.claude/statusline-lab` as a product: a component library
where every statusline segment has multiple designs, an HTML preview gallery to
pick from, and one-command adoption. One plugin renders both surfaces: the
main status line and the subagent panel rows. Two artifacts:
`plugins/statusline` (the bash render runtime) and `packages/statusline-lab`
(`@v1nvn/statusline-lab`, the TS lab). Auto-update needs no mechanism — the
installed statusline pulls the current plugin version on every render.

## Architecture — settled, do not relitigate

```
~/.claude/settings.json          statusLine → ~/.claude/statusline-command.sh
                                 subagentStatusLine → ~/.claude/statusline-command.sh
                                 --subagent (both never change again)
~/.claude/statusline-command.sh  trampoline, ~15 lines, written once by `apply`:
                                  1. jq '.plugins["statusline@agentic"][0].installPath'
                                     from ~/.claude/plugins/installed_plugins.json
                                  2. fallback: newest version dir (sort -V) under
                                     ~/.claude/plugins/cache/agentic/statusline/
                                  3. pick bin by arg (--subagent → subagent.sh,
                                     else statusline.sh); exec bash "$p/bin/<bin>"
                                  4. unresolved → print nothing, exit 0
plugins/statusline/              runtime — bash only. bin/statusline.sh (render path of
                                  compose.sh: jq prologue, git block, path helpers, clusters,
                                  style, picks), bin/subagent.sh (agent-panel rows),
                                  components/*.sh, commands/{compose,lab,capture}.md,
                                  .claude-plugin/plugin.json. No hooks.
packages/statusline-lab/         lab — TS, bin `statusline-lab`: gallery, ansi, capture,
                                  apply, resolve. Payloads, default picks, and the Nerd
                                  Font ship as assets; a deterministic script materializes
                                  the demo git repo at render/test time (no .git in the
                                  tarball).
```

- **Trampoline (pull per render), not a SessionStart re-compose hook (push).**
  Owner chose the inversion 2026-09-12: no derived copies, no sync, updates
  apply at the next paint after the marketplace refresh flips `installPath`.
- **Node never runs at render.** The package is lab + installer only.
- **Render path depends on bash, jq, git — nothing else.** Three variants
  currently shell to python3: `bar=gauge` (colorsys heat), `cache=fuse`
  (ttl countdown), `rate=strip` (rate bars). Each ships only after a rewrite
  as precomputed bash ramps (own unit, deferrable — until then its pick falls
  back to the default and the variant renders in the gallery only).
- **Picks** live at `~/.claude/plugins/data/statusline-agentic/picks` (dir
  pattern `<plugin>-<marketplace>`, confirmed against `md-agentic`,
  `tokens-agentic`). Read at render, so a pick change is live on the next
  paint. The current `/Users/vineet/.claude/statusline-lab/picks` ships as the
  default.
- **`apply` touches exactly three things**: the trampoline file and both
  settings keys (`statusLine`, `subagentStatusLine`). Writes the trampoline
  when absent or already ours (marker line at the top); `--force` overwrites a
  foreign script — adoption needs it, the path holds the live main script
  today. Adds each key to `~/.claude/settings.json` only when absent;
  `--force` repoints an existing key at the trampoline (jq, tmp + mv — never
  reformats the file). Idempotent either way.
- **Main-line output is single-line** (compose.sh behavior); the subagent
  surface emits one `{"id","content"}` JSON line per row. The responsive
  engine of the live main script — width rungs stepping down
  least-valuable-detail-first, 2-line wrap, `COLUMNS-3` inset — ports in as
  its own unit; subagent rows run their own rungs, width from `.columns`
  (inset −1), never wrap.
- **Code under `plugins/` bends the repo rule knowingly**: the runtime is not
  npm-publishable (render-time bash), `bin/` is a documented plugin component,
  and the owner endorsed it via the trampoline design.
- **One-way**: after adoption the loose `~/.claude/statusline-lab/` is deleted
  and the trampoline replaces the old `statusline-command.sh` in place; the
  responsive engine survives by being ported first.

## Sources — authoritative, read before building

- `/Users/vineet/.claude/statusline-lab/compose.sh` — the engine: single jq
  field extraction (tabs→`\x1f`), git porcelain block, shared path helpers,
  picks resolution (defaults → file → argv), `CLUSTERS` + `style` joins,
  `--seg comp=alt` solo render for galleries.
- `/Users/vineet/.claude/statusline-lab/components/*.sh` — 16 components;
  contract `seg_<comp>_<alt>()`, alternatives declared in the header comment
  (e.g. `model: plain | block | pill | zen`).
- `/Users/vineet/.claude/statusline-lab/picks` — current selection.
- `/Users/vineet/.claude/statusline-lab/build.py` + `ansi2html.py` — gallery
  runner and ANSI→HTML; port to TS, keep the fixture-timestamp re-anchoring.
- `/Users/vineet/.claude/statusline-lab/payloads/*.json` — fixtures p1…p4.
- `/Users/vineet/.claude/statusline-command.sh` — live responsive script; the
  rung/wrap engine to port.
- `/Users/vineet/.claude/subagent-statusline.sh` — live agent-panel renderer;
  the row contract to port: one tick `{columns, tasks[]}` (id, label, name,
  description, model, effort, contextWindowSize, tokenCount, startTime) in,
  one `{"id","content"}` JSON line per row out, duration = startTime vs NOW.
  Docs (2026-09-13) confirm the contract and add fields the renderer may grow
  into: per-task `type`, `status`, `cwd`, `tokenSamples`, plus base hook
  fields; omitting an id keeps Claude Code's default row, empty content hides
  it.
- Repo: `packages/tokens/` (package template), `plugins/tokens/` (plugin
  template), `.github/scripts/set-version.mjs`, `.github/workflows/build.yml`.

## Units

1. **Scaffold** — package skeleton per `tokens` (vite/vitest, `files: [dist]`,
   engines node ≥22); plugin dir + manifest; marketplace entry (category
   `productivity`); the build.yml validate loop covers it — add `statusline`
   to the list, or nothing to do if the workflow plugin's glob rewrite already
   landed; train bump via `set-version.mjs`; marketplace description + README +
   CLAUDE.md counts rewritten in the same commit. Commands invoke the lab
   unpinned (`npx -y @v1nvn/statusline-lab`) — the md/rm/tokens command
   precedent; pins ride only `.mcp.json`/`hooks.json`, and this plugin ships
   neither. Close: `yarn build` + `vitest` green;
   validate + `set-version.mjs --check` + `build-skills.mjs` pass.
2. **Runtime move** — `bin/statusline.sh` + `components/` from the lab; picks
   read from the data dir with shipped defaults; an unknown or
   not-yet-adoptable pick (gauge/fuse/strip) warns on stderr and falls back
   to the default alternative (compose.sh hard-errors today — a render path
   must not). Make `NOW` overridable (`: ${NOW:=$(date +%s)}`) so output is
   testable. A deterministic script materializes the demo git repo (pinned
   branch, counts, dates) into a temp dir; payload `current_dir` re-anchors
   to it. Close: golden vitest spawning `bash bin/statusline.sh` per fixture
   with `NOW` and `HOME` pinned produces deterministic single lines on any
   machine.
3. **Subagent runtime** — port `~/.claude/subagent-statusline.sh` to
   `bin/subagent.sh`: one stdin tick (`.columns` + `.tasks[]`) → one
   `{"id","content"}` line per row; the live STEPS array, verbatim; `NOW`
   overridable (duration is startTime vs NOW — keep the live ms heuristic,
   startTime units are undocumented); the
   `/tmp/subagent-statusline-input.json` dump does not port — the render path
   never writes. SEP follows the `style` pick via the same defaults→file
   chain as statusline.sh, sourcing `components/style.sh` (one components
   dir serves both bins); intra-row spacing stays fixed. Close: golden
   vitest with a multi-row fixture (`NOW` pinned)
   emits deterministic JSON lines; a narrow `.columns` steps the rungs
   down; a `style=dots` pick swaps the row separator.
4. **Trampoline + apply + resolve** — `apply` (idempotent, `--home` override
   for tests, `--dry-run`, `--force` for adoption over live scripts),
   `resolve` (prints the resolution chain). The trampoline forwards its args
   so one file serves both keys. Close: vitest with `HOME` pointed at fixture
   trees covers all three branches — resolves `installPath`, falls back to
   newest cache dir (`sort -V`), exits 0 silently when nothing is installed;
   `apply --force` with both keys present repoints both. The adoption entry
   is `/statusline:compose` (renamed from `/statusline:apply`): run `apply` —
   the line goes live with current picks at once, cancel-safe — then invite
   customization. The Bash tool cannot host a TUI, so the invitation is
   `! npx @v1nvn/statusline-lab pick` once the wizard (unit 7) lands; until
   then the conversational pick — render alternatives in-chat, write picks
   from the answers.
5. **Gallery + ansi port** — `statusline-lab gallery` renders every
   component × alternative across the shipped payloads (p1–p4 only — the
   data dir is never read; captures feed the wizard) to one HTML page, plus
   a subagent section showing whole rows at 2–3 widths (the component ×
   alternative matrix does not apply — the row layout is fixed, the rungs
   flex). Payloads
   re-anchor in memory at render time — timestamps and `current_dir` via the
   unit-2 fixture repo — so boxes render identically off the owner machine;
   per-component payload pairs (state: p4/p1, pr: p1/p3) move into the
   component headers, not a TS table. Close: gallery emits one block per
   `seg_<comp>_<alt>` parsed from component headers; `ansi.ts` unit-tested on
   escape samples.
6. **Capture** — `statusline-lab capture` normalizes stdin JSON into a payload
   file under the data dir; both shapes — main payload and subagent tick.
   Close: capture is idempotent — piping its own output back through is a
   no-op.
7. **Pick wizard** (deferrable) — `statusline-lab pick`: terminal wizard in
   the p10k spirit. Live preview line rendered by the real bash runtime on a
   chosen payload (latest capture or shipped fixture); every component's
   alternatives shown as rendered samples; arrows choose, `s` hides; width
   preview at 80/120/200. Finish writes the picks file, offers `apply` if the
   trampoline is missing. Previews are subprocess renders of the shipped
   runtime — no rendering logic in TS. Close: an end-to-end walk on a capture
   writes picks the next paint honors; cancel leaves picks untouched.
8. **Responsive engine** — port rungs + 2-line wrap from the live script into
   `bin/statusline.sh`. Close: a narrow-`COLUMNS` fixture wraps to ≤2 lines
   that each fit the width; wide renders full detail.
9. **Bash ramps** (deferrable) — precomputed color ramps replacing the three
   python3 variants (`bar=gauge`, `cache=fuse`, `rate=strip`). Until each
   lands, its pick falls back to the default (unit 2) and the variant stays
   gallery-only.
10. **Adopt + delete loose** — run `apply --force` on the owner machine (the
   trampoline path holds the live main script; the subagent key points at the
   loose row script), restart Claude Code, verify the main line and the agent
   panel both render; then delete `/Users/vineet/.claude/statusline-lab/` and
   `/Users/vineet/.claude/subagent-statusline.sh`. Close: a fresh session
   renders both surfaces; neither loose artifact exists.
11. **Release** — one-line commits per unit (`feat(statusline): …`), push,
    confirm release.yml cuts the train; the installed plugin moves on its own
    within ~10 min of the next session start (pipeline proven 2026-09-12).

## Invariants

- The trampoline never writes and never exits non-zero.
- Neither render script writes anything — the `/tmp` stdin dump in the live
  subagent script does not port.
- Node never runs at render time.
- The render path depends only on bash, jq, git.
- `apply` touches exactly three things: the trampoline file and the
  `statusLine` + `subagentStatusLine` keys.

## Enforcement inventory

Protected tests (byte-for-byte once landed): every golden/walk test the units
create under `packages/statusline-lab/` (units 2–8). A later unit that needs one
changed is a behavior change — the commit message says so, and the plan's log
records why.

Forbidden idioms — grep counts that stay 0 across the whole run, under
`plugins/statusline/`:

- `python3` (render path is bash+jq+git only; the three loose-lab python3
  variants do not port until unit 9 replaces them with precomputed ramps —
  after which the count is still 0).
- `node`/`npx` invocations from `bin/` or `components/` (Node never runs at
  render).
- Writes from the render path: `mktemp`, `tee`, `cp`, `mv`, `>`/`>>` file
  redirects in `bin/*.sh` (stderr `>&2` warnings allowed); the live subagent
  script's `/tmp` stdin dump does not port.
- Nonzero exits in the trampoline template (never exits non-zero, never
  writes).
- Network: `curl`/`wget` in the render path.
- Code beyond the endorsed set: only `.sh` under `bin/`+`components/`, `.md`
  under `commands/`, and `.claude-plugin/plugin.json` — no `.ts`/`.js`/`.py`.

Counts that must never rise:

- python3 call-sites in the shipped runtime: 0, before unit 9 and after.
- Trampoline length: under 25 lines (written once by `apply`; growth means
  render logic leaked into it).
- Per-unit diff ceiling: 800 changed lines (pure deletions exempt).

Comment rule, scoped: the component-header alternative declarations (e.g.
`# model: plain | block | pill | zen`) are contract — the gallery parses them
(unit 5) — and survive verbatim. Every other touched file's comment count does
not rise.

External read-only until unit 10: `~/.claude/statusline-lab/**`,
`~/.claude/statusline-command.sh`, `~/.claude/subagent-statusline.sh`. Tests
copy them into temp fixtures; nothing writes in place before the adopt unit.

## Open decisions

None. Closed 2026-09-17: the gallery renders shipped payloads only (captures
feed the wizard); subagent SEP follows the `style` pick.

**Log.**
- 2026-09-12 — plan seeded from the `~/.claude` conversion session. Same day
  the plugin auto-update jam was fixed at the root (`DISABLE_AUTOUPDATER` +
  legacy `autoUpdates` keys deleted; background pass verified end-to-end, eight
  plugins moved 0.15.0 → 0.18.0 within ~10 min of session start) — which is
  what makes the no-mechanism trampoline design sufficient. Statusline docs
  checked the same day: plugins cannot ship a main `statusLine` (only
  `subagentStatusLine`), no stable cache path exists, cache dirs are
  version-stamped and swept ~14 days after update — hence resolution via
  `installed_plugins.json` with a glob fallback.
- 2026-09-13 — second surface: the agent panel (`subagentStatusLine`) is
  customizable the same way; a live renderer already sits at
  `~/.claude/subagent-statusline.sh` (contract read from the script —
  `.columns` + `.tasks[]` in, one `{"id","content"}` JSON line per row out).
  One trampoline now serves both settings keys via a `--subagent` arg;
  `apply --force` covers adoption, where both keys already point at loose
  scripts. Docs same day: same `{type, command}` object in any settings file,
  width arrives as `columns` in the payload (no `COLUMNS` env), one batched
  call per refresh tick. A plugin *could* ship a default `subagentStatusLine`
  in its own settings.json, but `${CLAUDE_PLUGIN_ROOT}` resolution and
  user-vs-plugin precedence there are undocumented — the plan stays on
  user-settings keys + trampoline, which is fully documented. Same day the
  pick wizard joined as a deferrable unit — p10k-style TUI; previews spawn
  the real runtime, the picks file stays the single state store. Also same
  day: `/statusline:apply` renamed `/statusline:compose` — apply first (line
  live with defaults, cancel-safe), then the wizard via the `!` prefix (the
  Bash tool is non-interactive); conversational pick is the pre-wizard
  fallback.
- 2026-09-17 — run started (branch `statusline-plugin`, whole thread, units
  0–11). Gate green at start. Derived mechanics: gate = lint+typecheck+build+test
  at root plus `set-version.mjs --check`, `build-skills.mjs`, plugin validate;
  per-unit diff ceiling 800 lines; one PR at the end, base `main`, never merged
  by the run. Units 7 and 9 in scope. Enforcement inventory added above.
- 2026-09-17 — review against source closed both open decisions: gallery
  renders shipped payloads only (the data dir is never read; captures feed
  the wizard); subagent SEP follows the `style` pick. Live docs re-verify the
  contract (all task fields incl. type/status/cwd/tokenSamples; output is
  override-only — emitting every row is a valid subset; startTime units
  undocumented, so the ms heuristic ports) and now document a plugin-settings
  `subagentStatusLine` — but still no plugin `statusLine`, and
  `${CLAUDE_PLUGIN_ROOT}` there is undocumented: the trampoline stands.
  Commands invoke the lab unpinned (pins ride only hooks/mcp configs; this
  plugin ships neither).
