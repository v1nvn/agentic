# Yarn monorepo + pinned-npx plugins

**Goal.** One yarn workspace at the repo root; every plugin's code lives in a publishable
package and runs through **pinned** `npx` — inside Claude Code hooks and in plain shells.
Plugin dirs shrink to manifest + config wrappers, identical in shape to the two MCP wrappers
that already exist. Zero vendored code under `plugins/`.

**Decisions (scoped 2026-09-01, conversation with owner).**

- **Pinned npx, never `@latest`, on the hook path.** `npx -y <pkg>@<version>` runs from the
  npx cache once downloaded: warm runs instant, offline works, one download per version
  change. `@latest` resolves the dist-tag through the registry on *every* run — the
  per-invocation network hit that would kill the zero-token hook UX. Version pins are
  rewritten by `set-version.mjs`, so the marketplace refresh stays the single update channel.
- **Consistency of mechanism:** all six plugins work the same way — thin plugin dir, npm
  package behind it, npx in between. In-Claude and in-shell run the same bins.
- **Dedup via real dependencies.** Code moves out of `plugins/` into workspace packages;
  `rm`/`md`/`zai`/`tokens` depend on the shared package properly. The `shared/bin` copies and
  the build.yml `cmp` sync check exist only because installed plugins had to be
  self-contained; with no code left in plugin dirs, that constraint — and the duplication —
  goes away.
- **sh+jq wrappers die.** Each package bin grows a `--hook` mode that prints
  `{"decision":"block","reason":…}` itself. Only runtime dep becomes node/npx — every hook
  becomes Windows-safe.
- **All TypeScript, no JS/TS split** (resolved 2026-09-01). The five new packages mirror
  the two MCP packages: `src/*.ts` → `dist` via vite, vitest tests, bins pointing at built
  files with `#!/usr/bin/env node`. The four tools gain a build step they never had; one
  root `yarn build` covers all seven.
- **npm identity: `@v1nvn/*` everywhere** (resolved 2026-09-01, over unscoped descriptive and
  the `agentic-*` prefix runner-up; the `@agentic` org is taken by someone else's 73-package
  SDK). All seven packages scope under the owner's npm account — the scope is the account,
  so future repos may share it freely. `readability-mcp` and `omlx-mcp` **rename**: old
  names simply freeze at 0.13.0 — no deprecation pointers or move notes (owner: no
  backwards compatibility wanted); smithery / Dockerfile / READMEs re-pointed; users on
  old `@latest` pins ride the frozen final release until a marketplace refresh delivers
  the new pinned scope name.
- **Pin everything, `.mcp.json` included** (resolved 2026-09-01). All six plugin config
  files carry `@<train-version>` pins rewritten by `set-version.mjs`; the marketplace
  refresh is the single update channel. Reverses the 2026-08-31 `@latest` choice recorded
  in `archive/version-consistency.md`.
- **Lockstep stays** (re-affirmed 2026-09-01 when the monorepo reopened the question).
  One train version across all seven packages and six plugin manifests; every train
  publishes every package even when a package's diff is empty. Per-package semver ×7
  reintroduces the which-version-goes-where bookkeeping that stranded four plugins at
  0.1.0, and the exact pins in hooks.json/.mcp.json would each need independent tracking.
  A version that bumps with no changes is cosmetic noise; a missed bump is the bug already
  fixed once (`9313a11`).

**Target layout.**

```
package.json                # workspaces: ["packages/*"] — the seven packages
packages/
  readability-mcp/          # package renames to @v1nvn/readability-mcp
  omlx-mcp/                 # package renames to @v1nvn/omlx-mcp
  core/                     # @v1nvn/agentic-core — last-reply (ported bash+jq → TS) + text-format
  zai/  tokens/  rm/  md/   # TS ports of plugins/<n>/bin, each building a bin: { … } into dist/
plugins/
  readability/  omlx/       # .mcp.json (pinned npx) + plugin.json        (unchanged shape)
  zai/  tokens/  rm/  md/   # hooks.json → "npx -y @v1nvn/<n>@<ver> --hook" + plugin.json + commands/
```

**Migration steps** (each roughly one commit; land the train as `v0.14.0`).

1. **Root workspace.** Root `package.json` with the seven workspaces; delete the two
   per-package `yarn.lock`s, generate one root lock. Hoist `prettier.config.js` (identical
   today); `eslint.config.js` / `tsconfig.json` / `vite.config.ts` differ by 1–2 lines each —
   reconcile while moving. CI: one `yarn install --immutable`, one cache path.
2. **`core/` package — `@v1nvn/agentic-core`.** Port `shared/bin/last-reply` (bash+jq,
   36 lines) to TS — its header claims byte-for-byte `/copy` semantics; the port must
   preserve that contract. `text-format.mjs` ports alongside it. Published, since the
   tool packages depend on it.
3. **Four tool packages.** Port `plugins/<n>/bin/*.mjs` to TS under `<n>/src/`; absorb the
   remaining shell glue (rm `send-to-remarkable.sh`, md `encode-share` + `send-to-md.sh`,
   zai `usage.sh`, tokens `report.sh`) into TS. Packages `@v1nvn/zai`, `@v1nvn/tokens`,
   `@v1nvn/rm`, `@v1nvn/md`; bins `zai-usage`, `tokens-report`, `rm-send`, `md-send`
   (bins are what users type — the scope never appears at the CLI). Each depends on
   `@v1nvn/agentic-core`. The hand-rolled `format.test.mjs` suites become vitest tests in
   the workspace run.
4. **`--hook` mode.** Same contract the sh wrappers held: run the query, print the block
   JSON with the output as `reason`, exit 0.
5. **Plugins shrink.** Delete `plugins/{zai,tokens,rm,md}/bin/` and `hooks/*.sh`; rewrite
   `hooks.json` commands to the pinned-npx form; keep `plugin.json`, `commands/`, READMEs.
6. **Version train extends.** `set-version.mjs` gains the four tool-package mirrors **and**
   a pin-rewrite pass over the six plugin config files (`hooks.json` ×4, `.mcp.json` ×2) —
   every `@v1nvn/<pkg>@x.y.z` pin moves with the train.
7. **release.yml + rename.** Publish loop becomes `yarn workspaces foreach` over all seven
   packages, same per-package already-on-npm skip. All seven scoped names are new on npm —
   trusted-publisher entries for each on npmjs.com (owner). Package `name` fields in
   `readability-mcp` / `omlx-mcp` flip to the scope; smithery.yaml, Dockerfile, Makefile,
   READMEs re-pointed. The old unscoped names freeze at 0.13.0 — no deprecation pointers
   (owner: no backwards compatibility).
8. **build.yml / test.yml.** Drop the shared-scripts `cmp` check and `shared/`; single root
   install; workspace tests subsume the format tests.
9. **READMEs + CLAUDE.md** move with the surface: root gains the in-shell `npx` story
   (`npx zai-usage`, `npx tokens-report`, `npx rm-send`, `npx md-send`), plugin READMEs in
   the same step. CLAUDE.md's Layout section still describes the pre-monorepo shape
   ("flattened", "four independent plugins") — rewrite it for workspaces + thin plugin
   wrappers, and re-check the Invariants section still holds.

**What dies.** `shared/` + the cmp sync check · `plugins/*/bin/` · every shell script in the
repo (`hooks/*.sh` ×4, bash `last-reply`) · the jq dependency · two per-package lockfiles ·
the orphaned-test state. The shipped surface becomes pure node+TS; the only shell left is
CI workflow steps and readability-mcp's Makefile/Dockerfile — dev tooling, never shipped.

**Accepted costs.** First hook run after each bump downloads (~seconds, once). Warm npx adds
~0.3–0.5 s vs a direct `node` call — accepted for mechanism consistency. A brand-new install
running its first hook offline fails (marketplace install needs network anyway).

**Current state.** Steps 1–9 executed on branch `monorepo-npx` (one commit per step);
every step verified locally — install, root typecheck/lint/build, all workspace tests,
byte-identical zai render against the old mjs, and all four built bins exercised
end-to-end (zai against the live API; md/rm/tokens hook modes against a fixture
transcript). Remaining on the branch: the `v0.14.0` train bump.

**Owner-side after merge.** Trusted-publisher entries on npmjs.com for the seven
`@v1nvn/*` names (new on npm); the old unscoped `readability-mcp` / `omlx-mcp` freeze
at 0.13.0 with no deprecation pointers; Smithery needs re-registering for the
monorepo layout if that deployment is still wanted (its yaml has no package-name
references; only the build layout changed).

**Next step.** Review + merge PR #1; add the seven npm trusted-publisher entries first
(release.yml fails until they exist).

**Log.**
- 2026-09-01 — scoped in conversation after the version-train fix; constraints negotiated:
  owner rejected npx-at-hook-time concerns (accepted with the pinned-version refinement),
  accepted first-run download cost for mechanism consistency. Plan written.
- 2026-09-01 — decisions closed with the owner: pin everything incl. `.mcp.json`; npm
  identity `@v1nvn/*` everywhere, accepting the two-package rename. Rejected: unscoped
  descriptive (no family), `agentic-*` prefix (runner-up), mixed scope (permanent
  inconsistency), `@agentic` org (taken). npm facts verified live: bare `rm`/`zai`/`tokens`/
  `md` all taken; user scope is the owner's account; a scope adds no user visibility beyond
  the profile page that already aggregates every publish.
- 2026-09-01 — owner: no backwards compatibility — deprecation pointers and move notes
  dropped; old unscoped names just freeze at 0.13.0. Lockstep re-affirmed against
  per-package versions (see Decisions).
- 2026-09-01 — plan finalized with the owner: lockstep agreed after discussion; shared
  package named `core/` → `@v1nvn/agentic-core`; all five new packages confirmed TypeScript
  (mirroring the MCP packages — vite build, vitest). Shell sweep verified: the four
  `hooks/*.sh` + bash `last-reply` are the repo's only shell scripts, all replaced.
- 2026-09-01 — owner, on execution: all node packages move under a top-level `packages/`
  (yarn's documented `workspaces: ["packages/*"]` shape; `plugins/` keeps the six manifest
  wrappers — code vs. manifest split at the root). Same session learned the toolchain rule
  from the yarn workspaces doc: a script's binaries resolve only for workspaces that
  *declare* them, so each package declares the tools its scripts invoke (vite, vitest,
  vite-node); the root keeps the root-run tools (eslint stack, prettier, typescript,
  @types/node).
- 2026-09-01 — owner pointed the train at yarn's release-workflow doc before step 6;
  read it plus the version plugin's CLI surface (`version apply --all`, `version check`).
  It solves per-package independent versioning (deferred bump records, per-PR CI gate,
  strategy-derived versions); the train needs one exact number written into 13 version
  fields + 6 npx pins that no yarn pass touches. Lockstep re-affirmed — set-version.mjs
  stays the single mechanism; nothing borrowed (staged publishing N/A under trusted
  publishing, workspace:^ ranges need no auto-update, `version check` ceremony changes
  no outcome when every change rides the train anyway).
- 2026-09-01 — steps 1–9 executed on `monorepo-npx`. Verification highlights: zai TS
  render byte-identical to the old mjs across 5 cases; built bins exercised live
  (zai hit the real monitor API; md/tokens/rm hook modes against a fixture transcript,
  including the `send failed:` failure contract). One mid-flight repair: the `packages/`
  move initially missed `set-version.mjs`'s mirror paths (caught by its own `--check`).
