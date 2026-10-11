# run-costs kit — measure what a Claude Code session (or `/todo:run`) cost

Regenerates the numbers in `../run-costs.md`. Sample record: `reports/d7ab34d2.md`.

## Layout

- `scripts/analyze.py` — the deterministic core. One pass over a session's parent
  transcript + its `subagents/agent-*.jsonl`, printing: role map, token ledger,
  root-vs-scoped gate inventory, duplicate commands, cross-agent file re-reads,
  parent idle gaps.
- `prompts/` — the six subagent briefs, verbatim, that produced the interpretation
  layer (turn narratives, phase attribution, waste pricing, spawn-injection
  economics). The briefs carry the parsing contract in prose.
- `reports/` — assembled records, one per audited session.

## Run it

```
python3 references/run-costs/scripts/analyze.py <session-id> \
  --project ~/.claude/projects/<encoded-repo-path> \
  --exclude "HH:MM:SS-HH:MM:SS,..."   # UTC windows to drop (stalls, waits on owner)
```

Stdlib python3 only. Output anchors to check against a stored report: parent
first-call context, per-agent call counts, root-suite counts, duplicate groups.

## How a report is built

Two layers:

1. **Deterministic** — `analyze.py` (above).
2. **Interpretation** — six sonnet subagents in two parallel waves, one brief each
   (`prompts/`). Wave 1: parent ledger, builders, reviewers+clerk, cross-agent
   waste. Wave 2: token ledgers (parent+builders; verification roles). The waves
   cross-check each other; the assembler reconciles against the harness
   `cost-state` record at the end of the parent transcript (authoritative for
   cost; counts retries the transcripts don't record, so its input/cache-read run
   higher than transcript-derived sums).

## Parsing law (transcript contract)

Verified on glm-backed sessions; re-verify STEP 0 of the wave-2 briefs when the
backend changes:

- Assistant records are **delta chunks of one model call**: a `message.id` streams
  as 1–5 records with identical usage; the record carrying the full usage shape is
  the billed one. One `message.id` = one model call.
- Thinking text lives in content blocks `type:"thinking"`; the usage field
  `output_tokens_details.thinking_tokens` reports 0 and `output_tokens` already
  includes thinking.
- `cache_creation_input_tokens` is structurally 0 on this backend — cache writes
  are not recorded.
- Tool pairing: `tool_use` block id → matching `tool_result` `tool_use_id`;
  duration = result timestamp − use timestamp.
- Subagent transcripts live at `<project>/<session-id>/subagents/agent-*.jsonl`;
  each agent's role is its first user message. A transcript continues past its
  work's end (idle message receipts) — active span ends at the last real tool call.
- Timestamps are UTC ISO (`Z`); local machine time is UTC+5:30 for this owner.
