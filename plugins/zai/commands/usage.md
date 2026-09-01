---
description: Query GLM Coding Plan usage (zero-token via UserPromptExpansion hook)
---

Query quota and usage statistics for the current GLM Coding Plan account.

Run this exactly:

    npx -y @v1nvn/zai

Report the output it prints. (A `UserPromptExpansion` hook normally intercepts `/zai:usage` and runs this with **no model tokens**; this body is the fallback for when hooks are disabled.)
