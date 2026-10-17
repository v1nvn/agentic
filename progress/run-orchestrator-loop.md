# todo:run — whether the orchestrator loop leaves the model

## Goal

An owner ruling on whether `/todo:run`'s orchestrator loop stays a model session or moves
to a mechanism that removes its token cost. If the ruling is to move it, this file carries
the plan for the change, with its gain measured against the baseline below on a real run.

## Current state

Measured from every `/todo:run` and `/todo:review` session's transcripts, main and
subagents, in the runs on todo 0.46+ (8 Claude sessions, 7 GLM). Cost is list price,
input side only: Claude transcripts log output tokens at stream start, and z.ai reports
zero usage on 42% of GLM calls.

- The orchestrator is 28% of Claude input tokens ($83 of $315).
- 59% of that ($49) is spent in the turns that follow a worker's hand-back:
  350 wakes, median 3 turns each.
- Its context grows about 1.8k per turn with no single large read; one run woke 312 times
  and grew from 77k to 637k ($35).
- Worker reports are 321k tokens of that context (builders median 37 lines, reviewers 52),
  and later wakes re-read them: 35.5M tokens, 13% of orchestrator input.
- Waits on the owner over an hour re-cached 200k+ contexts six times ($10.8).

Already shipped on the trims side: a builder `tools:` line (17.7k fewer tokens per builder
call, −88M Claude / −28.5M GLM over the same runs) and the reviewer-reads-the-gate-log
wording.

## Next step

Owner ruling on Steps row O1, with the options and their measured trade-offs from Design.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| O1 | Rule whether the loop leaves the model, and by which mechanism | owner | none | | The ruling is written into Design; a chosen mechanism adds its units to this table |

## Design

The owner rejected these mechanisms as regression risks:

- plugin hooks that steer subagents;
- `omitClaudeMd` on workers;
- an orchestrator handoff to a fresh session at a context ceiling;
- a `claude -p` loop driven from a node CLI.

Trims that keep the model loop and leave no measured gain on the orchestrator:

- **Shorter builder hand-backs.** Builder reports are 18.4M of the 35.5M re-read tokens.
- **Reviewer reports.** Their 14.5M has no Write path, and only 1% of the text is pasted
  output.

Not yet weighed:

- **The Claude Code Workflow tool as the loop.** It is deterministic, takes `agentType`
  roles and schema returns, and keeps the 5-minute cache. Its scripts have no filesystem
  access, so commits and gates still cost agent calls.
