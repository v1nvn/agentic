---
description: Beam the last reply to the reMarkable as EPUB
---

Beam the previous assistant reply to the reMarkable Paper Pro, then report the result.

Run this exactly:

    npx -y @v1nvn/rm@0.28.0

Report the single "Sent:" line it prints. (A `UserPromptExpansion` hook normally intercepts `/rm:send` and runs this with **no model tokens**; this body is the fallback for when hooks are disabled.)
