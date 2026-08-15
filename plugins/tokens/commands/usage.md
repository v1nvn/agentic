---
description: Token usage + cache hit rate from local transcripts (zero-token via UserPromptExpansion hook)
---

Report per-model token usage and cache hit rate for the last 24 hours, plus daily
totals for the last 7 days, read from local Claude Code session transcripts.

Run this exactly:

    node "${CLAUDE_PLUGIN_ROOT}/bin/report.mjs"

Report the output it prints. (A `UserPromptExpansion` hook normally intercepts `/tokens:usage` and runs this with **no model tokens**; this body is the fallback for when hooks are disabled.)
