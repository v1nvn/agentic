# tokens/zai — usage as a CLI subcommand

## Goal

`npx -y @v1nvn/tokens usage` and `npx -y @v1nvn/zai usage` print the reports they print bare today, and the bare invocations print the command list. Every owner-typed surface then has one shape: `<plugin> <action>`, in a session or in a terminal.

## Current state

Landed on main: both CLIs take `usage` (flags ride on it), bare prints the command list, the mods exec `report.mjs usage --json` / `usage.mjs usage --json`.

## Next step

None — closed.

## Plan

- tokens CLI: `usage` subcommand runs today's bare path; bare prints the command list. The mod's internal exec (`bin/report.mjs --json`) is a separate file and does not move.
- zai CLI: the same shape, mirroring `/zai-usage`.
- statusline already has the subcommand shape; rm and md bins are mod-internal execs and stay as they are.
- Docs in the same change: both package READMEs, the root README invocation tables, and the pinned `npx -y @v1nvn/*` lines (version bump rides the release train).
- Clean break, no back-compat flag: zero installs.
- Tests: argv dispatch per CLI — `usage` prints the report, bare prints the list naming `usage`.

## Design

- One implementation per view: the session view reads pushed engine state and exists only as a pane; a terminal twin would be a second, weaker implementation off polled transcripts, overlapping the todo postmortem's data source.
- Keep this thread's commits out of the `/tokens-top` pane change — both edit the same README lines, and two concerns in one diff is how they get muddy.
