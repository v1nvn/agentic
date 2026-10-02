# Mods — tokens e2e first

## Goal

Every plugin that gains a mod ships it end to end: source island in its
package home, engine tests, released on the train, and verified live from an
installed copy. Tokens first.

## Current state

The package-home restructure the mod waited on has landed (`e1c36f4`,
released as v0.31.0). The tokens mod is fully built and shelved on the local
branch `wip/tokens-mod-full` (commit `9b3db71`), which predates the
restructure: the `register.tsx` + `aggregate`/`format`/`text` island in
`packages/tokens/plugin/`, the vendored `types/claude-code.d.ts` +
`tsconfig.mods.json` at the repo root, the engine tests in
`packages/tokens/plugin/tests/` (2/2 passing), `references/mods.md`, and the
README/CLAUDE.md mod prose. Nothing of the mod is in the tree. The consult
page holding the unruled adoptions (G2 zai line, G3 todo pane/band, G4 `/lab`
pane, G5 rm/md) is at `/tmp/agentic-mods-rulings/index.html`.

## Next step

Re-land the shelved mod as its own change (unit 1).

## Steps

| id  | unit                                  | model | review    | close criteria                                                                                                                                                                                                                 |
| --- | ------------------------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Re-land the tokens mod from the shelf |       | checklist | `git checkout wip/tokens-mod-full -- <mod paths>`; gates green (typecheck both tsconfigs, lint, 15 vitest, `claude plugin validate`, `claude plugin test` 2/2); READMEs + CLAUDE.md mod bits and `references/mods.md` restored |
| 2   | Release the train                     | owner |           | version bumped; release workflow green; npm packages published                                                                                                                                                                 |
| 3   | Live verify from an install           |       | checklist | marketplace install of `tokens@agentic` loads the mod in a fresh session: status line under the prompt, `/tokens` opens and draws the pane, `/tokens:usage` is gone                                                            |

## Plan

- The shelf is one commit: take paths from it wholesale; the only hand-merge
  expected is README/CLAUDE.md (the restructure rewrote their layout sections).
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
