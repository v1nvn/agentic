# todo — roles move up a level; threads cut by PR

**Todo:** 0.55.2

## Goal

The todo plugin works the way the owner ran the testril capacity rework by hand:

- `/todo:run <thread> <group>` is a builder in a top-level session the owner opens: it takes
  one whole group — the units of one PR — end to end and opens the PR.
- `/todo:review <pr>` and `/todo:review <thread>` are a blind review in a fresh session: they
  print verified findings and stop; the owner routes them.
- No orchestrator session and no role agents for building or reviewing remain.
- The thread file is cut by group: each group carries its tier, consults, stop rules, review
  lens and rig; units stay one-commit outcomes inside it.
- `/todo:brainstorm` is gone; what real use showed worth keeping lives in `/todo:new`.

## Current state

- The owner ruled the design in one sitting: the roles keep their names and move up a level;
  the builder is a top-level session; the reviewer is blind; there is no orchestrator; review
  findings are printed for the owner to route; live threads in today's shape are reshaped by
  the stamp gate's audit.
- The trial this file used to carry (`session` units against builder units) is retired: both
  its arms build one unit at a time, so its verdict cannot judge a builder that takes a whole
  PR. Its ledger — 42 units, 9 `session` and 33 builder — is kept in
  `progress/.scratch/single-loop/` as the before for this thread's measure, with the baseline.
- The evidence behind the design — per-PR reports on the capacity rework (PRs 363–366), the
  human review's fixes, and a blind Opus review of the design — is kept in
  `progress/.scratch/single-loop/rework/`.
- Built on branch `todo-rework`, not through `/todo:run`.

## Next step

Build R1.

## Steps

### R1 · todo: roles up a level, threads cut by PR · opus/high

- **Review lens:** every surface states the same rule once; nothing names a retired door, role
  or cell.

| id | unit | close criteria |
| --- | --- | --- |
| R1 | Rules: the thread file cut by group — a group section per PR carrying its tier, consults, stop rules, review lens and rig; units `id · unit · close criteria`; the `**Run:**` line, per-unit `model`/`review`/`consult` cells, `session` units and their alternation removed; builder scratch files removed; a thread closes after its last PR merges and its thread review ran, the whole file archived at close | `rules/SKILL.md` names no `session` unit, no `**Run:**` line, no `review: unit`, no `-builder.md` file; its thread-file shape shows group sections; `claude plugin validate packages/todo` passes |
| R2 | `/todo:run <thread> <group>` is the builder: one group end to end in its own session — consults first with each finding turned into a named test or close criterion, every unit built in order by the session itself, cheap checks before the gate, gates and rigs of any length, stops to the owner directly on the thread's stop rules and the floor, push, PR, CI; pasted findings verified then fixed; a big group continues through `/todo:handoff`. `agents/builder.md` deleted | `agents/builder.md` is gone; `run/SKILL.md` dispatches only a read-only consult and is under half its 324 lines; validate passes (the README, auditor and review stop naming the builder in R3 and R5) |
| R3 | `/todo:review <pr>` and `/todo:review <thread>` are blind: the thread read at the base commit, the diff and the gate logs, never a builder's account; findings verified against the code, a reproduction run under a time bound where the claim needs one, nothing edited; findings printed and the review stops; the thread form reviews every group's PR against the Goal and re-runs the Goal's measure. `agents/reviewer.md` deleted | `agents/reviewer.md` is gone; no skill names `todo:reviewer`; `review/SKILL.md` has no fix step and names the base-commit read; validate passes |
| R4 | `/todo:new` cuts groups and units: what is one PR, what is one unit, their sizes; writes each group's consults with their exact questions, stop rules, review lens and rig; checks before it ends that the thread carries everything a fresh builder needs | `new/SKILL.md` names each group field and the completeness check; validate passes |
| R5 | The other surfaces say the same thing: `handoff`, `status`, `postmortem` (skill and its violation labels), the auditor, the README, and AGENTS.md's todo lines | `grep -rn -E "todo:builder\|todo:reviewer\|session unit\|orchestrator\|-builder\.md" packages/todo AGENTS.md` prints nothing outside the postmortem's measure of old runs; validate passes; prettier passes |
| R6 | `/todo:brainstorm` removed; what its real use in the two weeks before this thread showed worth keeping folds into `/todo:new` | `skills/brainstorm/` is gone; no surface names `/todo:brainstorm`; validate passes |
| R7 | Tracking: `progress/run-orchestrator-loop.md` closes — its question has no loop left to ask about; the index entry "re-measure under the role agents" goes for the same reason | The file is appended to `archive/run-orchestrator-loop.md` and deleted; `TODO.md` has neither entry and this thread's entry carries this title |

## Plan

- Gate: `node .github/scripts/build-skills.mjs`, `claude plugin validate packages/todo`,
  `yarn prettier --check packages/todo AGENTS.md progress TODO.md archive`. Under a minute.
- Every `SKILL.md` touched is reviewed against `references/skill-review.md` and the upstream
  skill-creator before its commit.
- Measure, after the first one or two threads run in the new shape: `/todo:postmortem` on each
  builder and review session, set beside the ledger in `progress/.scratch/single-loop/` —
  wall and tokens per 100 changed lines, blocking findings — plus defects found after merge
  and builder sessions per group.

## Design

- **The orchestrator was the owner.** On the capacity rework the owner launched one session
  per PR, answered the stops each builder asked directly (unit 21 in 51 s, PR 365's fork in
  1.9 min), opened a review per PR and routed its findings. Every step an orchestrator session
  would add is a relay; today's per-unit shape grew inside that relay, one rule at a time.
  (owner: "Maybe the orchestrator is nothing but a proxy for builder/reviewer")
- **The builder is a top-level session** (owner: "The builder has to be a top-level session -
  ok"): it commits under auto mode, waits on its own background gates and rigs, and asks the
  owner directly. It builds every unit itself; handing a unit to a subagent is how the
  capacity rework shipped an unregistered migration (unit 24).
- **The reviewer is blind** (owner: "don't you think that the reviewers have to be blind?"):
  the builder writes into the thread while it builds, so the review reads the thread as it
  stood at the PR's base. It never edits: a review fixing its own finding raised a restart
  peak from 26 MiB to 294 MiB on PR 366, caught only by a re-measure.
- **Findings are printed, not routed** (owner: "Just print them and I will either fix them in
  the same session or copy/paste the findings to the builder session").
- **A thread review before merge**: the human reviewer read PRs 363–366 together and found 4
  defects the per-PR reviews missed, two breaking the thread's Goal.
- **The floor stops stay**: money (unit 20 shipped a paid job retrying forever without a
  stop), a changed test assertion, a file the thread does not name, a change to the unit cut.
- **The thread cuts PRs** (owner: "It is upto todo:new to tell what is a pr, what is a unit"):
  the capacity thread's per-unit tier and consult cells were ignored once a session took a
  whole PR; only the consult the launch prompt named ran.
- **Live threads reshape through the stamp gate** (owner: "we already have a version check
  thing"): mechanical where the content is not in doubt, proposed for the owner otherwise.
  Units are not re-cut.
- **Archive at close only**: with the review reading the thread at the base commit, nothing
  reads landed groups from the archive mid-thread, so per-group archiving goes.
