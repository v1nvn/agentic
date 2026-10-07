---
name: postmortem
description: Read a finished run's session transcripts and report where the time went and which run rules were broken — the time tree across orchestrator, workers and background rituals, per-worker generation against tool time, and mechanical waste shapes. Use when the user asks why a run was slow, where its time went, or names a session to autopsy.
argument-hint: [session-id]
disable-model-invocation: true
---

Postmortem reads a finished session and writes nothing anywhere — not to the repo, not
to the plan, not to the tracking files.

## Find the session

The argument names a session id; no argument takes the newest session in this project.
The transcript is `~/.claude/projects/<slug>/<id>.jsonl`; its workers are
`<id>/subagents/agent-*.jsonl`, each with an `agent-*.meta.json` beside it carrying
`description` and `model`. If the id doesn't resolve, stop and say so.

## Measure

Run `node scripts/analyze.mjs <transcript>`; it prints markdown:

- the time tree: wall, owner wait, orchestrator generation, every worker's wall split
  into generation and tools, every background span with how much of it overlapped work;
- per worker: model, wall, generation, tool time, tokens, turns, median turn gap;
- worker Bash time by category, and every full-suite firing with its duration;
- violation candidates, as many as the transcripts carry.

Timestamp deltas are the whole measure. Thinking blocks are encrypted, so generation
time is the gap before an assistant message; tools that ran in parallel overlap, and
the tree says so rather than summing them away.

## Judge

Read the run's plan file and its `progress/.scratch/` records. Drop every candidate
the records explain — a firing the plan mandates, a flake whose failure is quoted, a
wait an inherent dependency chain forces. Confirm each survivor with its minutes and
the rule it breaks, quoted from `run/SKILL.md` by line. The script's candidates:

- a worker Bash `sleep` poll (run: no worker polls with `sleep`);
- a suite re-run inside five minutes whose command differs only in output shaping;
- a full-suite firing beyond the unit's gate firings (run: the full gate fires before
  a commit and per code-touching fix round, and its log answers later questions);
- a reviewer transcript holding a suite run (run: a review reads a diff against the
  plan, it does not re-do the build);
- an idle span where one background ritual ran and nothing else did.

## Report

One grouped time table; the violation list with minutes; then levers ranked by the
minutes they touch, each naming where it lands — this plugin's skills, the run's plan,
or the repo. End with what the measure cannot see. Say plainly when a big number is
the price of evidence the plan demands, not waste.
