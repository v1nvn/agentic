# @v1nvn/zai

The CLI behind the zai plugin: it reports GLM Coding Plan quota and usage for
the current account, straight to the terminal — no model tokens, no browser.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — `/zai:usage` runs this CLI through
a `UserPromptExpansion` hook with zero model tokens:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install zai@agentic
```

In a terminal, bare:

```sh
npx -y @v1nvn/zai@0.27.0
```

## Usage

| Invocation | Does |
|---|---|
| `npx -y @v1nvn/zai@0.27.0` | usage report — models, quota window, remaining balance |
| `npx -y @v1nvn/zai@0.27.0 --auth-token TOKEN` | same, key on the command line (visible in `ps`) |
| `npx -y @v1nvn/zai@0.27.0 --auth-token=TOKEN` | `=` form — zsh quoting-safe |
| `npx -y @v1nvn/zai@0.27.0 --base-url URL` | another GLM endpoint (default `api.z.ai`) |

Each setting takes the first source that provides it:

| Setting | Flag | zai env | Claude Code env | Default |
|---|---|---|---|---|
| API key | `--auth-token` | `ZAI_AUTH_TOKEN` | `ANTHROPIC_AUTH_TOKEN` ¹ | — required |
| Base URL | `--base-url` | `ZAI_BASE_URL` | `ANTHROPIC_BASE_URL` ¹ | `https://api.z.ai` |

¹ Inherited only when the resolved base URL names a GLM host (`api.z.ai`,
`open.bigmodel.cn`, `dev.bigmodel.cn`) — that is what proves the token belongs
to a GLM Coding Plan. Claude Code routed elsewhere (plain Anthropic, another
proxy) is not a zai configuration; set `ZAI_AUTH_TOKEN`. Bigmodel accounts
point the base URL at their host; the monitor paths are identical
(`ZAI_BASE_URL=https://open.bigmodel.cn`). The hook reads the same env from
the Claude Code process; flags are a CLI affordance — `hooks.json` is static.

The API labels every bucket in Beijing time (UTC+8); the report shifts each
timestamp to your local zone for display.

## Develop

```sh
yarn workspace @v1nvn/zai build
yarn workspace @v1nvn/zai test
yarn lint && yarn typecheck       # from the repo root
```

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`zai-usage`) — dispatch, exit codes |
| `src/usage.ts` | the GLM API call and the report it builds |
| `src/resolve.ts` | auth-token resolution chain |
| `src/format.ts` | the printed table |

## Contracts

- One job: print the report, exit 0. Nothing is written anywhere.
- The hook path and the terminal path run the same bin — the hook only
  feeds it the session's transcript context.
