# GLM Plan Usage Plugin

Query quota and usage statistics for the GLM Coding Plan — **zero model tokens**.

## How to use

In Claude Code, run:

```
/zai:usage
```

A `UserPromptExpansion` hook intercepts the command, runs `bin/usage.mjs`
directly, and returns the output as the block `reason` — so the model is never
invoked. No agent, no skill, no tokens.

## Requirements

- Node.js
- Environment variables (inherited from the Claude Code process):
  - `ANTHROPIC_AUTH_TOKEN`
  - `ANTHROPIC_BASE_URL` — `https://api.z.ai/api/anthropic` or `https://open.bigmodel.cn/api/anthropic`

## How it works

```
/zai:usage
  └─ UserPromptExpansion hook (hooks/usage.sh)
       └─ node bin/usage.mjs
            └─ fetches model/tool/quota data and renders a plain-text report
       └─ returns {"decision":"block","reason": <report>}  ← model never runs
```

`bin/usage.mjs` fetches the three monitor endpoints and hands the parsed
data to `bin/format.mjs`, which renders the report (stat tiles, hourly bar
chart, model mix, quota meters). Output is plain text — no markdown — so it
survives the hook's `jq -Rs` block-reason encoding intact.

**Timezone:** the API labels every bucket in Beijing time (UTC+8). The
formatter shifts each timestamp to your local zone for display
(`-new Date().getTimezoneOffset()`). This is unit-tested with fixed offsets in
`bin/format.test.mjs`:

```
node bin/format.test.mjs
```

`commands/usage.md` exists only as a fallback for when hooks are disabled.
