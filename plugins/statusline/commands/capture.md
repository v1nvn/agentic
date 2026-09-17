---
description: File a payload or agent-panel tick from the session into the data dir
---

Capture real session data: JSON piped through `capture` is normalized — keys
sorted, two-space indent — and filed under
`~/.claude/plugins/data/statusline-agentic/`. A main payload lands at
`payloads/latest.json`; a subagent tick (`{"columns", "tasks"}`) at
`ticks/latest.json`. Values stay verbatim, and capturing the same input twice
writes identical bytes.

Put the JSON the session can see — a payload the owner pasted, or any stdin
they provide — in `$JSON`, then run this exactly:

    JSON='…' ; printf '%s' "$JSON" | npx -y @v1nvn/statusline-lab capture

Report the output it prints.

Both shapes land in the data dir; the latest capture feeds the picker preview.
Invalid input prints one error line and writes nothing.
