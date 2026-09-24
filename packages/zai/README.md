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
npx -y @v1nvn/zai@0.25.0
```

## Usage

| Invocation | Does |
|---|---|
| `npx -y @v1nvn/zai@0.25.0` | usage report — models, quota window, remaining balance |
| `npx -y @v1nvn/zai@0.25.0 --auth-token TOKEN` | same, key on the command line (visible in `ps`) |
| `npx -y @v1nvn/zai@0.25.0 --base-url URL` | another GLM endpoint (default `api.z.ai`) |

Auth resolves in order: `--auth-token` → `ZAI_AUTH_TOKEN` →
`ANTHROPIC_AUTH_TOKEN`. The key talks to `api.z.ai` — a Claude proxy var
pointing elsewhere is not zai config; set `ZAI_AUTH_TOKEN`. The base URL
follows `--base-url` → `ZAI_BASE_URL` → default `api.z.ai`.

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
