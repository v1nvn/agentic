# Statusline — resolver-deployed renderer + release dispatch

## Goal

A marketplace user updates the statusline plugin and the next paint runs the
updated renderer — no configure rerun, no session machinery: `status` prints
`renderer: resolves → <version>` and exits 0. A release is cut by
`gh workflow run release.yml -f bump=<patch|minor|major>` alone: the run
pushes `chore(release): vX.Y.Z`, publishes every package, and tags that sha.

## Current state

Plan approved (## Plan); nothing implemented. Every existing install — the
owner machine included — still paints the copied bundle in the data dir; after
unit 1's release installs, each needs one manual `configure` rerun to swap it
for the resolver (Migration, in ## Plan).

## Next step

Run unit 1: `/todo:run progress/statusline-resolver-release.md`.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| 1 | R2 — resolver-deployed renderer | | checklist | Root `yarn build` syncs a committed `plugins/statusline/render.mjs` (`git diff --exit-code` clean); `configure` writes `dist/resolver.mjs` bytes to the data-dir `render.mjs`; the key-e2e door test paints `alt install` after the planted install record repoints; `yarn workspace @v1nvn/statusline test`, `yarn typecheck`, `yarn lint`, `set-version.mjs --check` green. Commit `feat(statusline): resolve the renderer from the installed plugin`. |
| 2 | R1a — release dispatch | | | Scratch-branch `set-version.mjs --bump patch` round-trip passes `--check` and reverts clean; `release.yml` dispatch carries the `bump` input and a `prepare` job whose pushed sha the release job checks out and tags; `test.yml` gates the artifact drift after build; `references/npm-publishing.md` names the dispatch flow. Commit `ci(release): dispatch a version bump through prepare`. |

## Plan

Re-read the source behind every anchor before relying on it — the anchors
below were verified against the tree at plan time and drift. Unit 1 lands
first: unit 2's prepare job builds through the root-build sync it introduces.

### Unit 1 — R2 · resolver-deployed renderer

Read first: `packages/statusline/src/configure.ts` (BUNDLED_RENDERER :40-42,
syncRenderer :44-54, configure() tail :491), `src/status.ts` (rendererState
:149-177, status() :243-273), `src/resolve.ts`, `src/render/entry.ts` (:67
module-scope `await main()` — importable only in a child process),
`src/render/capture.ts`, `vite.config.ts`, and the tests named below.

1. **`src/render/install-record.ts`** (new) — the one spelling of record
   resolution; node built-ins only, so the render pass bundles it standalone
   while the CLI imports it in-process:
   `resolveInstall(home): {kind:'resolved', installPath, version} | {kind:'unresolved', reason}`.
   Reads `<home>/.claude/plugins/installed_plugins.json` (v2 shape:
   `plugins["statusline@agentic"]` array of `{installPath, version, installedAt,
   lastUpdated}`). Missing/unparseable/non-object → `unresolved:
   'installed_plugins.json unreadable'`. Keep entries whose
   `join(installPath,'render.mjs')` exists; pick max `Date.parse(lastUpdated)`,
   `installedAt` tiebreak, NaN→0; none → `unresolved: 'no statusline@agentic
   install with a render.mjs'`. `version` = the entry's string version, else
   `basename(installPath)`.
2. **`src/render/resolver.ts`** (new) — standalone entry beside `entry.ts`:
   `resolveInstall(process.env.HOME ?? '')`; unresolved → one stderr line +
   exit 1; else `await import(pathToFileURL(join(installPath,'render.mjs')).href)`,
   import failure caught the same way. Never touches argv or stdin; exits only
   on paths that wrote nothing to stdout.
3. **`vite.config.ts`** render pass: add input `resolver: 'src/render/resolver.ts'`,
   `entryFileNames: '[name].mjs'` → `dist/render.mjs` + `dist/resolver.mjs` in
   one pass (the entries share no modules). Head comment covers both artifacts
   with fewer lines.
4. **`configure.ts`**: add `BUNDLED_RESOLVER` beside `BUNDLED_RENDERER`
   (renderer stays — canonical artifact path for tests/fixtures); replace
   `syncRenderer` with `syncResolver` (read BUNDLED_RESOLVER, byte-equal skip,
   mkdir recursive, `.tmp` + rename); tail call at :491 swaps. The wizard rides
   along (it calls configure()).
5. **`status.ts`**: delete `rendererHash` + crypto imports. `rendererState`:
   data-dir file absent → `missing`; else `resolveInstall(home)`. Rows:
   - `renderer: resolves → ${version}`
   - `renderer: missing — fix: rerun configure --force --theme ${config.theme ?? 'classic'}`
   - `renderer: unresolved — ${reason} — fix: claude plugin install statusline@agentic`
   `configRow` fix: `rerun configure --theme ${config.theme ?? 'classic'}`
   (theme-clobber fix; `config` in scope at :247). `keyRow` absent/foreign
   fixes stay classic. `healthy`: `renderer.kind === 'resolves'`.
6. **Tests**:
   - `test/global-setup.ts`: bootstrap when either dist artifact is missing.
   - `test/configure.test.ts:407-444`: describe becomes resolver sync — same
     three tests against BUNDLED_RESOLVER (byte-equal write; mtime untouched on
     identity; diverged copy refreshed on a settings no-op — the migration
     rerun). `:400-403` footprint pins pass unchanged.
   - `test/fixtures.ts`: `plantRendererRecord(home, {installPath, version,
     lastUpdated})` writing a minimal v2 record; explicit call sites only —
     never inside configure/newHome. Default installPath =
     `dirname(BUNDLED_RENDERER)`.
   - `test/status.test.ts`: `rendererCurrent()` → `rendererResolves(version)`;
     healthy-home + unreadable-backup plant `1.2.3`; drift/foreign/absent
     describes unchanged (still missing; keys themeless → classic); delete the
     stale test (:228-243); keep missing (:245-254); new — no-plant →
     unresolved row + unhealthy, two records each way (older points at a dir
     without render.mjs → resolves the newer; newer without → resolves the
     older, the filter-before-max fallback), garbage JSON → unreadable row.
     Fix-seam
     (:257-313): themed case seeded `mainKeyValue('lean', null, ['--bar=wat'])`
     asserting the config-row fix reads `rerun configure --theme lean`, run,
     healthy; `runFixCommand` (:315-328) takes the theme token (validated
     against `THEME_NAMES`).
   - `test/key-e2e.test.ts`: plant after each configure in the key-running
     tests (:81-155); the footprint test (:43-69) gets no plant (pins that
     configure never writes the registry). Missing-renderer test (:157-167)
     keeps bytes. New door test — configure + plant dist → runKey paints
     (status 0, non-empty); plant `<home>/alt-install/render.mjs`
     (`process.stdout.write('alt install\n')`) with newer lastUpdated → runKey
     prints exactly `alt install`. New failure door — record whose installPath
     lacks render.mjs → non-zero, empty stdout.
   - `test/capture-tee.test.ts`: plant after each configure; the byte-identical
     tee assertions pin that the resolver does not consume stdin.
     `themes.test.ts` / `restore.test.ts` untouched.
7. **Artifact + build sync**: root `package.json` build appends
   `&& cp packages/statusline/dist/render.mjs plugins/statusline/render.mjs`;
   generate and commit the artifact in this unit (run root `yarn build`). Only
   the renderer ships in the plugin dir — the resolver ships in the npm
   package (`files: ["dist","assets"]` covers dist/resolver.mjs) and is
   deployed by configure. `plugins/statusline/.claude-plugin/plugin.json`
   description: "…keys that spawn a resolver in the plugin data dir, which
   imports the renderer shipped in the plugin".
8. **Docs, rewritten in place**: `packages/statusline/README.md` (:3-6, :40,
   :43, :55-61, modules table gains resolver + install-record rows, :96-99,
   :100-103 — keep the command bytes, replace "no glob resolver, no
   plugin-cache coupling" with the resolver semantics, :114-116, :119-120);
   root `README.md` (:71-73, :80-81 bytes unchanged with resolver prose,
   :105/:108-117 trees gain the committed artifact row and the
   `~/.claude/plugins/cache/agentic/statusline/<version>/` machine row, :124-127
   uninstall note); `plugins/statusline/SKILL.md` (:87-95 healthy sample →
   resolves row, :100-106 — new fix recipes, delete the "run status after a
   version bump" ritual, keep "run it right after configuring"); `CLAUDE.md`
   layout rule gains its one exception — `plugins/statusline/render.mjs`, a
   committed build artifact the root `yarn build` syncs.

### Unit 2 — R1a · release dispatch

1. **`set-version.mjs`**: refactor the apply path (:168-180) into
   `apply(version)`; add `--bump <major|minor|patch>` — read SOURCE version,
   increment, apply; unknown step fails. `--check` untouched. Yarn.lock pins
   workspaces as `0.0.0-use.local`, so a bump cannot break
   `yarn install --immutable`.
2. **`release.yml`**: `workflow_dispatch` input `bump` (choice
   none/patch/minor/major, default none — today's dispatch semantics
   preserved); top-level `concurrency: {group: release, cancel-in-progress:
   false}`; new `prepare` job (`if: github.event_name == 'workflow_dispatch'
   && inputs.bump != 'none'`, output `sha`): checkout → corepack + setup-node
   (26, yarn cache) → `yarn install --immutable` → `set-version.mjs --bump` →
   `yarn build` → gates (`claude plugin validate` marketplace + per-plugin
   loop with the CLI installed globally; `set-version.mjs --check`) → commit
   `chore(release): vX.Y.Z` as `github-actions[bot]
   <41898282+github-actions[bot]@users.noreply.github.com>` (one-liner, no
   trailers), `git add -A`, push, output the new sha. Existing job: `needs:
   [prepare]`, `if: (!failure() && !cancelled())`, and **two lines inside it
   change** — checkout `with: {ref: ${{ needs.prepare.outputs.sha || github.ref }}}`
   and release-action `commit: ${{ needs.prepare.outputs.sha || github.sha }}`.
   Without them the dispatch run publishes and tags the pre-bump sha while the
   skip guard no-ops the new version. The GITHUB_TOKEN push does not
   re-trigger `on: push`; the same run is the only publisher.
3. **`test.yml`**: after `yarn build`, `git diff --exit-code
   plugins/statusline/render.mjs` — the stale-artifact enforcer.
4. **`references/npm-publishing.md`** train section: dispatch flow (prepare →
   publish at the pushed sha; plain push publishes the current version;
   manual `set-version.mjs <version>` remains for local cuts).

### Enforcement inventory

- Row texts and fix texts above are contract — the status tests pin them
  byte-for-byte, and `SKILL.md` says each row names "a fix that runs exactly
  as printed".
- Settings-key bytes, backup/restore behavior, and the data-dir filename
  `render.mjs` never change.
- Forbidden: SessionStart hooks or any session machinery; a second applier
  beside configure; unpinned npx (`@latest`); pointing keys at cache version
  dirs or the marketplace clone.
- No `syncRenderer`/`stale`/`no-bundle` remnants beside the new states.

### Stop rules

- If the live `installed_plugins.json` shape departs from v2 (no `plugins`
  map or no `installPath` on entries), stop and post the observed shape
  before coding the resolver against it.
- If the two-entry render pass emits a shared chunk, stop and re-split the
  inputs rather than shipping a coupled bundle.

### Run mechanics

- Branch `statusline-resolver-release` off main; one PR at the end, base `main`.
- Whole gate: `yarn build && yarn test && yarn typecheck && yarn lint && node .github/scripts/set-version.mjs --check`. Unit 1's scoped gate is its row's four commands plus the root build it introduces; unit 2 adds the scratch-branch bump round-trip.
- Line ceiling 800 inserted lines per unit (`git diff --shortstat -M -- ':!*.snap' ':!plugins/statusline/render.mjs'` — the committed artifact is generated and exempt).
- Enforcement script `progress/.scratch/srr-gate.sh`, written from the inventory below; the clerk runs it after every commit and fix round.
- Worker scratch notes: `progress/.scratch/statusline-resolver-release-<unit>-<role>.md`.
- Pre-flight verified: the live `~/.claude/plugins/installed_plugins.json` is v2 shape (`plugins` map; one `statusline@agentic` entry carrying `installPath`, `version`, `lastUpdated`) — the resolver's stop rule is clear.

### Migration (owner runbook, not docs)

After the unit-1 release installs, each existing install reruns configure
once — `/lab` re-pick or
`npx -y @v1nvn/statusline@<new> configure --theme <current>` — swapping the
data-dir bundle for the resolver. Until then the old bundle keeps painting as
today; keys, backups, and restore are byte-compatible throughout.

### Post-merge follow-through (not a unit)

Dispatch `bump=patch` and watch prepare → release go green — prepare pushes
`chore(release)`, release publishes that sha, tag and `marketplace.json`
agree — before the first real cut. Then the owner's own migration rerun (above).

## Design

Updating the marketplace and plugin never applied renderer fixes: the keys
spawned a copied bundle only `configure`'s `syncRenderer` wrote, so every
install painted stale bytes until a manual rerun. The defect is the copy.

Decisions:

- **The deployed file becomes a version-less resolver.** It reads Claude
  Code's own install record (`installed_plugins.json` — rewritten by the
  plugin-update path) and imports the newest `statusline@agentic` entry's
  `render.mjs`. Plugin update → record repoints → next paint runs the new
  renderer. Same data-dir path and filename, so key bytes, parsing, backup,
  restore, and captures are untouched. The renderer self-invokes at module
  scope with a plain argv+stdin contract, so an in-process dynamic import with
  argv/stdin intact is the whole wrapper.
- **The renderer ships as a committed artifact in the plugin dir** — standard
  plugin practice: Claude Code's only update-time runtime is
  `npm ci --ignore-scripts` (no build scripts), so built output ships
  committed; Anthropic's own official marketplace ships code trees in plugin
  dirs. Root `yarn build` syncs the copy; CI drift-gates it — the artifact is
  a checked mirror like the version pins.
- **Release prep is a dispatched workflow step, not a remembered local
  command** — all version logic stays in `set-version.mjs` (`--bump` mode);
  the workflow is a thin shell around it. Default `bump: none` preserves
  today's dispatch-as-retry semantics; the pushed prepare sha is what the
  release job checks out, publishes, and tags.

Rejected: SessionStart-hook auto-sync and command-source plugins (session
machinery, ruled out — the latter also needs an acceptance prompt for
runs-as-you code); an unpinned `npx @latest` key (the repo's pin rule exists
because npx serves stale "latest" from cache — the exact bug class); pointing
the keys at cache version dirs (orphaned and swept in 14 days) or the
marketplace clone (couples the bar to catalog refresh, not install state, and
breaks for directory-source marketplaces); release-please/changesets
(per-package versioners that duplicate the mirror engine the repo owns).

Tradeoffs accepted: `status` no longer content-checks the data-dir file — a
corrupted resolver, or an old bundle during the migration window, reports
`resolves` while painting stale/blank; atomic tmp+rename covers torn writes,
and a configure rerun is the remedy a user tries anyway. Multi-scope records
resolve by max `lastUpdated`; a project-scope uninstall leaves a transient
`unresolved` that self-heals when Claude Code rewrites the record. Root
`yarn build` mutates a tracked file — local builds show a dirty tree when
dist and artifact disagree; the CI drift gate is the enforcer.
