---
description: Put the statusline component library on the live line and the agent panel
---

Adopt the library: `apply` writes the trampoline at
`~/.claude/statusline-command.sh` and adds the `statusLine` +
`subagentStatusLine` keys to `~/.claude/settings.json`. Both lines go live on
the next paint with the current picks. Idempotent and cancel-safe: a foreign
script or key is refused, never overwritten, unless `apply --force`.

Run this exactly:

    npx -y @v1nvn/statusline-lab apply

Report the output it prints.

Then invite the wizard. Every component ships several designs; the owner
chooses them in a live-preview terminal wizard. The Bash tool cannot host a
TUI, so the owner runs it directly:

    ! npx -y @v1nvn/statusline-lab pick

The wizard previews every design of the focused component rendered by the
shipped runtime, on the latest capture (or a shipped fixture, or
`--payload <file>`), at 80/120/200 columns. Finishing writes the answers to
`~/.claude/plugins/data/statusline-agentic/picks` as `comp=alt` lines — the
next paint honors them — and offers `apply` when no trampoline is installed.
Cancelling writes nothing.
