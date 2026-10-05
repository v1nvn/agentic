# Mods port — rm, md, zai as mod commands, tokens first

## Goal

rm, md and zai ship as mods: each home carries a hooks module that registers
its commands — `/rm-send`, `/md-view`, `/md-edit`, `/zai-usage` — whose
`command.run` execs the home's shipped CLI and answers `{}` (zero-token); the
UserPromptExpansion machinery the old door needed — three hook matchers, three
`commands/` fallback bodies, core's hook emit path — is deleted; `/tokens-usage`
proves the hyphenated name end to end before any port builds; the naming law
is AGENTS.md law.

## Current state

Ruled, nothing built. This thread repurposes the render-engines thread (its
question rides the open questions below) and supersedes the parked G2–G5
consult: G5 is this thread, G2's line is out of scope, G3 and G4 are the open
questions below.

The frame it rests on: a plugin has three doors — model-facing (MCP, skills),
human-facing UI (mods, zero-token), settings-key processes — and the engine's
mod surfaces draw neither the classic status line nor the agent panel
(`RenderComponent`, `types/claude-code.d.ts`), so the statusline renderer
stays a process under every option.

Decided (owner, the consult this thread came from):

- Port the three command-hook plugins. The UserPromptExpansion door is a
  workaround — two surfaces per job, output smuggled through a hook block's
  reason, npx resolution per call — that the tokens command already replaces
  (archive/mods.md: "the UserPromptExpansion door retires with the mod").
- Naming law: a mod command's name is `<plugin>-<action>`, hyphenated. The
  registered name is the whole invocation (`/<name>`), hyphens are legal
  (`CommandSpec.name`), and a bare-word built-in can never collide.
- Tokens first: rename `/tokens` → `/tokens-usage` as the cheap e2e proof of
  the name shape (register, typeahead, run) before any port builds.

## Next step

Unit 4: port rm. Units 4–7 run as one sitting, strictly serial.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| 1 | Rename the tokens command | | | `packages/tokens/hooks/register.tsx` registers `tokens-usage` and its `command.run` matcher follows; engine tests and all gates green; tokens README names `/tokens-usage`; AGENTS.md carries the naming law — landed `55f7bb4` (also corrected the manifest's dead "a status line" claim), all gates green |
| 2 | Release the train | owner | | version bumped, release workflow green, `@v1nvn/tokens` published with the rename — v0.35.1, run 37268136788 green, confirmed on npm |
| 3 | Live verify the name e2e | owner | checklist | fresh marketplace install in a fresh session: `/tokens-usage` typeaheads, runs, opens the pane; `/tokens` is gone — verified live on v0.35.1 (plugin update + reload, fresh session) |
| 4 | Port rm | | | hooks module registers `rm-send`; `command.run` execs the home's `bin/` build and reports through a ui surface, answering `{}`; `commands/` gone; the CLI's `--hook` option gone; `bin/` a committed inlined build synced by `yarn build`; engine tests at `tests/`; `test:mods` runs rm; README carries the one `Bash(...)` allow rule; `set-version` MD_SURFACES drops the dead `commands/*.md`, `--check` green; gates green |
| 5 | Port md | | | as unit 4, two commands: `md-view`, `md-edit` |
| 6 | Port zai | | | as unit 4, one command: `zai-usage` |
| 7 | Delete the machinery, close the law | | | core's hook emit path (`hook.ts`, `emitHookBlock`, `readHookEvent`, `hookOrPrint`'s hook branch) deleted; `git grep UserPromptExpansion` outside `archive/` hits zero; AGENTS.md's layout law states the mod-command shape where the `commands/` shell clause stood; the synced-artifact law names every mod home's `bin/`; gates green |

## Plan

- Reading lists:
  - Unit 1: `references/mods.md`; `packages/tokens/hooks/register.tsx`;
    tokens README.
  - Units 4–6: `references/mods.md`; `packages/tokens/hooks/register.tsx`
    (the template); the home's `hooks/hooks.json`, `commands/*.md`,
    `src/index.ts` (the CLI the island execs); `packages/core/src/cli.ts`
    (the path that dies).
  - Unit 7: AGENTS.md layout + prompt-surfaces sections;
    `packages/core/src/{hook,cli}.ts`.
- Enforcement inventory:
  - Gates per unit: `set-version --check` · `yarn typecheck` · `yarn lint` ·
    `yarn test` · `yarn build` · `claude plugin validate <touched home>` ·
    `yarn test:mods` (grows tokens → +rm → +md → +zai).
  - Island rule: a module imports only plugin-relative files and bare
    `claude-code`.
  - Every registered name matches `<plugin>-<action>` (the naming law).
  - `git grep -n UserPromptExpansion -- . ':(exclude)archive'` → 0 at close.
- One PR per run segment, one commit per unit: units 1–3 rode #13 through the
  owner's release gate; units 4–7 ride `feat/mods-port` off v0.35.1 main, one
  PR opened at the end. The clerk runs the inventory's two greps and
  `set-version --check` verbatim after every commit — each is a one-liner, no
  gate script minted.
- Stop rules: the engine refuses a hyphenated name (legal per
  `CommandSpec.name`; stop if it refuses anyway); a port needs an npm import
  in the module; a port cannot keep `command.run` answering `{}`; a port
  wants a second door beyond the command.
- Open questions for the owner (none blocks a unit):
  - The lab pane: `/statusline-lab` as a mod command + pane replacing the
    skill — a model-turn-per-use goes zero-token. Recommended in the consult,
    unruled.
  - todo board pane/band — held on its cost: the island would be a second
    parser of shapes `todo:rules` defines in prose. Unruled.
  - render-engines, carried from this file's predecessor: one engine / two
    permanent / drop the panel (`subagentStatusLine`). Crux: two `vlen`
    implementations — the line's counts ⚡ two cells (`engine.ts`), the
    panel's counts codepoints (`panel.ts`) — that no test can tell apart (no
    panel golden contains ⚡; `multi-emoji` pins codepoints), and `panel.ts`'s
    "never unify" comment claims a ruling none recorded. Orthogonal to every
    unit here: the renderer stays a process.

## Design

- Three doors, one port: mods are the human-facing door only. readability,
  omlx, enhansome are model-facing (MCP) — not candidates, by structure.
- The workaround dies, not the CLIs: every CLI keeps its print mode (that is
  what the island execs); what dies is the `--hook` emit path, the matchers,
  the fallback bodies. The exec door is `node ${$.plugin.root}/bin/<cli>.mjs`
  — the tokens pattern — riding the permission path, one `Bash(...)` allow
  rule per plugin. The command reports the CLI's stdout verbatim through
  `$.ui.log` — a dim transcript line, never model-read — the nearest surface
  to the hook block it replaces; md's two commands differ by the `--view`
  flag the CLI already carries.
- Naming (owner): hyphenated full names beat both one-worders (`/zai` — the
  leaf loses scope) and argument forms (`/md edit`) — one rule, zero names
  relearned (`:` → `-`), collisions structurally impossible.
- Tokens first (owner): the cheap proxy that proves the name shape e2e before
  the real pass.
- The zai quota line stays out — the always-on clock exec cut from tokens
  (owner, 2026-10-04, archive/mods.md) is the standing precedent.
- The statusline renderer stays a process — no mod surface draws the classic
  status line or the agent panel; the render-engines question is an open
  call, not a port.
