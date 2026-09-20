# Statusline-lab config-in-key — 2-write footprint, restore + status

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** run-plan on this file, whole thread, units 1→4 in order · grain: one
unit = one commit, all land on branch `statusline-key-config` (one PR opened
at the end, surface-only body) · models: opus builder per unit; nothing is
owner-gated · commits: conventional one-liners, no `!`/BREAKING markers, no
Co-Authored-By trailers (repo rule) · release: post-merge train, minor
0.20.0 — owner ruled 2026-09-20 breaking surface is fine (zero installs),
ships as minor.

**Goal.** Collapse configure's footprint from four writes to **two settings
keys** — config rides inside the key value as env assignments, the runtime is
resolved by the newest-cache-dir glob, and no generated scripts or config
files exist. On top: a `restore` verb reverting exactly those two keys to
their pre-lab values, and a `status` verb diagnosing install/config/backup
state. Supersedes the 4-write design that landed with PR #2 (config-in-script);
the old way is deleted in the same change.

## Rulings — settled 2026-09-19/20, do not relitigate

1. **Config-in-key (owner ruling: "stay with A").** The settings values are
   the whole program. Canonical forms (byte-pinned by golden tests):

   ```
   d=$(printf '%s\n' ~/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1); STATUSLINE_LAB_LAYOUT='{model effort} {cwd branch}' STATUSLINE_LAB_MODEL=block bash "${d}runtime/statusline.sh" 2>/dev/null || true
   ```

   ```
   d=$(printf '%s\n' ~/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1); bash "${d}runtime/subagent.sh" 2>/dev/null || true
   ```

   Statement order is load-bearing and pinned: resolver staged into `d=`
   first; env assignments hug `bash` last (a prefix on the `d=` assignment
   dies with that statement). The subagent key carries no config (the panel
   has no variants). Quoting is closed by existing validators: variant ids
   are alnum, layout grammar is `[a-z0-9{} ]` — nothing user-controlled can
   need a quote; `LAYOUT` is single-quoted, variants bare, layout first then
   items in layout order.
2. **One resolution way (owner ruling: "be consistent, prefer one way").**
   The newest-cache-dir glob is THE resolver — in the key strings and in
   `resolveRuntime`. `installed_plugins.json` is read nowhere: `installPathFrom`
   and the `InstalledPluginsFile` shape in `resolve.ts` are deleted. (It was
   rejected for the key string as an undocumented, version-flagged schema
   with a per-scope array; consistency kills the TS-side read too. The
   statusline-glob-vs-host-record drift row is dead by this ruling.)
3. **`status` is the diagnostic verb** (owner ruling over doctor/info). Read
   only, zero ANSI, agent-runnable like `catalog`; exit 0 healthy, 1 when a
   row needs action, each problem row prints its fix command.
4. **Two writes, nothing else.** configure touches exactly the two keys of
   `~/.claude/settings.json`. The data dir holds only `captures/` (runtime
   tee) and `backup.json` (restore) — both disposable, host-deleted on
   uninstall. No generated scripts, no config file, no symlinks, no npx
   paint entry (node-per-paint was ruled out with the rework).

## Host facts — cited, verified 2026-09-19/20

- Statusline docs: "The `command` field runs in a shell, so you can also use
  inline commands instead of a script file." — inline commands are sanctioned
  use. Construct-level promises ($(), env-prefix, `||`) are implied, not
  enumerated → unit 1 verifies empirically by executing the key string.
  stderr is never displayed (only under `claude --debug`); no documented
  command-length limit. (code.claude.com/docs/en/statusline,
  /docs/en/settings-reference)
- Uninstall deletes `~/.claude/plugins/data/` from the last scope unless
  `--keep-data`; the cache dir is orphaned ~14 days then swept (sweep runs
  only while some plugin remains installed); `enabledPlugins` is removed;
  keys our tooling wrote are untouched — ordinary user settings, invisible
  to the lifecycle. No uninstall hook exists; no settings backup exists
  (`~/.claude/backups/` covers only `~/.claude.json`).
  (code.claude.com/docs/en/plugins-reference — "Persistent data directory",
  "Plugin caching and file resolution")
- Consequence: post-uninstall the keys point at a glob that empties after
  the sweep → blank line, delayed ~14 days. Hence the taught order
  **restore → uninstall**.

## Contracts

1. **Writer.** `configure` composes the key values from layout + variants
   (validation unchanged: strict items, `--fallback`, `--force`, `--dry-run`,
   `--home`). Splice machinery unchanged (byte-preserving for the rest of
   settings.json). `ours` predicate: subagent key = exact match; main key =
   fixed resolver prefix + `bash "${d}runtime/statusline.sh" 2>/dev/null
   || true` suffix, free middle (the config). The prefix/suffix constants
   live in one module; a golden test pins the exact template bytes.
2. **Read-back.** `readScriptConfig` dies; `readKeyConfig(home)` parses the
   main key's middle (`LAYOUT='…'` + `ITEM=id`) and feeds catalog stars,
   `--fallback=existing`, wizard prefill, printed mode, and `status`.
3. **Runtime unchanged.** Env contract stays (`read_config`, `:=` defaults,
   `STATUSLINE_LAB_LAYOUT`); tee to `captures/` stays; zero bash edits.
4. **`restore`** — reverts the two keys to pre-lab state, then cleans the
   data dir. Must not call `resolveRuntime` (works uninstalled). Backup
   `backup.json` (data dir, atomic, written before `commitSettings`):
   `{"createdFile": bool, "keys": {"statusLine": "<raw member text>"}}` —
   raw predecessor text at a repoint, first-takeover-wins; keys that were
   absent need no entry (restore removes them by recognizing ours). Per key:
   absent now → leave absent; ours → saved? splice raw back byte-exact :
   remove; foreign and ≠ saved → refuse naming `--force`, with it splice
   saved back. Endgame: `createdFile` and no members left → delete the file;
   else write spliced. Then delete by explicit path (no globs, no recursive
   rm): `captures/`, `backup.json`; rmdir data dir only if empty. Idempotent:
   nothing to do → `nothing to restore`, exit 0. Flags: `--dry-run` (print
   plan), `--force`, `--home`. Live in `src/restore.ts`; the span primitives
   are exported from `configure.ts` (one splice home, no second
   implementation).
5. **`status`** — `src/status.ts`, plain rows + verdict, composing existing
   seams: newest cache dir + runtime resolution (`resolveRuntime`, now
   glob-only), key classification per contract 1, config decode
   (`readKeyConfig`), config drift (every layout item and variant id checked
   against the resolved runtime's registry — the doctor catch after version
   bumps), backup summary, capture mtimes. Graceful without a runtime:
   partial rows + exit 1 + fix line (`claude plugin install
   statusline-lab@agentic`). Fix lines name the exact command (`rerun
   configure --fallback=existing`, `restore`, install).
6. **CLI surface:** `catalog` · `configure` · `restore` · `status` — four
   subcommands, one slash command. `/statusline-lab` keeps its shape and
   gains revert + check paragraphs; CLAUDE.md's one-command clause becomes
   show (`catalog`) · set (`configure`) · revert (`restore`) · check
   (`status`).

## Deletions — same change, no compat

`generatedScript` + script writer + `mainScriptPath`/`subagentScriptPath`
(`resolve.ts`) · `readScriptConfig` (→ `readKeyConfig`) · `installPathFrom` +
`InstalledPluginsFile` (one-way ruling) · the script-generation golden ·
wizard/CLI references to script paths. `DATA_REL`/`capturePath` stay
(captures, backup).

## Units

| # | Unit | What lands | Verification | Model |
|---|------|------------|--------------|-------|
| 1 | config-in-key writer | key composer + ours prefix/suffix matcher + `readKeyConfig`; `resolve.ts` glob-only; catalog/wizard/printed re-anchored; tests | gate; golden pins template bytes + statement order; parse-back roundtrip (write→read→identical config); quoting-closure test (validator output never needs quotes); scratch-home e2e: fake cache → `configure --home` → keys exact → `catalog --home` stars follow; **empirical shell test**: pipe `assets/payloads/p1.json` into `bash -c '<main key>'` on the scratch home → rendered line + `captures/main.json` written; with empty cache → empty stdout, exit 0 | opus |
| 2 | `restore` | `backup.json` write on the takeover path; `src/restore.ts` + verb + dispatch; tests | gate; flagship roundtrip pin (seed foreign key → `configure --force` → `restore` → settings.json bytes identical to seed); first-wins pin (reconfigure leaves backup untouched); createdFile pin; refusal pin names `--force`; restore works with cache dir absent; `--dry-run` writes nothing; wizard save writes the backup | opus |
| 3 | `status` | `src/status.ts` + verb + dispatch; rows per contract 5; tests | gate; healthy fixture → exit 0 + all rows; drift fixture (layout item unknown to the runtime) → exit 1 + fix line; foreign/absent keys rows; no-runtime partial + exit 1; backup and captures rows | opus |
| 4 | skill + docs + close-out | skill gains revert + check; README `## statusline-lab` rewritten to the 2-write story + uninstall order + status; CLAUDE.md verb-list amendment; TODO/progress bookkeeping | fresh-eyes read of skill + README against contracts; `claude plugin validate`; full gates; every npx line run verbatim against the built CLI on a scratch home | opus |

### Reading lists (workers read only these + their unit section + the contracts)

- **Unit 1:** `packages/statusline-lab/src/{configure,cli,index,resolve,catalog,wizard,payloads}.ts`,
  `plugins/statusline-lab/runtime/{lib.sh,statusline.sh}` (env contract
  only), `test/{fixtures.ts,configure.test.ts,splice.test.ts,cli.test.ts}`,
  `assets/payloads/p1.json`. Contracts 1–3, rulings 1–2, 4.
- **Unit 2:** unit 1's landed seams in `src/resolve.ts` — `mainKeyValue(layout,
  assignments)`, `subagentKeyValue`, `isOurMainCommand(command)` (prefix+suffix
  ours-match, free middle), `readKeyConfig(home) → {layout, values}`;
  `resolveRuntime` is glob-only. Span primitives still live private in
  `src/configure.ts` (`rootMemberValueSpan`, `insertMembers`, `settingsValue`)
  — unit 2 exports them there, no second splice home. Backup note:
  `planSettings` now repoints ours→ours reconfigures too, so backup.json must
  stay first-takeover-wins — save the predecessor only when it is not ours.
  Plus `test/configure.test.ts`. Contract 4, host facts.
- **Unit 3:** DONE — `src/status.ts` landed (`bb31fca`). Status composes the
  landed seams only: `resolveRuntime` (wrapped, null on throw), key
  classification via `isOurMember`, config via `readKeyConfig`, `readBackup`
  (exported from `src/restore.ts`), capture mtimes via `capturePath`.
  Newly exported from `configure.ts` for the verb: `memberCommand`,
  `parseClusters`, `parseSettings` — no second ours-checker, no new parsing.
- **Unit 4:** `plugins/statusline-lab/commands/statusline-lab.md`, `README.md`
  (`## statusline-lab`, `## Install`), `CLAUDE.md` (one-command clause,
  layout rule), `.claude-plugin/marketplace.json`. Contract 6 + landed
  `--help` text. The check paragraph must show the landed `status` output
  grammar (byte-pinned by `test/status.test.ts`, exit 0 on `healthy`, else 1):

  ```
  runtime: <version> — <n> items | runtime: missing — fix: claude plugin install statusline-lab@agentic
  statusLine: ours — layout='{model effort}' model=block effort=dim   (assignments in layout order)
  statusLine: foreign (./old-main.sh) — fix: rerun configure --force
  statusLine: absent — fix: rerun configure --fallback=existing
  subagentStatusLine: ours   (same foreign/absent shapes; ours carries no config)
  config: no drift | config: drift — unknown variant 'x' for 'item', unknown item 'y' — fix: rerun configure --fallback=existing
    (findings in layout order; the config row appears only when the main key is ours and a runtime resolved)
  backup: absent | backup: present — saved statusLine, subagentStatusLine | backup: present — created settings.json, saved nothing
  captures: main <age> ago | absent, tick <age> ago | absent   (age units s/m/h/d, floored)
  healthy | unhealthy   (verdict last)
  ```

### Enforcement inventory (orchestrator checks after every commit)

- **E1** `cli.ts` registers exactly four subcommands (`catalog`,
  `configure`, `restore`, `status`).
- **E2** one splice home: the span/member primitives exist in exactly one
  module, imported by both verbs.
- **E3** one resolution way: `installed_plugins` appears zero times in
  `packages/statusline-lab/src`.
- **E4** `src/restore.ts` never calls `resolveRuntime`; deletion is explicit
  paths only — no `rmSync(recursive: true)` on the data dir, no globs.
- **E5** every commit is a one-liner with no Co-Authored-By trailer and no
  `!` marker (repo rule; overrides harness default).

## Gates — every unit, before its commit

```sh
yarn workspace @v1nvn/statusline-lab build && yarn workspace @v1nvn/statusline-lab test
yarn lint && yarn typecheck
node .github/scripts/set-version.mjs --check
claude plugin validate plugins/statusline-lab/.claude-plugin/plugin.json
```

## Post-merge (owner machine)

Install `statusline-lab@agentic`, run
`npx -y @v1nvn/statusline-lab configure --model block --fallback=default`,
restart Claude Code, verify both surfaces paint (the first real-machine
confirmation of the inline-command key), run `status` → healthy. Cut 0.20.0
on the train. Archive this file when done.

## Log

- 2026-09-19 — restore thread opened: 4-write footprint, backup/restore
  contracts, host lifecycle facts settled from docs (data dir deleted on
  last-scope uninstall unless `--keep-data`; cache orphaned ~14 days; no
  uninstall hook; no settings backup).
- 2026-09-20 — design re-ruled with the owner after a brainstorm: option A
  (config-in-key, 2 writes) chosen over config-file and status-quo;
  canonical staged key strings settled; `status` verb named; one-way
  resolution ruling (glob everywhere, `installed_plugins.json` unread);
  shell-execution fact verified from docs ("runs in a shell… inline
  commands"), empirical render test moved into unit 1's verification.
  Units 1–2 rewritten, units 3 (status) and 4 (docs) added; thread renamed
  config-in-key. No code moved yet.
- 2026-09-20 — unit 1 landed (`4e7234b`): configure writes only the two keys
  with the ruling-1 inline commands (golden-pinned, statement order fixed);
  ours = prefix/suffix shape-match; `readKeyConfig` parses the key middle;
  `resolveRuntime` glob-only; catalog/wizard/printed re-anchored; script
  writer + script paths + `installed_plugins` read deleted. Five red tests
  green (168 total), full gate green, E3 PASS — E1/E4 stay red until units
  2–3.
- 2026-09-20 — unit 2 landed (`acbdda8`): `restore` verb (`src/restore.ts`,
  no `resolveRuntime`) splices saved raw member text back byte-exact, removes
  ours-keys that were absent pre-lab, refuses a changed foreign key naming
  `--force`, deletes a lab-created settings.json it empties, cleans
  captures/ + backup.json by explicit path with rmdir-if-empty; configure
  writes `backup.json` atomically before `commitSettings`, first-takeover-wins
  (wizard save inherits it via configure). Span primitives exported from
  `configure.ts` — one splice home (`removeMembers` added there). All 13 red
  tests green (181 total), full gate green, E4 PASS — E1 red until unit 3.
  Pins re-anchored for the deliberate surface change: the four backup.json
  footprint assertions, plus a fifth unlisted one — the catalog verb-list pin
  (`test/catalog.test.ts` "registers exactly…") now expects three verbs.
- 2026-09-20 — unit 2 fix round (blind review, `8af851f`): captures cleanup is
  flat (files only, no recursion; a stray subdir survives and the rmdir-if-empty
  tolerates ENOTEMPTY); the restored result carries text so the CLI line says
  keys-restored vs lab-data-cleaned (never "restored" when no settings file
  was touched); restore.test.ts dropped its dynamic-import scaffold for a
  static import. Gate green, E4 PASS.
- 2026-09-20 — unit 3 landed (`bb31fca`): `status` verb (`src/status.ts`)
  prints plain rows + verdict and maps healthy onto the exit code in
  index.ts (rows.join('\n'), exitCode 0/1). All 6 red tests green (187
  total), full gate green, echeck fully green — E1 PASS with the fourth
  verb, its last red. Real-CLI smoke on a scratch home confirmed both exit
  paths. Unit 4 owes the row grammar now written into its reading list.
- 2026-09-20 — orchestrator decision: unit 3's commit subject overclaims
  (`bb31fca` says backup/captures gate the exit code; they do not — the code
  is correct per ruling 3, only the subject is wrong) — accepted, history
  left as-is.
- 2026-09-20 — unit 4 landed: skill + README moved to the two-write
  four-verb surface (key shape raw, restore → uninstall with the one-line
  why, status grammar sample, data-dir tree without scripts), CLAUDE.md
  verb clause amended. Every npx line in both docs run verbatim against the
  built CLI on a scratch home (catalog stars, configure two-key write,
  status healthy exit 0, restore roundtrip to seed bytes); grep clean of
  the script-era claims; full gate green.
- 2026-09-20 — run closed: all four units landed with blind reviews and fix
  rounds (E1–E5 green over 13 one-liner commits; suite 158→187); PR #3 opened
  against main, surface-only body. Accepted-not-fixed: unit 3's commit subject
  overclaims (backup/captures rows do not gate the exit code — code correct
  per ruling 3). Reviewer-seam lesson: E4's grep cannot see hand-rolled
  recursion — the blind review is the backstop (unit 2 proved it).
