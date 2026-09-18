# Statusline-lab — two-mode fixup (the terminal is the only gallery)

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** run-plan on this file, whole thread, units 1→4 in order · grain: one
unit = one commit, all four land on branch `statusline-plugin` (PR #2
absorbs them — never open a new PR) · models: opus builder per unit; nothing
is owner-gated except the carried 10b handoff below · commits: conventional
one-liners, no Co-Authored-By trailers (repo rule)

**Goal.** Separate the product into its two real modes and cut the browser
out entirely (owner ruling 2026-09-18: no browser involvement, ever — this is
a CLI product).

1. **CLI mode** — a terminal product like p10k/omz: `statusline-lab pick` is
   the wizard *and* the gallery, the only visual surface.
2. **Claude Code mode** — skill-driven: `/statusline-lab` orchestrates the
   CLI through the agent — adopt, capture, show the catalog, write picks the
   owner names — and hands visual browsing to the terminal wizard with one
   `!` line. The skill never opens anything and never renders previews into
   the chat.

## Rulings already settled — do not relitigate (details in CLAUDE.md and archive/statusline-plugin.md)

- The plugin/package/bin name is `statusline-lab`, never `statusline`
  (Claude Code ships a built-in `/statusline` that fights over the same
  `statusLine` settings key).
- Exactly one slash command, ever: `/statusline-lab`
  (`commands/statusline-lab.md`, stem = plugin name so the bare short-name
  alias resolves).
- This fixup adds the fourth wall: the terminal is the only rendering
  surface. No HTML, no browser, no font embedding.

## Current state (2026-09-18)

PR #2 open on branch `statusline-plugin`. Landed and e2e-verified: plugin
installs from a local marketplace (`claude plugin marketplace add <repo
checkout>` → `claude plugin install statusline-lab@agentic`), the trampoline
renders both surfaces from the installed plugin dir, an edit inside the
installed dir shows on the next paint, `apply` is cancel-safe and idempotent,
the wizard runs and saves picks, the suite is 159/159. The two-mode cut is
complete — the tree carries no statusline-lab gallery story anywhere. The
build thread lives in `archive/statusline-plugin.md`.

## Layout — what a fresh session needs

```
packages/statusline-lab/          @v1nvn/statusline-lab — bin `statusline-lab`
  src/index.ts                    dispatch; reads capture stdin as a stream (never readFileSync(0))
  src/cli.ts                      commander program: apply capture designs payload pick resolve
  src/apply.ts                    trampoline template + settings splice; statuslineCacheRoot
  src/resolve.ts                  installed_plugins.json key `statusline-lab@agentic`, cache fallback
  src/capture.ts                  DATA_DIR `statusline-lab-agentic`; payloads/ticks latest.json
  src/wizard.ts                   the TUI engine (injectable deps), fixture +
                                  panel-tick preview pipeline, shared parsers
                                  (readDeclarations, readDefaults, fixtureStdin),
                                  designsCatalog
  src/wizard-tui.ts               real terminal deps (raw mode, keys, screen render)
  src/demo-repo.ts                materializes the demo git repo (wizard fixtures, tests)
  src/payloads.ts                 fixture registry p1..p4
  assets/payloads/                fixture JSON (current_dir is the `/demo/atlas-web` placeholder)
  assets/ticks/multi.json         demo agent-panel tick (kept — unit 2 uses it)
  assets/runtime/                 GENERATED copy of plugins/statusline-lab (sync-runtime.mjs
                                  on every build) — edit plugins/, never the copy
plugins/statusline-lab/
  bin/statusline.sh               main-line renderer: clusters, responsive rungs, two-line fallback
  bin/subagent.sh                 agent-panel rows: tick {columns, tasks[]} → {"id","content"} lines
  bin/lib.sh                      read_picks — reads ~/.claude/plugins/data/statusline-lab-agentic/picks
  components/*.sh                 seg_<comp>_<alt>; header comment declares alternatives (one source)
  commands/statusline-lab.md      THE one slash command — skill contract only
```

Seams: picks and captures live in `~/.claude/plugins/data/statusline-lab-agentic/`;
the trampoline at `~/.claude/statusline-command.sh` resolves
`.plugins["statusline-lab@agentic"][0].installPath`, fallback newest dir under
`~/.claude/plugins/cache/agentic/statusline-lab/`, else exits 0 silently.

## Mode contracts — what each unit builds toward

- **CLI surface** (bin `statusline-lab`): `pick` (wizard-gallery previewing
  BOTH surfaces), `apply`, `capture`, `designs` (plain catalog, no ANSI), and
  unchanged `payload`/`resolve`. `gallery` is gone.
- **Skill surface** (`/statusline-lab`): agent runs the CLI via
  `npx -y @v1nvn/statusline-lab …` — adopt (`--force` over a foreign script),
  capture a pasted payload, print the `designs` catalog as a plain table,
  guided tour (walk components the owner cares about one at a time, write
  picks at the end), and exactly one hand-off for visual browsing:
  `! npx -y @v1nvn/statusline-lab pick`. Previews stay in the terminal on
  evidence, not taste: Claude Code renders Bash-tool ANSI only as a ~3-line
  collapsed preview, and 24-bit SGR — which the bar designs (gauge among
  them) emit — has arrived as literal text for some users (claude-code
  issues #18269, #16790).
  The `!` hand-off is safe even without a raw TTY: the wizard reads piped
  stdin and ships j/k/h/l as arrow-key aliases.
- **Trampoline and bash runtime unchanged** — both modes share them.

## Units

| # | Unit | What lands | Verification | Model |
|---|------|------------|--------------|-------|
| 1 | gallery cut | HTML surface deleted, shared parsers relocated | gates green; no .ttf in tarball | opus |
| 2 | wizard + catalog completeness | panel-row preview in the wizard; `designs` subcommand | piped-keys run shows the row; catalog matches headers | opus |
| 3 | skill reshape | `commands/statusline-lab.md` rewritten to the two-mode contract | scratch-home `/statusline-lab` walk | opus |
| 4 | docs + PR | README, CLAUDE.md invariant, PR body | fresh-eyes read | opus |

### Unit 1 — gallery cut

Delete: `src/gallery.ts`, `src/ansi.ts`, `test/gallery.test.ts`,
`test/ansi.test.ts` (38 tests die; suite 190 → 152), `assets/fonts/` whole
dir. In `src/cli.ts`: drop `gallery` from `Subcommand`, its `Command`, the
`--out` option and `ParsedArgs.out`. In `src/index.ts`: drop the
`buildGallery` import and dispatch arm. Relocate — `wizard.ts` becomes the
home of `readDeclarations`, `readDefaults`, `fixtureStdin` (its only
remaining consumers; `reanchorPayload` stops being exported, it is internal
to `fixtureStdin` now); `GALLERY_NOW` dies (the wizard anchors to real `now`;
tests use `DEFAULT_NOW` from `test/runtime.ts`). `test/cli.test.ts` pins
`gallery --out` parsing — delete that pin. Verify:
`yarn workspace @v1nvn/statusline-lab build && yarn workspace @v1nvn/statusline-lab test`;
`node packages/statusline-lab/dist/index.js gallery` exits non-zero with
usage (no such command); `cd packages/statusline-lab && yarn pack && tar -tzf
package.tgz | /usr/bin/grep -c '\.ttf'` prints 0; then `rm package.tgz`.

### Unit 2 — wizard + catalog completeness

Wizard panel preview: in `draw()`, under the main-line preview render one
agent row — `runtimeRenderer` with `bin = <runtime>/bin/subagent.sh`, no
args, stdin = `assets/ticks/multi.json` with `columns` set to the current
`WIDTHS[widthAt]` and `startTime` anchored near `now`; take the first
`{"id","content"}` line's content and print it as a second preview row
labeled `panel`. The wizard then previews both surfaces a pick affects.
`designs` subcommand: `cli.ts` + `index.ts` arm printing one line per
component from the declarations + defaults + current picks file —
`model: plain* | block | pill | zen` — `*` marks the live pick, no ANSI
codes. Verify: extend `test/wizard.test.ts` (a subagent spawn per draw, the
row appears in the frame) and `test/cli.test.ts` (a `designs` case asserted
against the component headers); e2e:
`printf '\r' | node packages/statusline-lab/dist/index.js pick --home "$(mktemp -d)"`.

### Unit 3 — skill reshape

Rewrite `plugins/statusline-lab/commands/statusline-lab.md` to the skill
surface contract above. Body shape: one frontmatter description; sections
Adopt / Capture / Catalog + guided tour / Visual browsing (the `!` hand-off).
Explicitly forbid: opening anything, rendering ANSI into chat, adding a
second command. Keep every `npx -y @v1nvn/statusline-lab` invocation
verbatim-runnable. Verify: read the body against the contract line by line;
install into a scratch home (`HOME=<scratch> claude plugin marketplace add
<this repo>; HOME=<scratch> claude plugin install statusline-lab@agentic`)
and confirm the installed `commands/` holds exactly this one file; `claude
plugin validate plugins/statusline-lab/.claude-plugin/plugin.json`.

### Unit 4 — docs + PR

README: drop every gallery/browser mention — the wizard is the gallery,
invoke column stays `/statusline-lab`; fix the layout tree. CLAUDE.md: add
the invariant "the terminal is the only rendering surface — nothing opens a
browser, nothing writes HTML" next to the one-command rule. PR body
(`gh pr edit 2 --body-file`): swap the gallery bullet for the two-mode story
(wizard-gallery + skill orchestration), no attribution footer. Sweep the
stale gallery references unit 1 left where no unit owns the file:
`components/state.sh:3` (`payloads:` header nothing reads),
`test/capture.test.ts:334`, `vite.config.ts:26`, `scripts/sync-runtime.mjs:3`.
Verify: gates below once more; fresh-eyes read of README + PR body;
`/usr/bin/grep -rn gallery packages/statusline-lab plugins/statusline-lab
README.md CLAUDE.md` silent (readability-mcp's "gallery" fixtures are
another plugin's vocabulary and third-party captures; out of scope).

## Gates — every unit, before its commit

```sh
yarn workspace @v1nvn/statusline-lab build
yarn workspace @v1nvn/statusline-lab test
yarn lint && yarn typecheck
node .github/scripts/set-version.mjs --check
claude plugin validate plugins/statusline-lab/.claude-plugin/plugin.json
```

Pre-merge e2e that works today (package not on npm until the release train):
`npx -y @v1nvn/statusline-lab …` resolves from any cwd inside this repo
(workspace link; the build chmods the bin). The plugin side needs no npm at
all — local marketplace install into a scratch home as in unit 3.

## Carried — 10b handoff (owner, post-merge)

Release-please cuts the train on merge; then on the owner machine: install
`statusline-lab@agentic`, `npx -y @v1nvn/statusline-lab apply --force`,
restart Claude Code, verify both surfaces paint, delete the loose
`~/.claude/statusline-lab/` and `~/.claude/subagent-statusline.sh`; archive
this file when 10b closes.

## Log

- 2026-09-18 — file created for the two-mode fixup ruling; build thread
  archived to `archive/statusline-plugin.md`. Units 1–4 defined; nothing
  built yet.
- 2026-09-18 — unit 1 gallery cut landed: `gallery`/`src/ansi.ts` + their
  tests + the font deleted, parsers relocated to `src/wizard.ts`; the
  `pair` parsing died with the gallery (only the gallery ever read the
  `payloads:` header — `components/state.sh:3` still declares it, now
  stale; orchestrator accepted the trim, header joins unit 4's sweep);
  suite 190 → 152; tarball carries no `.ttf`.
- 2026-09-18 — unit 2 landed: the wizard previews both surfaces (one
  `bin/subagent.sh` spawn per draw on the multi tick, columns riding the
  `w` cycle), and `designs` prints the catalog (`component: alt | alt*`,
  star = live pick, zero ANSI); suite 152 → 156.
- 2026-09-18 — unit 2 fix round: production imports `designsCatalog`
  from wizard directly (the cli.ts re-export stays as the frozen test's
  import surface — reviewer's stronger kill would need editing the
  contract test), `designs` gains its parseArgs pin (156 → 159), and the
  demo tick staggers 300 s/row all-past — every started row keeps its
  duration, first row now-300 ∈ (now-3600, now); reviewer verified.
- 2026-09-18 — unit 3 landed: `commands/statusline-lab.md` rewritten to
  the skill contract — Adopt / Capture / Catalog + guided tour / Visual
  browsing, the three forbids (nothing opened, no ANSI in chat, no second
  command) stated up front with the terminal-only evidence, the tour ends
  with the agent writing named picks as `comp=alt` lines (unnamed
  components' existing lines kept); the dead gallery lines died with the
  rewrite; scratch-home install holds exactly the one file, byte-identical.
- 2026-09-18 — unit 4 landed: README and CLAUDE.md carry the two-mode story
  (the wizard is the gallery; the terminal-only invariant sits next to the
  one-command rule), the four stale gallery references swept (the
  `payloads:` header had no reader since unit 1), PR #2 body swapped to the
  two-mode story with no attribution footer. Orchestrator ruling (veto
  table): the verify grep is scoped to the statusline-lab surface —
  readability-mcp's "gallery" is
  another plugin's vocabulary (image-only fixtures, third-party captured
  HTML); `packages/statusline-lab`, `plugins/statusline-lab`, `README.md`,
  `CLAUDE.md`, and every nested README grep silent.
