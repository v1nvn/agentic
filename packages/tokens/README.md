# @v1nvn/tokens

The CLI behind the tokens plugin: per-model token usage and cache hit rate
for the last 24 hours, plus daily totals for the last 7 days, read from local
Claude Code session transcripts — no model tokens spent to learn what the
model cost.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — `/tokens:usage` runs this CLI
through a `UserPromptExpansion` hook with zero model tokens:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install tokens@agentic
```

In a terminal, bare:

```sh
npx -y @v1nvn/tokens@0.28.0
```

## Usage

| Invocation | Does |
|---|---|
| `npx -y @v1nvn/tokens@0.28.0` | per-model table: input/output/cache-write/cache-read tokens, cache hit rate, 24 h window + 7-day daily totals |

Works for every profile writing to `~/.claude/projects` — default `claude`,
`claudez`, headless `claude -p` runs alike. Files older than the 7-day window
are skipped by mtime, keeping the scan under a second even with a large
transcript history.

**Semantics:** `input_tokens` is the *uncached* input only; the modeled context
is `input + cacheRead + cacheCreation`. Hit rate =
`cacheRead / (input + cacheRead + cacheCreation)`. On the GLM Coding Plan,
cached tokens count fully against quota, so a high hit rate saves latency, not
quota.

## Develop

```sh
yarn workspace @v1nvn/tokens build
yarn workspace @v1nvn/tokens test
yarn lint && yarn typecheck       # from the repo root
```

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`tokens-report`) — dispatch, exit codes |
| `src/scan.ts` | transcript discovery and usage aggregation |
| `src/format.ts` | the printed tables |

## Contracts

- Reads transcripts only; writes nothing.
- One flag: `--hook` emits the UserPromptExpansion block the plugin's hook
  prints; bare invocation prints the same report.
