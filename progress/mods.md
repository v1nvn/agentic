# Mods — tokens e2e first

## Goal

Every plugin that gains a mod ships it end to end: source island in its
package home, engine tests, released on the train, and verified live from an
installed copy. Tokens first.

## Current state

Unit 1 is landed: the tokens mod is in the tree and every gate is green
(`12bc584` on `feat/tokens-mod`); the picks the landing made over the shelf
bytes are in Plan. Unit 2 (release the train) is the owner's; unit 3 verifies
from an installed copy after it. The consult page holding the unruled
adoptions (G2 zai line, G3 todo pane/band, G4 `/lab` pane, G5 rm/md) is at
`/tmp/agentic-mods-rulings/index.html`.

## Next step

Owner: merge the `feat/tokens-mod` PR and release the train (unit 2); unit 3
runs after the release.

## Steps

| id  | unit                                  | model | review    | close criteria                                                                                                                                                                                                                 |
| --- | ------------------------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Re-land the tokens mod from the shelf |       | checklist | `git checkout wip/tokens-mod-full -- <mod paths>`; gates green (typecheck both tsconfigs, lint, 15 vitest, `claude plugin validate`, `claude plugin test` 2/2); READMEs + CLAUDE.md mod bits and `references/mods.md` restored — landed `12bc584` on `feat/tokens-mod`, all six gates green |
| 2   | Release the train                     | owner |           | version bumped; release workflow green; npm packages published                                                                                                                                                                 |
| 3   | Live verify from an install           |       | checklist | marketplace install of `tokens@agentic` loads the mod in a fresh session: status line under the prompt, `/tokens` opens and draws the pane, `/tokens:usage` is gone                                                            |

## Plan

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
  `packages/tokens/plugin/.claude-plugin/types/claude-code/index.d.ts` after
  one load; the API is early access and moves between releases.
- G2–G5 are unruled: each becomes its own unit only on the owner's ruling,
  never folded here silently.
- Stop rule: if the marketplace-installed copy refuses to load the module,
  the engine's reason is in `claude --debug` — land nothing past unit 3 until
  it loads clean.

## Design

- Island rule: a hooks module imports only plugin-relative files plus bare
  `claude-code`; shared pure code lives in the island and the packages import
  from it (`core` re-exports the island's `text.ts` for zai).
- `claude-code` is not an npm dep — the npm name is an unrelated package; the
  dep is the vendored engine declaration file plus `tsconfig.mods.json`.
- Mod surfaces stay zero-token: the status line and pane are engine-drawn and
  never model-read; `command.run` answers `{}` (its `text` would be
  model-read); the `UserPromptExpansion` door retires with the mod — `/tokens`
  replaces `/tokens:usage` (`usage` collides with a built-in command).
