# Timestamps — promote the mod into the marketplace

## Goal

The timestamps mod — a dim `󰅐 HH:MM:SS` line above every message and tool row —
lives as a plugin package home `packages/timestamps/`, installed from this
marketplace, with the dev-mods copy gone. Closes when a fresh install shows the
stamps and the repo names the plugin in its count.

## Current state

Working mod at `~/.claude/dev-mods/9ef0514c-67c9-4b82-9267-49b2e6c0f497/timestamps/`
(session-scoped dev seat, hot-reloaded): manifest, `hooks/register.tsx`, one test
file — `claude plugin validate` and 3/3 `claude plugin test` pass, tsc clean.
Nothing is in this repo yet.

## Next step

Unit 1.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| 1 | Move the mod to `packages/timestamps/` and wire the repo | sonnet/low | | | `claude plugin validate` and `claude plugin test` pass from the package home; `stamp.manifest.json` and `tsconfig.mods.json` cover it; README and AGENTS name the plugin in the count |
| 2 | Live-verify from a fresh install and retire the dev seat | | none | | A fresh session with the marketplace installed shows the stamp above user, assistant and tool rows; the dev-mods folder is deleted; one commit |

## Plan

- Unit 1 reading: the dev-mods source (`hooks/register.tsx`, `hooks/register.test.ts`,
  `.claude-plugin/plugin.json`); AGENTS.md Layout; `stamp.manifest.json`;
  `tsconfig.mods.json`; `packages/todo/` — the other no-npm package home — for the
  manifest-and-hooks shape this plugin takes.
- Unit 2 review is `none`: the unit's evidence is its own live verification on the
  surface; there is no code diff to review beyond unit 1's.
- Unit 2 verifies on the live transcript the owner already judges the look from;
  the glyph is `\u{F017}` and stays unless the owner rules otherwise.

## Design

One `ui.render` hook per row component (UserMessage, AssistantMessage, ToolUse)
returns a column: dim `󰅐 time` line, then the engine's own drawing under
`marginTop={-1}` inside a `marginTop={1}` wrapper — blank line above, tight below.
Stamps cache by `requestId` at first draw, so redraws (scroll, resize, streaming)
reuse the first time; no `$.state` — a reload re-stamps on-screen rows, accepted
for the simplicity. No pre-seed events: first-draw time is within a second of the
row's stored time.
