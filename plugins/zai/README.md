# GLM Plan Usage Plugin

Query quota and usage statistics for the GLM Coding Plan — **zero model tokens**.

## How to use

In Claude Code, run:

```
/zai:usage
```

A `UserPromptExpansion` hook intercepts the command, runs the `zai-usage` CLI
from npm (`@v1nvn/zai`, version-pinned in `hooks/hooks.json`), and returns the
output as the block `reason` — so the model is never invoked. No agent, no
skill, no tokens.

In a plain shell the same CLI runs directly:

```
npx -y @v1nvn/zai
```

## Requirements

- Node.js (the hook runs `npx`)
- Environment variables (inherited from the Claude Code process):
  - `ANTHROPIC_AUTH_TOKEN`
  - `ANTHROPIC_BASE_URL` — `https://api.z.ai/api/anthropic` or `https://open.bigmodel.cn/api/anthropic`

## How it works

```
/zai:usage
  └─ UserPromptExpansion hook (hooks/hooks.json)
       └─ npx -y @v1nvn/zai@<version> --hook
            └─ fetches model/tool/quota data and renders a plain-text report
       └─ returns {"decision":"block","reason": <report>}  ← model never runs
```

`zai-usage` (source: `packages/zai`) fetches the three monitor endpoints and
renders the report (stat tiles, hourly bar chart, model mix, quota meters).
Output is plain text — no markdown — so it survives the block-reason JSON
encoding intact.

**Timezone:** the API labels every bucket in Beijing time (UTC+8). The
formatter shifts each timestamp to your local zone for display
(`-new Date().getTimezoneOffset()`). This is unit-tested with fixed offsets in
`packages/zai/test/format.test.ts`:

```
yarn workspace @v1nvn/zai test
```

`commands/usage.md` exists only as a fallback for when hooks are disabled.
