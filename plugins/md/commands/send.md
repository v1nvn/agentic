---
description: Send the last reply to the Markdown-Viewer (zero-token via UserPromptExpansion hook)
---

Send the previous assistant reply to the self-hosted Markdown-Viewer (`md.v1n.space`), then
report the result.

Run this exactly:

    npx -y @v1nvn/md

Report the single status line it prints (e.g. "Opened in Markdown-Viewer (link copied).") —
the page is opened in the browser and the link is copied to the clipboard. (A
`UserPromptExpansion` hook normally intercepts `/md:send` and runs this with **no model
tokens**; this body is the fallback for when hooks are disabled.)
