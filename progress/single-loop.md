# todo:run — fold subagents into the session, measured on real runs

**Todo:** 0.54.0

## Goal

Each fold of a `/todo:run` subagent into the session is kept or reverted on a verdict
measured on the owner's real runs, against the decision rule in Design written before
the data. The first fold judged is `session` units against builder units.

## Current state

- `session` units shipped in b8ce22b; group review narrowed to foundations, CI at the
  base and the close in ccde7cd.
- Baseline: the 120 `/todo:run` sessions up to 2026-10-24, graded per session (98 real
  runs: 18 short-path fit, 55 mixed, 25 needing the machinery). The graded records,
  per-session cost metrics and the 378 classed blocking findings are kept in
  `progress/.scratch/single-loop/`.
- Transcripts are kept 365 days (`cleanupPeriodDays`), so every trial run stays readable
  at the verdict.
- The trial runs from S1's commit: eligible rows alternate `session` and builder, every
  group gets its group review, and reviewer reports end in a `findings` block.

## Next step

Work as usual; at the owner's ask after about 20 `session` and 20 builder units have
landed, build S2 and run S3.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| S1 | Trial wiring: rows alternate `session` and builder, every group reviewed, reviewer `findings` block | | | | The rules carry the alternation, the run reviews every group, and the reviewer report ends in a `findings` block — landed in `feat(todo): alternate session and builder units, every group reviewed, reviewer findings block` |
| S2 | Per-unit ledger: `/todo:postmortem` emits one row per unit — the Design fields — over the baseline and the trial runs, with the escaped-defect scan | | | | The ledger holds a row for every landed unit of every trial run, and each field is filled from its named source |
| S3 | Verdict on `session` units against the decision rule | owner | | | Keep or revert is written into Design with the ledger numbers behind it |

## Plan

- S2 ledger fields and their sources: unit, repo, thread and arm from the Steps row;
  risk class and diff size from the row and `git show --stat`; cost, wall, dispatches and
  model calls from the transcripts; blocking findings per unit from the reviewer's
  `findings` block (from regexed report text for the baseline); CI on the unit's commit
  from `gh run list --commit`; escaped defects as later commits naming the unit's id, or
  an owner live-look rejection.
- After S3, one change at a time, each with its own decision rule written before its data:
  the fix round going to the agent that built the unit; structured builder and reviewer
  returns; the `/claude-api prompt-audit` edits over `run`, `rules` and the role files
  (judged against the ledger's before-period, since they touch every unit).

## Design

- Real runs only, never replays: the blind group review grades both arms, because it sees
  neither who built a unit nor how.
- Alternation, not the cutter's pick, assigns the arms: a cutter choosing would hand
  `session` the easy units.
- Decision rule for `session` units, at about 20 units per arm: keep when blocking
  findings per unit are no worse than the builder arm's by more than 1 per 10 units,
  escaped defects are no worse, and cost or wall per unit is lower; revert at once on an
  escaped money or wire-format defect.
- An all-`session` group keeps its group review until S3: it is the measuring instrument,
  and whether it can go is part of the verdict.
