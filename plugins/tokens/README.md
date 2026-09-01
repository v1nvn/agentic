# Token Usage Plugin

Per-model token usage and cache hit rate, read from local Claude Code session
transcripts — **zero model tokens**. Works for every profile writing to
`~/.claude/projects`: default claude, claudez, headless `claude -p` runs alike.

## How to use

In Claude Code, run:

```
/tokens:usage
```

A `UserPromptExpansion` hook intercepts the command, runs the `tokens-report`
CLI from npm (`@v1nvn/tokens`, version-pinned in `hooks/hooks.json`), and
returns the output as the block `reason` — so the model is never invoked. No
agent, no skill, no tokens.

In a plain shell the same CLI runs directly:

```
npx -y @v1nvn/tokens
```

## Requirements

- Node.js (the hook runs `npx`)
- Nothing else. No API tokens, no env vars, no running collector — Claude Code
  already persists each assistant message's `usage` block to
  `~/.claude/projects/<project-dir>/<session>.jsonl`; the CLI reads that.

## How it works

```
/tokens:usage
  └─ UserPromptExpansion hook (hooks/hooks.json)
       └─ npx -y @v1nvn/tokens@<version> --hook
            └─ scans transcripts (per model, per local day, last 24h + 7 days)
            └─ renders the plain-text report
       └─ returns {"decision":"block","reason": <report>}  ← model never runs
```

**Semantics:** `input_tokens` is the *uncached* input only; the modeled context
is `input + cacheRead + cacheCreation`. Hit rate =
`cacheRead / (input + cacheRead + cacheCreation)`. Cache reads come back from
the API per message — note that on the GLM Coding Plan, cached tokens count
fully against quota, so a high hit rate saves latency, not quota.

Files older than the 7-day window are skipped by mtime, keeping the scan under
a second even with a large transcript history.

The renderer and scanner are unit-tested in `packages/tokens/test`:

```
yarn workspace @v1nvn/tokens test
```

`commands/usage.md` exists only as a fallback for when hooks are disabled.
