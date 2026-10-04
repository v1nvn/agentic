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

Nothing ported yet. tokens is the template (archive/mods.md, unit 4's seam
list). This sitting verified the eight current shapes and the named repo-side
seams (below); the live probe (validate on a re-rooted proxy) is still owed.

## Next step

Run unit 1 (hardening): write the per-unit rows, reading lists, enforcement
inventory and gate lines into this file, run the live probe, and commit.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| 1 | Harden the plan | | | this file carries one row per port group plus the shared-law unit, each with testable close criteria and a per-unit reading list; the enforcement inventory (`plugin/` dir count zero, no `plugin/` path left in config or md surfaces, protected gate list), gate lines, PR grouping and stop rules are written; the live probe is run and its verdict recorded (`claude plugin validate` on a re-rooted /tmp proxy of a manifest-only plugin and of one with npm code) — committed docs-only |

## Plan

Seam facts verified this sitting (first-hand; hardening builds on, not
re-derives, them):

- Shapes — `readability`: `plugin/{.claude-plugin, .mcp.json, skills}`;
  `omlx`, `enhansome`: `plugin/{.claude-plugin, .mcp.json}`; `rm`, `md`,
  `zai`: `plugin/{.claude-plugin, commands, hooks}`; `statusline`:
  `plugin/{.claude-plugin, SKILL.md, render.mjs}`; `todo`:
  `plugin/{.claude-plugin, README.md, skills}`. `enhansome` and `todo` homes
  hold only `plugin/`.
- Named re-points: `marketplace.json` source lines (8); `set-version.mjs`
  globs `packages/*/plugin/{.claude-plugin/plugin.json, .mcp.json,
  hooks/hooks.json}` and MD_SURFACES paths (`packages/statusline/plugin/SKILL.md`,
  `packages/{rm,md,zai}/plugin/commands/*.md`); root `package.json` build
  `cp` line for `packages/statusline/plugin/render.mjs`; AGENTS.md layout-law
  clauses naming the `plugin/` subfolder; root and per-plugin READMEs;
  `.github/workflows` and `packages/readability/smithery.yaml` (grep-confirmed
  owed).
- Already generic (no edit unless the port proves otherwise):
  `tsconfig.mods.json` includes (`packages/*/{hooks,tests,types}`);
  `.gitignore` and eslint ignores on `.claude-plugin/types`.
- Non-seams, verified: `rm`/`md`/`zai` hooks are pure `hooks.json` command
  hooks (npx, zero TS) — no mod promotion, `test:mods` stays tokens-only; the
  engine's `*.test.ts` sweep cannot bite a plugin without a hooks module, and
  no port unit gates on `claude plugin test` outside tokens.
- One install-side path hardening must check: statusline's cache path gains a
  directory level change (`.../<ver>/render.mjs` vs `.../<ver>/plugin/render.mjs`)
  — how the `/lab` configure flow and the owner's settings line carry it.

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
