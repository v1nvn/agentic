# Token Usage Plugin

Per-model token usage and cache hit rate, read from local Claude Code session
transcripts — **zero model tokens**. Works for every profile writing to
`~/.claude/projects`: default claude, claudez, headless `claude -p` runs alike.

## How to use

In Claude Code, run:

```
/tokens:usage
```

A `UserPromptExpansion` hook intercepts the command, runs `bin/report.mjs`
directly, and returns the output as the block `reason` — so the model is never
invoked. No agent, no skill, no tokens.

## Requirements

- Node.js
- Nothing else. No API tokens, no env vars, no running collector — Claude Code
  already persists each assistant message's `usage` block to
  `~/.claude/projects/<project-dir>/<session>.jsonl`; the plugin reads that.

## How it works

```
/tokens:usage
  └─ UserPromptExpansion hook (hooks/report.sh)
       └─ node bin/report.mjs
            └─ bin/scan.mjs aggregates transcripts (per model, per local day,
               last 24h + last 7 days)
            └─ bin/format.mjs renders the plain-text report
       └─ returns {"decision":"block","reason": <report>}  ← model never runs
```

**Semantics:** `input_tokens` is the *uncached* input only; the modeled context
is `input + cacheRead + cacheCreation`. Hit rate =
`cacheRead / (input + cacheRead + cacheCreation)`. Cache reads come back from
the API per message — note that on the GLM Coding Plan, cached tokens count
fully against quota, so a high hit rate saves latency, not quota.

Files older than the 7-day window are skipped by mtime, keeping the scan under
a second even with a large transcript history.

The renderer is unit-tested with fixed inputs in `bin/format.test.mjs`:

```
node bin/format.test.mjs
```

`commands/usage.md` exists only as a fallback for when hooks are disabled.
