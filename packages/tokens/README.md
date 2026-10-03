# @v1nvn/tokens

The home of the tokens plugin — and its plugin root: the `tokens-report` CLI and
the mod's island share `src/`, the hooks module sits at `hooks/register.tsx`
(`.ts`/`.tsx` the engine loads directly, no build), with engine tests at
`tests/` and the state contract at `types/`. Both read the
same local session transcripts — per-model token usage and cache hit rate for
the last 24 hours, plus daily totals for the last 7 days — and neither spends
model tokens to tell you what the model cost.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — a mod draws two surfaces the model
never reads: a status line under the prompt carrying the rolling 24h slice,
and `/tokens` opening the full report as a pane (refreshed on open and every
5 minutes).

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install tokens@agentic
```

In a terminal, bare:

```sh
npx -y @v1nvn/tokens@0.31.0
```

## Usage

| Invocation                    | Does                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npx -y @v1nvn/tokens@0.31.0` | per-model table: input/output/cache-write/cache-read tokens, cache hit rate, 24 h window + 7-day daily totals |

Works for every profile writing to `~/.claude/projects` — default `claude`,
`claudez`, headless `claude -p` runs alike. Files older than the 7-day window
are skipped by mtime, keeping the scan under a second even with a large
transcript history.

**Semantics:** `input_tokens` is the _uncached_ input only; the modeled context
is `input + cacheRead + cacheCreation`. Hit rate =
`cacheRead / (input + cacheRead + cacheCreation)`. On the GLM Coding Plan,
cached tokens count fully against quota, so a high hit rate saves latency, not
quota.

## Develop

```sh
yarn workspace @v1nvn/tokens test       # the CLI side (vitest)
claude plugin validate packages/tokens  # the mod, as the engine reads it
claude plugin test packages/tokens      # the mod, through the engine
yarn lint && yarn typecheck             # from the repo root (typecheck
                                        #   covers tsconfig.mods.json too)
```

The mod API is early access and moves between Claude Code releases — a build
that refuses the module loads nothing, so validate after every engine update
and re-vendor `types/claude-code.d.ts` (repo root) from the engine-laid
`.claude-plugin/types/` when it changes. Read `references/mods.md` first.

## Modules

| File                 | Role                                                            |
| -------------------- | --------------------------------------------------------------- |
| `src/index.ts`       | bin entry (`tokens-report`) — dispatch, exit codes              |
| `src/aggregate.ts`   | the one usage math: JSONL line → per-model/per-day accumulation |
| `src/scan.ts`        | the CLI's transcript walk (node-fs)                             |
| `hooks/register.tsx` | the mod: `$.fs` walk, status line, `/tokens` pane               |
| `src/format.ts`      | the report both doors print                                     |
| `src/text.ts`        | fixed-width report primitives                                   |

## Contracts

- Reads transcripts only; writes nothing.
- The mod's surfaces (status line, pane) are drawn by the engine and never
  enter the model's context; the CLI prints the same report bare.
