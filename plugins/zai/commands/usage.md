---
description: Query GLM Coding Plan quota and usage
---

Query quota and usage statistics for the current GLM Coding Plan account.

Run this exactly:

    npx -y @v1nvn/zai@0.28.0

Report the output it prints. (A `UserPromptExpansion` hook normally intercepts `/zai:usage` and runs this with **no model tokens**; this body is the fallback for when hooks are disabled.)
