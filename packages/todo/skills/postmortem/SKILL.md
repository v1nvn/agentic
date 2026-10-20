---
name: postmortem
description: Read a finished run's session transcripts and report where the time and money went and which run rules were broken — the time tree across orchestrator, workers and background rituals, the token ledger and cost, totals per 100 changed lines, and mechanical waste shapes.
argument-hint: [session-id]
disable-model-invocation: true
---

Postmortem reads a finished session and writes nothing anywhere — not to the repo, not
to the thread file, not to the tracking files.

## Find the session

The argument names a session id; no argument takes the newest session in this project.
The transcript is `~/.claude/projects/<slug>/<id>.jsonl`; its workers are
`<id>/subagents/agent-*.jsonl`, each with an `agent-*.meta.json` beside it carrying
`description` and `model`. If the id doesn't resolve, stop and say so.

## Measure

Run `node ${CLAUDE_PLUGIN_ROOT}/skills/postmortem/scripts/analyze.mjs <transcript> <gate-pattern>`.
The gate pattern is required: the autopsied repo's suite command — the gate line the
run's thread file pinned, else derived from the repo as a run derives it (`run/SKILL.md`,
Open.4). It prints markdown:

- the time tree: wall, owner wait (owner questions included), stalls, orchestrator generation, every worker's wall split
  into generation and tools, every background span with how much of it overlapped work;
- per worker: type, the model and effort it ran at, wall, minutes from spawn to its
  first edit (the context it had to build before working), generation, tool time, model calls, median turn gap;
- the token ledger per agent, orchestrator included: input, cache read and write,
  output, first-call context (the spawn's entry cost), peak context, cache hit; the
  read : write ratio and the standing-context share;
- cost from the harness `cost-state` record, per model — absent while the session
  is still live;
- Bash time by category for the orchestrator and the workers, and every full-suite
  firing with its duration;
- files two or more agents read;
- violation candidates, as many as the transcripts carry, each with the rule it breaks.

## Judge

Read the run's thread file and its `progress/.scratch/` records. Drop every candidate
the records explain — a firing the thread file mandates, a flake whose failure is quoted,
a wait an inherent dependency chain forces. Confirm each survivor with its minutes and
the rule the script printed beside it, quoted by line from `run/SKILL.md` or the role
file in `agents/` that holds it.

## Report

One grouped time table; the run's totals — wall, tokens, cost and dispatches — with
tokens per 100 changed lines and the run's shape named (units, groups, commits, lines),
never figures divided by units, which re-cutting the same work would move; the violation
list with minutes; then levers ranked by the
minutes they touch, each naming where it lands — this plugin's skills, the run's thread
file, or the repo. End with what the measure cannot see. Say plainly when a big number is
the price of evidence the thread file demands, not waste.

Given an earlier session to compare, run the script on both and set the totals and
tokens per 100 changed lines side by side with each side's shape. Compare cost only when
both ran on the same models; wall and tokens per 100 changed lines compare across models.
