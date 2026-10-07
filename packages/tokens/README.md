# @v1nvn/tokens

The home of the tokens plugin — and its plugin root: the `tokens-report` CLI and
the mod's island share `src/`, the hooks module sits at `hooks/register.tsx`
(`.ts`/`.tsx` the engine loads directly, no build), with engine tests at
`tests/` and the state contract at `types/`. One scan of the local session
transcripts feeds both — per-model token usage and cache hit rate for
the last 24 hours, plus daily totals for the last 7 days — and neither spends
model tokens to tell you what the model cost.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — a mod draws two surfaces the model
never reads: `/tokens-usage` opens the full report as a pane (refreshed on open
and every 5 minutes while it shows; nothing draws and nothing execs until
then), and `/tokens-top` draws the live session as a pane — context window and
its eaters, token and thinking flow off the streaming chunks, rate-limit
windows with resets, the agent roster and what runs now, all fed by engine
pushes, no exec, no polling.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install tokens@agentic
```

In a terminal, bare:

```sh
npx -y @v1nvn/tokens@0.39.2
```

## Usage

| Invocation                    | Does                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/tokens-usage`               | the full report, as a pane                                                                                    |
| `/tokens-top`                 | this session live — context + eaters, flow, limits, agents, as a pane                                         |                                                                                    |
| `npx -y @v1nvn/tokens@0.39.2` | per-model table: input/output/cache-write/cache-read tokens, cache hit rate, 24 h window + 7-day daily totals |

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

| File                 | Role                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `src/index.ts`       | bin entry (`tokens-report`) — dispatch, exit codes                           |
| `src/aggregate.ts`   | the one usage math: JSONL line → per-model/per-day accumulation              |
| `src/scan.ts`        | the CLI's transcript walk (node-fs)                                          |
| `hooks/register.tsx` | the mod: execs the CLI into the `/tokens-usage` pane; draws the `/tokens-top` pane from engine pushes |
| `src/format.ts`      | the report both doors render                                                 |
| `src/text.ts`        | line model + fixed-width primitives — the one home, shared as `@v1nvn/tokens/text` |
| `bin/report.mjs`     | the standalone build the mod execs — committed, synced by `yarn build`       |

## Contracts

- Reads transcripts only; writes nothing.
- The island never reads transcripts (`$.fs.read` caps at 4 MiB); every number
  is one `node <plugin root>/bin/report.mjs --json` exec through the session's
  Bash tool — the same scan `npx tokens-report` runs. First `/tokens-usage`
  may ask to allow that command once; allow and it is remembered.
- The mod's surface (the pane) is drawn by the engine and never enters the
  model's context; the CLI prints the same report bare.
