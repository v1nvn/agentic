# @v1nvn/zai

The home of the zai plugin — and its plugin root: the `zai-usage` CLI in `src/`,
the mod's hooks module at `hooks/register.tsx` (`.ts`/`.tsx` the engine loads
directly, no build), engine tests at `tests/`. It reports GLM Coding Plan quota
and usage for the current account — models, tools, limits — straight to the
terminal; no browser, nothing written.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — a mod serves the one surface the
model never reads: `/zai-usage` execs the shipped CLI and opens its report as
a pane (nothing execs until the command runs).

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install zai@agentic
```

In a terminal, bare:

```sh
npx -y @v1nvn/zai@0.41.1 usage
```

## Usage

| Invocation | Does |
|---|---|
| `/zai-usage` | the account's usage report, as a pane |
| `npx -y @v1nvn/zai@0.41.1 usage` | the same report, printed bare |
| `npx -y @v1nvn/zai@0.41.1 usage --auth-token TOKEN` | same, key on the command line (visible in `ps`) |
| `npx -y @v1nvn/zai@0.41.1 usage --auth-token=TOKEN` | `=` form — zsh quoting-safe |
| `npx -y @v1nvn/zai@0.41.1 usage --base-url URL` | another GLM endpoint (default `api.z.ai`) |

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
(`ZAI_BASE_URL=https://open.bigmodel.cn`). The mod's exec runs inside the
session's shell, so it inherits the same environment `npx zai-usage` reads.

The API labels every bucket in Beijing time (UTC+8); the report shifts each
timestamp to your local zone for display.

## Develop

```sh
yarn workspace @v1nvn/zai test       # the CLI side (vitest)
claude plugin validate packages/zai  # the mod, as the engine reads it
claude plugin test packages/zai      # the mod, through the engine
yarn lint && yarn typecheck         # from the repo root (typecheck
                                    #   covers tsconfig.mods.json too)
```

The mod API is early access and moves between Claude Code releases — a build
that refuses the module loads nothing, so validate after every engine update
and re-vendor `types/claude-code.d.ts` (repo root) from the engine-laid
`.claude-plugin/types/` when it changes. Read `references/mods.md` first.

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`zai-usage`) — dispatch, exit codes |
| `src/usage.ts` | the GLM API call and the report input it assembles |
| `src/resolve.ts` | auth-token resolution chain |
| `src/format.ts` | the report's lines — printed by the CLI, drawn by the pane |
| `hooks/register.tsx` | the mod: registers `/zai-usage`, execs the CLI, opens its report as a pane |
| `bin/usage.mjs` | the standalone build the mod execs — committed, synced by `yarn build` |

## Contracts

- One job: print the report, exit 0. Nothing is written anywhere.
- `/zai-usage` is one `node <plugin root>/bin/usage.mjs usage --json` exec through
  the session's Bash tool — the same query `npx zai-usage` runs, awaited
  as-is. The one allow rule it needs is
  `Bash(node <plugin root>/bin/usage.mjs usage --json)`; the first run asks for it
  once, then it is remembered. Its report is a pane the model never reads.
