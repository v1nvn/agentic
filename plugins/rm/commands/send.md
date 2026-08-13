---
description: Beam the last reply to the reMarkable (zero-token via UserPromptExpansion hook)
---

Beam the previous assistant reply to the reMarkable Paper Pro, then report the result.

Run this exactly:

    rm-send

Report the single "Sent:" line it prints. (A `UserPromptExpansion` hook normally intercepts `/rm:send` and runs this with **no model tokens**; this body is the fallback for when hooks are disabled.)
