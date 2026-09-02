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
- An API key — see Configuration

## Configuration

One variable is enough; the base URL defaults to `https://api.z.ai`. Each
setting takes the first source that provides it:

| Setting | Flag | zai env | Claude Code env | Default |
|---|---|---|---|---|
| API key | `--auth-token` | `ZAI_AUTH_TOKEN` | `ANTHROPIC_AUTH_TOKEN` ¹ | — required |
| Base URL | `--base-url` | `ZAI_BASE_URL` | `ANTHROPIC_BASE_URL` ¹ | `https://api.z.ai` |

¹ Inherited only when the resolved base URL names a GLM host (`api.z.ai`,
`open.bigmodel.cn`, `dev.bigmodel.cn`) — that is what proves the token belongs
to a GLM Coding Plan. Claude Code routed elsewhere (plain Anthropic, another
proxy) is not a zai configuration; set `ZAI_AUTH_TOKEN`.

Bigmodel accounts point the base URL at their host; the monitor paths are
identical: `ZAI_BASE_URL=https://open.bigmodel.cn`.

```sh
npx -y @v1nvn/zai                       # ZAI_AUTH_TOKEN → api.z.ai
npx -y @v1nvn/zai --auth-token TOKEN    # on the command line (visible in ps)
npx -y @v1nvn/zai --base-url https://open.bigmodel.cn
```

The hook reads the same env from the Claude Code process; flags are a CLI
affordance — `hooks.json` is static.

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
