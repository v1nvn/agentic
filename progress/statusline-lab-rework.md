# Statusline-lab rework — two verbs, config-in-script, plugin-carried runtime

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** run-plan on this file, whole thread, units 1→3 in order · grain: one
unit = one commit, all land on branch `statusline-plugin` (PR #2 absorbs them —
never open a new PR) · models: opus builder per unit; nothing is owner-gated ·
commits: conventional one-liners, no Co-Authored-By trailers (repo rule)

**Goal.** Collapse the surface to two verbs and delete every accidental part:
no trampoline, no picks file, no runtime copies, no manual capture. Ruled in
the 2026-09-19 session (owner + architect, full brainstorm in git history of
this file's creation commit). Nothing has shipped to npm and the plugin has no
real installs — **no backward compatibility; the old way is deleted in the same
change that lands the new one.**

## Contracts — settled, do not relitigate

1. **Two verbs, nothing bare.** `statusline-lab` with no args prints help and
   exits non-zero. `catalog` and `configure` are the only subcommands.
2. **`catalog`** — one line per item, `item: alt | alt*`, `*` = live value
   (read from the generated script's exports, defaults otherwise), zero ANSI.
   Boolean flags filter: `catalog --model --bar`. Item ids and alt ids are the
   currency everywhere (same ids as variant flags and the export lines).
   The menu comes from the resolved runtime's component headers — catalog,
   configure, and the wizard all resolve the runtime through the same install
   seam; unresolvable → non-zero + the install hint (the package is pure TS
   and carries no bash, so there is no other source for the table).
3. **`configure` modes:**
   - TTY, no params → the wizard: browse variants, live preview of both
     surfaces at 80/120/200 columns, save = write both generated scripts + the
     two settings keys.
   - Params → **strict**: every item named in `--layout` must have a variant
     flag, else fail listing what is missing. Nothing is filled silently.
   - No TTY + no params → print effective config + a hint; never hang a pipe.
   - `--fallback=default`: defaults pre-populate, **resolved at write time to
     concrete values** (the script never contains the word default); flags
     override.
   - `--fallback=existing`: pre-populated from the generated script's export
     lines; flags override.
   - `--dry-run`: base → flags → validate → render both surfaces, persist
     nothing.
   - `--force` takes over foreign settings keys; `--home <dir>` operates on
     another home (test seam). Unknown item or variant id → hard error listing
     valid ids (the old silent fallback dies).
4. **The layout is the contract.** `--layout '{cwd branch} {model effort}'` —
   brace clusters; grammar is braces + item ids + spaces, nothing else (bash
   parses it on every paint). Items not named in the layout need no variant.
   The default layout reproduces today's hardcoded composition.
5. **Config lives in the generated scripts** — the picks file dies. Both land
   in `~/.claude/plugins/data/statusline-lab-agentic/`; the settings keys
   point at them:

   ```bash
   #!/bin/bash
   # statusline-lab — your config. Managed by `statusline-lab configure`.
   export STATUSLINE_LAB_MODEL=block
   export STATUSLINE_LAB_BAR=gauge
   export STATUSLINE_LAB_LAYOUT='{cwd branch} {model effort} {bar tokens cache}'
   d=$(printf '%s\n' "$HOME"/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1)
   [ -f "${d%/}/runtime/statusline.sh" ] && exec bash "${d%/}/runtime/statusline.sh" "$@"
   exit 0
   ```

   `subagent-statusline.sh` = same shape with an empty config (the agent
   surface has no variants yet; a `--subagent` mode is deferred until it does).
   Atomic write (`tmp` + `mv`), validate before write. **`configure` touches
   exactly four things: the 2 generated scripts + the 2 settings keys.**
   The export set is **exactly the layout's items, in every mode** — a
   fallback sources values, never membership: `--fallback=existing` keeps
   values only for items the new layout still names, unresolved layout items
   fail loudly, and exports for dropped items are deleted on write.
6. **The runtime ships with the plugin.** Repo layout
   `plugins/statusline-lab/runtime/{statusline.sh,subagent.sh,lib.sh,components/*.sh}`
   (from today's `bin/` + `components/`). The npm package is pure TS — zero
   bash; `scripts/sync-runtime.mjs` and `assets/runtime/` die. The renderer
   reads `STATUSLINE_LAB_*` env with `:=` defaults in `lib.sh`;
   `check_picks`-style last-resort validation stays (the paint path never
   crashes — it falls back and warns on stderr).
7. **The tee replaces capture.** Both runtime entries tee their stdin to
   `~/.claude/plugins/data/statusline-lab-agentic/captures/{main,tick}.json`
   (atomic `tmp` + `mv`). The wizard prefers the capture, fixtures `p1`–`p4`
   otherwise. No human performs capture, ever.
8. **Wizard previews spawn the installed runtime with env overrides**
   (`STATUSLINE_LAB_*` + `COLUMNS`/`NOW`) — `overlayPicks` and the temp-home
   dance die. Both surfaces are previewed (the panel row via `subagent.sh` on
   the tick fixture or capture).
9. **Skill.** `/statusline-lab` (the only command, ever) = show (agent runs
   `catalog`, pastes the plain table) + set (agent runs `configure --ids`
   after the tour — never hand-writes files) + exactly one hand-off:
   `! npx -y @v1nvn/statusline-lab configure`. Nothing opened, no ANSI in
   chat, no second command.
10. **Terminology.** apply→configure · trampoline dead · designs→catalog ·
    the `pick` verb dead · `payload`/`resolve` verbs dead (`resolve.ts` logic
    stays as the install-check + wizard runtime resolution). Generated files:
    `statusline-command.sh`, `subagent-statusline.sh`.

## Deletions — same change, no compat

The six old verbs · the trampoline file `~/.claude/statusline-command.sh`,
its marker, its jq arm · the picks file and `DATA_DIR` picks reading ·
`scripts/sync-runtime.mjs` + `assets/runtime/` · `src/apply.ts` +
`src/capture.ts` · the skill's capture/paste section and all agent-side
pick-file writing.

## Units

| # | Unit | What lands | Verification | Model |
|---|------|------------|--------------|-------|
| 1 | runtime restructure | `runtime/` layout, env config, layout parser, tee | suite green; goldens byte-identical under the default layout; env override changes the render; capture files appear | opus |
| 2 | CLI rewrite | `catalog` + `configure` (all modes), wizard env previews, script generation | cli/wizard tests green; scratch-home e2e (fake plugin cache → configure → scripts + settings; catalog stars follow) | opus |
| 3 | skill + docs + close-out | skill body, README, CLAUDE.md amendment, PR #2 body, TODO/progress bookkeeping | fresh-eyes read; plugin validate; full gates; PR body matches the surface | opus |

### Reading lists (workers read only these + their unit section + the contracts)

- **Unit 1:** `plugins/statusline-lab/bin/*.sh`, `plugins/statusline-lab/components/*.sh` (headers), `packages/statusline-lab/test/{runtime,statusline,subagent,responsive,ramps}.ts`, `test/goldens/` (read-only). Contracts 4–8.
- **Unit 2:** `packages/statusline-lab/src/*.ts` (all), `test/{cli,wizard,apply}.test.ts`, `package.json`. Contracts 1–3, 5, 10 + unit 1's landed shape.
- **Unit 3:** `plugins/statusline-lab/commands/statusline-lab.md`, `README.md`, `CLAUDE.md`, `.claude-plugin/marketplace.json`. Contract 9 + the PR body via `gh pr view 2`.

### Enforcement inventory (orchestrator checks after every commit)

- **E1** goldens untouched by unit 1: `git diff --name-only <unit1-base> HEAD -- packages/statusline-lab/test/goldens` is empty.
- **E2** after unit 2, `cli.ts` registers exactly two subcommands (`catalog`, `configure`).
- **E3** forbidden strings at zero in `packages/statusline-lab/src` + `plugins/statusline-lab/runtime`: `read_picks`, `sync-runtime`, `assets/runtime`, `overlayPicks`.
- **E4** the settings-refusal cases (foreign `statusLine` / `subagentStatusLine` key) survive the port from `apply.test.ts` as failing-to-overwrite assertions.
- **E5** every commit is a one-liner with no Co-Authored-By trailer (repo rule; overrides harness default).

### Unit 1 — runtime restructure

`git mv` `bin/{statusline,subagent,lib}.sh` and `components/` under
`plugins/statusline-lab/runtime/`. `lib.sh`: `read_picks` dies; per-item
`: "${STATUSLINE_LAB_MODEL:=plain}"` (one line per item, defaults = today's
`default_pick` table); export the default layout constant. `statusline.sh`:
read stdin once into a variable, tee it to `captures/main.json` (atomic),
parse `STATUSLINE_LAB_LAYOUT` into clusters (default reproduces the current
hardcoded composition; unknown item id → skip that item + warn stderr; empty
layout → default). `subagent.sh`: same tee to `captures/tick.json`. Tests: `test/runtime.ts`
(the on-disk render helper — an earlier draft said `fixtures.ts`, corrected)
gains env injection; `statusline/subagent/responsive/ramps` suites
re-anchored; **goldens must stay byte-identical** (default layout = current
composition is the port's proof). The tee writes **raw stdin bytes, trailing
newline included**; capture replacement is later-wins; empty layout behaves
like unset (`:=` semantics). The test writer's three files —
`test/plugin-runtime.ts`, `test/plugin-runtime.test.ts`,
`test/runtime-tee.test.ts` — are protected: the builder reports conflicts
with them, never edits them. Verify: full gates; the 17 new tests green; a
manual render with `STATUSLINE_LAB_MODEL=block` shows the block variant; a
piped payload leaves `captures/main.json` behind.

### Unit 2 — CLI rewrite

Owed by unit 1 (landed 23d8185): `lib.sh` exposes `read_config`/
`check_config`/`capture` + exported `DEFAULT_LAYOUT`; `statusline.sh` keeps
the `COMPS=` line (item-id registry), the comp=alt argv loop and `--seg`
(wizard/ramps still ride them) — delete argv/`--seg` when env previews land.
`scripts/sync-runtime.mjs` is retargeted to `plugins/statusline-lab/runtime`
→ `assets/runtime` (flat); it and `assets/runtime/` still await deletion with
the build prefix. `test/runtime.ts` still exports `PICKS_PATH` for the
cli/wizard suites and gained `variantEnv('item=alt')`; wizard.test's
"paint no longer reads picks" assertion is unit 1's flipped original —
rewrite it with the configure writer.

Delete `src/apply.ts`, `src/capture.ts`, the `pick`/`designs`/`payload`/
`resolve` verbs and their pins. New `src/configure.ts`: the mode machine
(strict / `--fallback=default|existing` / `--dry-run`), validation (layout
contract, unknown ids fail listing valid ones), the generated-script writer
(atomic, the exact shape in contract 5), and the settings splice (refuse
foreign keys, `--force`, ported from `apply.test.ts`). `src/cli.ts`: two
commands, per-item boolean flags on `catalog`, valued variant flags +
`--layout` + `--fallback` + `--dry-run` + `--force` + `--home` on
`configure`; bare invocation → help, exit 1. `src/wizard.ts`: env-spawn
previews (kill `overlayPicks`), prefer `captures/main.json`/`tick.json` over
fixtures, save through the configure writer. `resolve.ts` shrinks to
install-check + runtime path for the wizard; `configure` fails with the
install command when the plugin cache dir is absent. Tests: parsing pins for
both verbs, strict-failure, fallback resolution, `--fallback=existing`
parse-back, dry-run writes nothing, a generation golden for the script bytes,
settings splice ports. Verify: full gates; scratch-home e2e — fake
`~/.claude/plugins/cache/agentic/statusline-lab/0.x/runtime/` from the repo
runtime, run `configure --home`, assert the two scripts + settings keys, run
`catalog --home` and see the stars follow.

### Unit 3 — skill + docs + close-out

Owed by unit 2 (landed 711a244): the skill and README teach that the wizard
offers exactly the layout's items and `--layout` is the only way to add one
(style sits outside the default layout); no payload choosing anywhere —
previews prefer captures, fixtures otherwise. Mention that the settings
byte-preservation pins live in `test/splice.test.ts` and that
`test/configure.test.ts`'s unresolved-item pin was repaired by ruling
(2026-09-19, bytes-untouched instead of absent) so a fresh-eyes read does
not flag it. `package.json` `repository.directory` still reads
`packages/statusline` — stale from before this thread, fix with the docs
pass. `assets/payloads` + `assets/ticks` still ship in the npm package
(preview fixtures) — show them in the architecture tree.

Rewrite `plugins/statusline-lab/commands/statusline-lab.md` to contract 9.
README: two commands, the architecture tree (repo + machine), install story.
CLAUDE.md: amend the layout rule — the bash runtime is plugin payload under
`plugins/statusline-lab/runtime/`, the TS CLI is the package; terminal-only,
one-command, and name rulings unchanged. PR body via `gh pr edit 2` — surface
story only. Bookkeeping: archive `progress/statusline-lab-modes.md` (its
carried 10b step is rewritten below), replace the TODO lines with this
thread's, leave this file open until merge. Verify: fresh-eyes read of skill
+ README + PR body against the contracts; `claude plugin validate`; full
gates once more.

## Gates — every unit, before its commit

```sh
yarn workspace @v1nvn/statusline-lab build && yarn workspace @v1nvn/statusline-lab test
yarn lint && yarn typecheck
node .github/scripts/set-version.mjs --check
claude plugin validate plugins/statusline-lab/.claude-plugin/plugin.json
```

## Post-merge (owner machine)

Install `statusline-lab@agentic` from the marketplace, run
`npx -y @v1nvn/statusline-lab configure` (wizard), restart Claude Code, verify
both surfaces paint. Delete the dead artifacts: `~/.claude/statusline-command.sh`
(old trampoline), `~/.claude/plugins/data/statusline-lab-agentic/picks`,
`~/.claude/subagent-statusline.sh` if present. Archive this file when done.

## Log

- 2026-09-19 — file created from the session's rulings; units 1–3 defined;
  run-plan dispatched.
- 2026-09-19 — unit 1 landed (23d8185): `runtime/` restructure, env config,
  layout parser, stdin tee; gate green 176/176, 17 red tests green, goldens
  byte-identical. Seam beyond the unit's file list, reported not hidden:
  `sync-runtime.mjs` source retargeted and 8 path constants re-anchored in
  `src/wizard.ts`/`cli.test.ts`/`wizard.test.ts` (the synced copy is flat
  now), and wizard.test's paint-honors-picks assertion flipped to
  paint-ignores-picks — that premise is what unit 1 deletes. Fix round 1
  (822d4a4, blind review): `compose`'s two-line split now derives from the
  layout's cluster count (`WRAP_AT` in `parse_layout`), not the literal 2;
  pinned by a custom-layout wrap case in `responsive.test.ts`, gate 177/177.
- 2026-09-19 — unit 2 landed (711a244): CLI collapsed to `catalog` +
  `configure` (strict/fallback modes, dry-run renders through the installed
  runtime, contract-5 script writer + settings splice), wizard previews
  spawn the installed runtime with env overrides and save through the
  configure writer; `apply`/`capture`/`sync-runtime`/`assets/runtime`, the
  six old verbs and the argv/`--seg` loop deleted; ramps re-anchored to env
  previews (oracle bytes + the render path's trailing newline). Gate
  155/155, goldens untouched. Accepted consequences: the wizard offers
  exactly the layout's items (items outside the layout are unreachable in
  the TTY until `--layout` names them), and wizard/dry-run previews tee
  captures under the operated home (a capture is the last stdin the runtime
  saw, real or preview — pinned by the dry-run test). One authorized repair
  inside `test/configure.test.ts`: the unresolved-item pin asserted a seeded
  script absent — self-contradictory, latent behind the throwing stubs —
  now asserts its bytes untouched plus nothing else written; apply's
  byte-preservation pins ported to `test/splice.test.ts` (the old
  `line.sh` leftover probe became the full old command — the new subagent
  path contains that substring).
