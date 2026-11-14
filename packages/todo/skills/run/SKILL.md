---
name: run
description: Build one group of a progress/<slug>.md thread file — every unit of one PR, one commit each, through its gates to an open PR with green CI. Use when the user points at a thread file and asks to run or build it ("run progress/x.md", "build group R4 of x"), or pastes review findings into a session building a group.
argument-hint: <thread> [group]
---

Load `/todo:rules` first — the thread shapes this build reads and writes live there, and so do
the meanings of thread, group, unit and owed work.

This session is the group's builder. It builds every unit itself, end to end, and opens the
PR. It hands no unit to a subagent: a unit built out of this session's sight lands code nobody
here read. The only dispatch is a read-only consult.

## Open

1. Resolve the arguments: a thread file path, then a group id as the thread heads it. No group
   given: the first group whose units have not all landed. A path or a group that does not
   resolve, or a group whose tier is `owner`: say so and stop.
2. Run the rules' stamp gate, fold any scratch notes found, then read the thread file whole and
   the repo's CLAUDE.md or AGENTS.md sections that bite.
3. Branch. A branch for this group whose commits name its units is a resume: check it out
   clean and continue at the first unit with no commit. Otherwise branch from the group's
   **Base** — the default branch when it names none — on a new branch named for the thread
   and the group. A dirty tree: say so and stop.
4. The session runs on another model than the group's tier: say so in one line and continue —
   a session cannot switch itself; the owner restarts it to change tier.
5. Preconditions: the workspace gate green at the base — read from the base commit's CI
   (`gh run list --commit <sha>`) when a green run there runs it, else fired here — its
   minutes written into the tactical map as the gate's ceiling; the environment the units need
   (services, env vars, secrets, disk, `gh` auth). Any violation: say so and stop.

## Consults

Before the unit a consult names builds, dispatch one read-only Agent (`subagent_type: "Plan"`)
per consult. Its brief names the thread file, the unit, the code the unit names and the
consult's exact questions, and asks for options with one recommendation each. Take each
recommendation through §Stops. Every finding that names a way the unit could fail becomes a
named test or a close criterion in the unit's row before the unit builds — a finding left as
prose ships untested.

## Build

For each unit, in order:

- Read its row, the sections it points at and its reading list. Re-read the source behind any
  anchor before relying on it.
- Build compiler- and test-driven. Write no bridge code: the old path is deleted in the same
  change.
- Write a test first, and watch it fail, only when the unit changes a value a caller, a peer or
  the money would notice and no existing test or snapshot already moves with it. One test, the
  smallest that fails, at the highest door that reaches the case, crossing its seam with a
  value where two readings differ.
- Cheap checks — the tactical map's format, lint, line-limit and compile lines — after each
  batch of edits, because they fail in seconds what the full gate fails in minutes. The
  scoped gate lines while building, never wider.
- A unit that adds a migration, a registry entry, a route or a config key proves the system
  reaches it: a test or command that fails while it is unregistered.
- Last: the workspace gate and the enforcement script once, logged to
  `progress/.scratch/<slug>/gate-<unit id>.log`. A command past the Bash timeout runs in the
  background and its exit wakes the session; never poll with `sleep`. A gate re-fires only for
  a stated cause — changed code, or a flake with its failure quoted; an edit to comments alone
  re-runs only the cheap checks.
- Prove each close criterion — its grep, test or gate line — walk the enforcement inventory's
  checklist lines, and check `git diff --name-only` against the files the thread names.
- Commit the unit: one conventional line naming its id, no trailer. The lockfile, README and
  docs the gate exercises ride that commit.
- Stop only processes this session started, by the PID it recorded.

A measure the thread names — a ritual's before and after, or a group's **Stops** bar — is
recorded to `progress/.scratch/<slug>/`, its first input's log checked before the rest run. A
run already recorded for the same input and invocation is not paid twice. Probes tune against
a frozen snapshot, never a live corpus. A rig that holds the machine is announced before it
starts.

## Stops

Every pick the thread's text does not name is taken or stopped on. A mechanical pick inside
the thread's named scope is taken: said in one line, written into the section it affects, and
listed in the final report. These stop, and the owner is asked through AskUserQuestion — the
options and one recommendation — before anything that depends on the answer lands:

- a pick that touches money or names what a caller sees;
- a test assertion changed or deleted, beyond a rename the thread names;
- a file the thread does not name;
- a pick that forces a second deviation, or would mint, split or merge a unit;
- a group **Stops** bar missed — with its numbers.

The list is a floor: a big deviation stops too. A question that touches money or would mint a
unit is asked only after reading the code it rests on, so every option it offers is buildable.

Anything found that no unit carries — a finding outside every unit, a new want, a cut — is
owed work: one line in Current state, told to the owner once. Only the owner mints a unit.

## Findings

Findings pasted into this session — from `/todo:review` or a human on the PR — are claims.
Verify each against the code; fix each verified one where its fault starts, under §Build;
re-fire the gate and every measure its unit names; commit naming every faulted unit's id; push.
Report each finding as fixed, refuted with its evidence, or stopped.

## PR

At the group's first commit, push and open the PR with its base named explicitly
(`gh pr create --base <base>`); each later commit pushes. Never push to the default branch,
never merge. After the last unit, watch CI at the head (`gh pr checks <pr> --watch`, in the
background); a red check is fixed like a red gate. Mark the PR ready on green CI.

## Context

When the context passes about half the window, or the owner calls it, commit what is green
and run `/todo:handoff`: its pointer is `/todo:run <thread> <group>`, and the fresh session
resumes per §Open 3.

## Red lines

1. Production data stores are read-only unless the thread pre-authorizes writes. Migrations
   land as files; production gets them through the owner's release flow.
2. Frozen scoring sheets are scored exactly as the thread says and never tuned against.
3. A probe that fails its bar is reported, not landed: "probed, no landing" with its grid in
   the thread file is a landed unit.
4. A pin changes only because the behavior deliberately changed, and the commit says so.
5. Shared external environments are never written; a live deploy is the owner's call.

## End

Fold the scratch notes into the thread per the rules — each landed unit's commit in its row,
Current state rewritten — and set Next step to `/todo:review <pr>`; for the thread's last
group, to `/todo:review <thread>` once every group's PR has merged, then the close. Commit the
fold on the branch and push.

Report: the PR URL; gates from base to each unit to CI; every pick taken (question, pick,
reason, where written); owed work; open stops; remaining reds.
