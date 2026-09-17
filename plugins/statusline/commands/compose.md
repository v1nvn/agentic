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

Then offer the conversational pick. Every component ships several designs,
declared in the header of each file under the installed runtime, e.g.
`model: plain | block | pill | zen`. Render one design at a time in chat:

    RUNTIME=$(jq -r '.plugins["statusline@agentic"][0].installPath // empty' ~/.claude/plugins/installed_plugins.json)
    [ -n "$RUNTIME" ] || RUNTIME=$(ls -1d ~/.claude/plugins/cache/agentic/statusline/*/ 2>/dev/null | sort -V | tail -1)
    printf '%s' "$PAYLOAD" | bash "${RUNTIME%/}/bin/statusline.sh" --seg model=pill

Keep one representative payload fixed across renders so alternatives compare
like for like, then write the answers to
`~/.claude/plugins/data/statusline-agentic/picks` as `comp=alt` lines — the
next paint honors them.
