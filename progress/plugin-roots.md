# Port the eight plugins to the package-home root

**Run:** default grain — one commit per unit, one PR for the thread.

## Goal

All eight un-ported plugins (`readability`, `omlx`, `enhansome`, `rm`, `md`,
`zai`, `statusline`, `todo`) have their plugin root at their package home —
the G1b shape tokens landed — with every `packages/*/plugin/` directory gone,
every repo-side reference re-pointed, the layout law in AGENTS.md stating the
one shape, and the full gate green including `claude plugin validate` for all
nine plugins. Zero runtime delta: files move, paths re-point, no behavior
change.

## Current state

All six units landed. Every plugin roots at its package home; the layout law
states the one shape; the dead globs are gone; the enforcement greps read
0/0/0 and the full gate is green (validate on the marketplace and all nine
homes). Reviews clean throughout — units 3–6 zero findings. The thread
closes on this state; the PR rides `feat/plugin-roots`.

## Next step

None — thread closed.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| 1 | Harden the plan | | | this file carries one row per port group plus the shared-law unit, each with testable close criteria and a per-unit reading list; the enforcement inventory (`plugin/` dir count zero, no `plugin/` path left in config or md surfaces, protected gate list), gate lines, PR grouping and stop rules are written; the live probe is run and its verdict recorded (`claude plugin validate` on a re-rooted /tmp proxy of a manifest-only plugin and of one with npm code) — committed docs-only, landed `6059b0d`; review clean (3 low: commit state, unit 4 dead-glob leg strengthened with an ls-files count, installed-copy growth recorded) |
| 2 | Port the manifest-only homes — enhansome, todo | sonnet | | `packages/enhansome/` holds `.claude-plugin/` + `.mcp.json` and `packages/todo/` holds `.claude-plugin/` + `skills/` + `README.md` directly at the home root; `ls -d packages/enhansome/plugin packages/todo/plugin` finds nothing; marketplace sources read `./packages/enhansome` and `./packages/todo`; `claude plugin validate packages/enhansome` and `packages/todo` pass; `set-version --check` green (the new-shape globs already exist — no script edit this unit); root README's tree names both homes with no `plugin/` line — landed `5ea57c4`: 11 R100 renames, both sources re-pointed, both validates green, all ten gates green; review clean (one latent gap promoted into row 4: no `packages/*/.mcp.json` glob exists in set-version) |
| 3 | Port the command-hook homes — rm, md, zai | sonnet | | each home holds `.claude-plugin/` + `commands/` + `hooks/` at its root and no `plugin/` dir; the moved files are byte-identical (`git diff -M` shows pure renames — hooks.json and commands carry no relative paths); the three marketplace sources re-point; set-version's MD_SURFACES re-point to `packages/rm/commands/send.md`, `packages/md/commands/edit.md`, `packages/md/commands/view.md`, `packages/zai/commands/usage.md` with `--check` green; `claude plugin validate` passes on all three homes — landed `87d019c`: 10 R100 renames + 10 edited lines (3 sources, 4 MD_SURFACES, README), eleven gates green, review zero findings (live-glob check confirms the moved manifests and hooks.json are matched by the existing `packages/*/.claude-plugin/plugin.json` and `packages/*/hooks/hooks.json` patterns) |
| 4 | Port the MCP-server homes — readability, omlx | sonnet | | each home holds `.claude-plugin/` + `.mcp.json` (the pinned-npx plugin config) at its root; the dev wiring moves verbatim to `packages/<pkg>/dev.mcp.json` (Plan ruling); the two marketplace sources re-point; `claude plugin validate` passes on both homes; set-version PINNED_CONFIGS replaces `packages/*/plugin/.mcp.json` with `packages/*/.mcp.json` (no such glob exists today — the readability/omlx pins would leave `--check` enforcement silently; found in unit 2's review), the new pattern present exactly once in the script, `--check` green, and `git ls-files 'packages/*/.mcp.json'` finds exactly the two shipped configs (a dead glob passes `--check` silently; the dev wiring at `dev.mcp.json` is not matched); omlx README's dev line names `claude --mcp-config dev.mcp.json` (readability's README documents no dev wiring — nothing to edit); stop if the dev loop needs more than the one flag — landed `f57be0e`: 3 R100 renames + the two path-crossing config pairs (byte-identity proven against `git show HEAD:`), one PINNED_CONFIGS pattern replaced, ten gates green, review zero findings. Letter correction recorded: `git ls-files 'packages/*/.mcp.json'` finds THREE shipped configs (enhansome's unit-2 config joins — pin-free, zero enforcement delta), dev excluded; the row's "exactly the two" miscounted |
| 5 | Port statusline | sonnet | | `packages/statusline/` holds `.claude-plugin/` + `SKILL.md` + `render.mjs` at its root, no `plugin/` dir, and nothing under `src/` changes; root `package.json`'s build cp re-points to `packages/statusline/render.mjs`; `yarn build` green and `git diff --exit-code packages/statusline/render.mjs` clean with test.yml's guard re-pointed to the same path; the marketplace source re-points; set-version's MD_SURFACES SKILL.md path re-points with `--check` green; `claude plugin validate packages/statusline` passes; statusline README's artifact line and root README's statusline tree lines re-point — landed `35618f6`: 3 R100 renames (render.mjs byte-identical, build guard clean post-build), ten gates green, review zero findings (guard re-proven independently) |
| 6 | Close the law — one shape, dead globs out | | | `ls -d packages/*/plugin` finds nothing; the enforcement greps (Plan) hit zero; AGENTS.md states the one shape (the "other eight keep a `plugin/` subfolder" clauses gone, the synced-artifact path re-pointed, the dev-loop mention names `dev.mcp.json`); references/mods.md's "keep `plugin/` until they port" parenthetical gone; set-version's MIRRORS/PINNED_CONFIGS carry no `packages/*/plugin/` pattern and build.yml + release.yml validate loops carry only `packages/*/.claude-plugin/plugin.json`; the full gate green — `--check`, typecheck, lint, test, build + render guard, validate on the marketplace and all nine homes, `test:mods` 3/3, build-skills — landed `28b9a30`: five files 23+/28−, full gate green (validate on the marketplace + all nine homes), greps 0/0/0, review zero findings (letter correction: the surviving `packages/*/hooks/hooks.json` glob matches FOUR homes — tokens carries its own hooks.json — not three; pre-existing glob, unchanged) |

## Plan

Seam facts verified first-hand (units build on them, not re-derive):

- Shapes — `readability`: `plugin/{.claude-plugin, .mcp.json, skills}`;
  `omlx`, `enhansome`: `plugin/{.claude-plugin, .mcp.json}`; `rm`, `md`,
  `zai`: `plugin/{.claude-plugin, commands, hooks}`; `statusline`:
  `plugin/{.claude-plugin, SKILL.md, render.mjs}`; `todo`:
  `plugin/{.claude-plugin, README.md, skills}`. `enhansome` and `todo` homes
  hold only `plugin/`.
- Named re-points: `marketplace.json` source lines (8);
  `set-version.mjs` globs `packages/*/plugin/{.claude-plugin/plugin.json,
  .mcp.json, hooks/hooks.json}` and MD_SURFACES paths (`packages/statusline/plugin/SKILL.md`,
  `packages/{rm,md,zai}/plugin/commands/*.md`); root `package.json` build
  `cp` line for `packages/statusline/plugin/render.mjs`;
  `.github/workflows/test.yml` render guard, `build.yml` + `release.yml`
  dual-glob validate loops; AGENTS.md layout-law clauses (the subfolder
  sentence, the plugin-only-homes sentence, the artifact path) and its
  dev-loop `wired in .mcp.json` mention; root README layout tree and
  statusline tree lines; statusline README artifact line; omlx README dev
  line (unit 4's ruling).
- Non-seams, verified: `readability`/`omlx`/`rm`/`md`/`zai` hooks are pure
  `hooks.json` command hooks or `.mcp.json` npx configs (zero TS) — no mod
  promotion, `test:mods` stays tokens-only, and `claude plugin test` on a
  ported home refuses ("no hooks module"), so no unit gates on it outside
  tokens. All eight manifests carry only name/version/description/author —
  no path field to break. `tsconfig.mods.json` includes, `.gitignore`, and
  eslint ignores are already shape-generic. `.ts`/`.tsx` sources carry zero
  `plugin/` references. `smithery.yaml`, `build-skills.mjs` (walks
  `packages/` for SKILL.md generically), `bench.yml`, and
  `readability-versions.yml` carry no `plugin/` path — the earlier
  "smithery grep-confirmed owed" was wrong, corrected here. Skill and
  command bodies carry no repo paths.

Probe verdict (unit 1, verbatim tails):

- `claude plugin validate /tmp/probe-enh` →
  `Validating plugin manifest: /tmp/probe-enh/.claude-plugin/plugin.json` /
  `✔ Validation passed`
- `claude plugin validate /tmp/probe-zai` →
  `Validating plugin manifest: /tmp/probe-zai/.claude-plugin/plugin.json` /
  `✔ Validation passed`
- `claude plugin test /tmp/probe-zai` →
  `claude plugin test: /tmp/probe-zai: no hooks module to load; hooks/hooks.json names none in "modules"`
  (exit 1 — expected: the mod runner on a command-hooks plugin; confirms
  validate, not test, is the per-plugin gate).

Statusline install-path finding — settled: no code change, no settings
refresh. The settings keys the `/lab` configure flow writes
(`src/configure.ts` via `mainKeyValue`/`panelKeyValue` in `src/resolve.ts`)
never name the plugin install path: the program is
`node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" ... || true`,
a resolver the CLI deploys into the data dir on every configure
(`syncResolver`). That resolver (`src/render/resolver.ts`) reads Claude
Code's own install record (`~/.claude/plugins/installed_plugins.json`),
picks the newest `statusline@agentic` entry whose `installPath` has
`render.mjs` directly beneath (`install-record.ts` `usable()`), and imports
it — and `installPath` is wherever the marketplace copied the source dir, so
today's cache version dir already holds `render.mjs` at its top (the copied
`plugin/` folder's root) exactly as the package home will post-port. Both
shapes pass `usable()` simultaneously, so update ordering cannot strand the
line; the owner's live settings line needs no refresh after the next
release, and re-running `/lab` set is optional. Unit 5 changes repo-side
paths only; root README's installed-copy line
(`~/.claude/plugins/cache/agentic/statusline/<version>/`) stays true as
written. One consequence, recorded (review): post-port every installed copy
grows from the `plugin/` subset to the package home's shipped contents — the
tokens cache at 0.33.0 already shows the shape (`src/`, `test/`, `bin/`, no
`node_modules/`) — with `render.mjs` staying at the top.

Dev-wiring ruling for unit 4 (forced by G1b, vetoable): post-port,
`packages/<readability|omlx>/.mcp.json` is the shipped plugin config, and
the dev wiring cannot live there — a marketplace install copies the whole
home, so a `readability-dev` entry would ship to every install and spawn
`yarn dev` with no repo (a runtime delta). The wiring moves verbatim to
`packages/<pkg>/dev.mcp.json`, and the README dev line names
`claude --mcp-config dev.mcp.json` — the engine's own flag, no new
mechanism; the file keeps its relative `yarn dev` command for sessions
opened in the package dir.

Grouping and models: risk ascends — manifest-only homes first (cheapest
proof of the shape), then command-hook homes, then the MCP homes (the one
ruled deviation), then statusline (synced artifact), then the law close.
Units 2–5 are sonnet: every seam above is an exact file-and-line re-point
or a pure rename; the judgment lives in this file, not the port. Unit 6 is
default model: rewriting the layout law and README tree is prose judgment
with no mechanical template. Every review is blind (the default) — each unit
lands literal-path config edits whose canonical failure, a stale literal,
is exactly what a diff-read catches.

Per-unit reading lists:

- Unit 2: this file; AGENTS.md; both `plugin/` trees;
  `.claude-plugin/marketplace.json`; root README layout tree.
- Unit 3: this file; AGENTS.md; the three `plugin/` trees; marketplace.json;
  `.github/scripts/set-version.mjs` (MD_SURFACES).
- Unit 4: this file; AGENTS.md (MCP-servers section); both `plugin/` trees
  and both root `.mcp.json` files; marketplace.json; omlx README dev table;
  `claude --help` (`--mcp-config`).
- Unit 5: this file; AGENTS.md layout law; `packages/statusline/plugin/`;
  `packages/statusline/src/{resolve,configure}.ts` and
  `src/render/install-record.ts` (read to not touch); root `package.json`
  build line; `.github/workflows/test.yml`; set-version MD_SURFACES;
  statusline README; root README statusline tree.
- Unit 6: this file; AGENTS.md layout section; `references/mods.md`; root
  README layout section; set-version glob block; `build.yml` +
  `release.yml`.

Enforcement inventory (final state):

- `ls -d packages/*/plugin | wc -l` → 0 (baseline 8).
- `git grep -nE '(^|[^.-])plugin/' -- . ':(exclude)progress' ':(exclude)archive' ':(exclude)**/dist/**' ':(exclude)**/node_modules/**'`
  → 0 hits (baseline 24: set-version.mjs 8, README.md 6, AGENTS.md 4,
  references/mods.md 1, statusline README 1, package.json 1, test.yml 1,
  release.yml 1, build.yml 1). The pattern skips `.claude-plugin/` (hyphen
  before `plugin/`) and `plugins/` (plural).
- `grep -c 'source.*packages/[a-z]*/plugin' .claude-plugin/marketplace.json`
  → 0 (baseline 8; steps down 8→6→3→1→0 across units 2–5).
- Protected gates, green every unit (edits only the named re-points):
  `node .github/scripts/set-version.mjs --check` · `yarn typecheck` ·
  `yarn lint` · `yarn test` · `yarn build` (test.yml's render guard) ·
  `claude plugin validate` on the marketplace (CI's file-arg form:
  `claude plugin validate .claude-plugin/marketplace.json`) and on every
  ported home · `yarn test:mods` (tokens 3/3 — the 2/2 in the hardened plan
  was stale; the pane-only commit grew the suite) ·
  `node .github/scripts/build-skills.mjs`.
- Diff ceiling: 800 changed lines per unit, pure deletions exempt, renames
  free under `git diff --shortstat -M` — every port unit is renames plus a
  handful of edited lines.

Gate baseline at `39c44ab`: `set-version --check` OK; typecheck OK; lint
green (the one prettier repair, `39c44ab`); `yarn test` exit 0 (17/339 +
3/21 + 3/37 across the workspace tails); `yarn build`, validate on the
marketplace and the eight homes, `test:mods`, build-skills fire with unit 2's
gate — the first commit that changes code they exercise.

PR grouping: one branch `feat/plugin-roots` off main, one PR, base main,
one conventional one-liner commit per unit (e.g. `refactor(readability):
port the plugin root to the package home`).

Stop rules: any per-unit `claude plugin validate` red on a ported home; a
manifest field the move breaks; anything forcing a second deviation beyond
the ruled dev-wiring move; any byte change to a moved file (the zero
runtime delta fence); a unit tempted to change behavior stops and reports.

## Design

- G1b (owner-ruled, `/tmp/agentic-tokens-structure-rulings`; recorded in
  archive/mods.md): the plugin root is the package home, `plugin/`
  disappears. Rejected: the `plugin/` subfolder root, symlink bridges.
- Inside a mod home `*.test.ts` belongs to the engine runner — vitest suites
  are `test/*.spec.ts` (references/mods.md). Bites only plugins that gain
  mods later; none of the eight has a hooks module.
- Fences: G2–G5 mod adoptions are NOT in this thread (parked in TODO.md on
  the owner's ruling); the npm-name change for readability/omlx is a separate
  entry; no behavior change rides the port.
