# Mods — tokens e2e first

## Goal

Every plugin that gains a mod ships it end to end: source island in its
package home, engine tests, released on the train, and verified live from an
installed copy. Tokens first.

## Current state

Units 1, 4, 5 and 6 are landed and unit 2 is done: PR #11 merged (rebase,
linear) and v0.32.0 released — run 37101380103 green, `0c69f38` on main.
The tokens mod is in the tree, rooted at its package home (G1b), text
formatting at one home (the island, imported by zai and rm through
`@v1nvn/tokens/text`), the degenerate asserts re-homed. Inside a mod home
`*.test.ts` belongs to the engine runner, so the vitest suite is
`test/*.spec.ts`. Unit 3 (live verify from an install) is next; the port of
the other eight plugins is parked in TODO.md on unit 3. The consult page
holding the unruled adoptions (G2 zai line, G3 todo pane/band, G4 `/lab`
pane, G5 rm/md) is at /tmp/agentic-mods-rulings/index.html.

## Next step

Run unit 3: live verify from a marketplace install in a fresh session
(`/tokens` opens and draws the pane, nothing draws or execs until then,
`/tokens:usage` gone).

## Steps

| id  | unit                                  | model | review    | close criteria                                                                                                                                                                                                                 |
| --- | ------------------------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Re-land the tokens mod from the shelf |       | checklist | `git checkout wip/tokens-mod-full -- <mod paths>`; gates green (typecheck both tsconfigs, lint, 15 vitest, `claude plugin validate`, `claude plugin test` 2/2); READMEs + CLAUDE.md mod bits and `references/mods.md` restored — landed `12bc584` on `feat/tokens-mod`, all six gates green |
| 4   | Re-root tokens to the package home (G1b) |       |  | `plugin/` gone from `packages/tokens`: manifest at `packages/tokens/.claude-plugin/`, module at `hooks/register.tsx`, island in `src/`, engine tests at `tests/`, contract types at `types/`; marketplace `source: "./packages/tokens"`; six gates green re-pointed (`set-version --check`, typecheck, lint, `yarn test`, `claude plugin validate packages/tokens`, `test:mods` → `packages/tokens` 2/2); CLAUDE.md layout law and READMEs name the shape — landed `f2df47a` on `feat/tokens-mod`, all six gates green; review round added the engine-laid `types/` gitignore line and dropped the false core-re-export clause |
| 2   | Release the train                     | owner |           | version bumped; release workflow green; npm packages published — v0.32.0 (run 37101380103 green, `0c69f38` on main, GitHub release v0.32.0)
| 3   | Live verify from an install           |       | checklist | marketplace install of `tokens@agentic` loads the mod in a fresh session: `/tokens` opens and draws the pane, nothing draws and nothing execs until then, `/tokens:usage` is gone                                              |
| 5   | Wire the text copy to the island      |       |  | `packages/core/src/text-format.ts` deleted; the island's `packages/tokens/src/text.ts` is the one home, imported through the workspace dep by the consumer (zai directly, or core re-exporting — whichever the importer graph says); repo grep finds no importer of the old path; six gates green (zai's 37 vitest included) — landed `1b6c2c2`, blind review clean |
| 6   | Re-home the degenerate asserts        | sonnet |  | `packages/tokens/test/text.spec.ts` exists, importing `../src/text.js`, carrying every degenerate assert from the deleted core test (missing → '—', blank bars, `▏` sliver, round-up, overlong pads, meter clamps; the `it`-block shape is the builder's); tokens vitest green in 3 files; no other suite touched — landed `70d30ba`, review clean (byte-level assert fidelity) |

## Plan

- Unit 4 seams, derived from G1b: moves — `plugin/.claude-plugin/` →
  `.claude-plugin/`, `plugin/hooks/{hooks.json,register.tsx}` → `hooks/`,
  `plugin/hooks/{aggregate,format,text}.ts` → `src/`, `plugin/tests/` →
  `tests/`, `plugin/types/` → `types/`; re-point — `register.tsx`'s island
  imports (`../src/*.js`), `tsconfig.mods.json` includes (`packages/*/hooks`,
  `packages/*/tests`, `packages/*/types` — never `packages/*/src`, island
  files enter the mods program via the import graph), root `package.json`
  `test:mods`, `marketplace.json` `source`, `.gitignore`'s engine-laid
  `packages/*/plugin/tsconfig.json`, eslint's plugin-source block glob, and
  the engine-laid typings dir now at `packages/tokens/.claude-plugin/types/`;
  prose — CLAUDE.md layout law (the root is the package home; the other
  eight plugins port later), root and tokens READMEs. The vitest `test/`
  stays `test/`.
- Unit 4 pick (forced, vetoable): inside a mod home `*.test.ts` belongs to
  the engine runner — it collects every `*.test.ts` under the plugin root
  (verified live: `2 pass 2 fail` with the vitest files in scope) — so the
  vitest suite renamed to `test/*.spec.ts`, vitest's other built-in name,
  zero config. Recorded in `references/mods.md` as the shape the port
  follows.
- Unit 5 picks: rm consumed the barrel too (the review's "only zai" was
  wrong) — both consumers import `@v1nvn/tokens/text` direct; a core
  re-export was rejected (tokens' CLI deps on core — a cycle); tokens gained
  the `./text` exports entry, a second vite entry and `files: ["dist",
  "src"]`; the lock took the two workspace-dep entries (CI runs
  `yarn install --immutable`). The deleted core test's degenerate-value
  asserts re-home at the island as `test/text.spec.ts` (owner, G1a —
  `/tmp/agentic-tokens-edges-rulings`; unit 6). The page's "~27" counted
  asserts — vitest counts `it` blocks, so the suite lands near 20.
- The shelf is one commit: take paths from it wholesale; the only hand-merge
  expected is README/CLAUDE.md (the restructure rewrote their layout sections).
- Unit 1 path list, derived once from `git diff main wip/tokens-mod-full`:
  wholesale — `packages/tokens/`, `references/mods.md`, `tsconfig.mods.json`,
  `types/claude-code.d.ts`, `eslint.config.js`, `.gitignore`, `package.json`
  (typecheck gains the mods project); `git rm
  packages/tokens/plugin/commands/usage.md src/format.ts` (the shelf deletes
  both — usage.md retired, format.ts moved into the island — a checkout
  cannot); hand-merge only root `README.md` + `CLAUDE.md` mod prose. The
  14,916-line vendored `types/claude-code.d.ts` is shelf bytes — the unit lands
  whole, no line-ceiling split.
- Unit 1 picks over shelf bytes: `packages/tokens/package.json` stays 0.31.0
  (the shelf's only delta is its pre-v0.31.0 version); `yarn.lock` not taken
  (gates green without it); `packages/tokens/README.md` corrects the shelf's
  Modules table to the real island paths (its `src/aggregate.ts`,
  `src/module.tsx`, `vite.config.module.ts` exist nowhere) and re-pins its two
  `@0.30.9` lines to the 0.31.0 train. Review round: plugin.json version
  0.31.0 and its description names `/tokens` (the shelf rode both backward);
  the dead `commands/usage.md` line leaves `set-version.mjs`'s MD_SURFACES;
  the island headers' stale names (`module.tsx`, the retired hook-block
  `reason` surface) point at the real files; `references/mods.md`'s
  bodyColumns line gains the fixed-width exception (or is corrected to the
  engine's real prop, per the vendored types).
- Gate lines (baseline at launch: all green, `test:mods` at "no hooks module"):
  `node .github/scripts/set-version.mjs --check` · `yarn typecheck` ·
  `yarn lint` · `yarn test` (tokens vitest 15) ·
  `claude plugin validate packages/tokens/plugin` · `yarn test:mods` (2/2).
- Re-vendor `types/claude-code.d.ts` after any Claude Code update, from
  `packages/tokens/.claude-plugin/types/claude-code/index.d.ts` after
  one load; the API is early access and moves between releases. A
  `--plugin-dir` load also dumps a `types/` dir there that no `.gitignore`
  line covers yet — covered when the port lands or the next vendor runs.
- G2–G5 are unruled: each becomes its own unit only on the owner's ruling,
  never folded here silently.
- Stop rule: if the marketplace-installed copy refuses to load the module,
  the engine's reason is in `claude --debug` — land nothing past unit 3 until
  it loads clean.

## Design

- G1b (owner, `/tmp/agentic-tokens-structure-rulings`): the plugin root is the
  package home — the island lives in `src/`, the module at
  `hooks/register.tsx`, `plugin/` disappears. Rejected: the `plugin/`
  subfolder root (Anthropic's shape, what unit 1 landed) and symlink bridges
  (no duplication). All other plugins port to this shape after unit 3
  verifies (parked in TODO.md).
- Island rule: a hooks module imports only plugin-relative files plus bare
  `claude-code`; shared pure code lives in the island and the packages import
  from it. Ruled (owner, a): one home at the island for the fixed-width
  formatting — the consumer imports `packages/tokens/src/text.ts` and
  `packages/core/src/text-format.ts` is deleted in the same change (unit 5).
  The island cannot import `core` (the docs allow only plugin-relative files
  and bare `claude-code`), so the island is the only possible single home.
- `claude-code` is not an npm dep — the npm name is an unrelated package; the
  dep is the vendored engine declaration file plus `tsconfig.mods.json`.
- Mod surfaces stay zero-token: the pane is engine-drawn and never
  model-read; `command.run` answers `{}` (its `text` would be
  model-read); the `UserPromptExpansion` door retires with the mod — `/tokens`
  replaces `/tokens:usage` (`usage` collides with a built-in command).
- The mod draws the pane only (owner, 2026-10-04): no status line — the
  `$.ui.status` call, its startup exec and its numbers are gone; the clock
  execs only while the pane is open (`$.ui.panes()` guards it).
