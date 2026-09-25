---
name: run
description: Execute a progress/<plan>.md plan file unit by unit — fresh subagents per unit, each closed on its stated criteria, one commit per unit; landing the final unit closes the thread in the same sitting. Use when the user points at a plan file and asks to run it, fully or a named subset of units.
argument-hint: <plan> [units]
---

Load `/todo:rules` first — the thread shapes this run opens, realigns, and closes live there.

Run a plan file autonomously. The arguments name a plan file path, then optionally the
units to run — ids exactly as the plan names them (phase, step, block, unit), or a range like
`P7-P11`. No scope means the whole thread. If the path or a scope id doesn't resolve,
stop and say so.

The plan carries the work in the rules' progress-file shape: Goal, the Steps unit table
(dependency order, close criteria, `model`, `review`), and its Plan section — reading
lists, the enforcement inventory, PR grouping, open questions, audit list. This
skill carries the loop. Where the plan is silent, derive from the repo and CLAUDE.md,
decide, and write the decision into the plan — inside the deviation law below.

## Deviations

The run deviates from nothing the plan's text does not already name. Any pick outside
that — mechanical or not — stops the run and is posted to the owner: no accept-and-note,
never a ruling made alone. Scope changes, contract or semantic changes, anything
unnamed → post it and wait — a small early deviation compounds into places the plan
never chose. The mechanical test for what must stop: a deviation that forces a second
deviation to land, touches a file the plan doesn't name, or mints or splits a unit. A
single mechanical pick inside the plan's named scope proceeds and is written into the plan.

## Session frame

The session is orchestrator, verifier and decision-maker only. The owner is not
available during the run; there are no checkpoints. Every decision is written into the
plan as it is made and reported in the final veto table. The plan file, with its
scratch notes, is the resume record — a later session picks up from those alone;
write no parallel run document. On resume, fold any scratch notes in first, then
re-run the last landed unit's close criteria instead of trusting its row.

## Models

The plan names its models; this skill's defaults are the fallback.

- A `**Run:**` line near the plan's top names the orchestrator model when the plan needs
  one; without it, the launching session orchestrates. A session on a different model
  than the line names says so before its first dispatch and continues — it cannot switch
  itself; the owner launched it.
- A `model` column on the Steps table names that unit's builder. The reviewer takes the
  stronger of the unit's model and the default (`fable` > `opus` > `sonnet`); the test
  writer takes the default. A blank cell is the default. A `review` column tiers the
  reviewer: `blind` (the default, the model rule above), `checklist` (`sonnet`, the
  unit's close criteria and the loop's checklist core), or `none` — which the plan
  must justify in the pre-flight picks and the final veto table. `owner` marks a unit
  the run does not do: it is skipped, its dependents stop at it, and the final report
  lists it as owed.
- Defaults: judgment roles (hardening, test-writing, building, reviewing, fixing) are
  `opus`; extraction, scripts, re-measures, audits and web enumeration are `sonnet`.

## Open

1. Read the plan whole, the repo CLAUDE.md sections that bite, and the tracking rules
   (loaded above).
2. Harden if needed. A plan without per-unit close criteria (testable sentences) and
   reading lists is a design, not a runnable plan: the first unit is a docs-only
   hardening unit that writes them — plus an enforcement inventory (tests that must
   survive byte-for-byte, forbidden idioms, counts that must never rise) — into the
   plan's Steps table and Plan section, and commits. Nothing builds before they exist.
3. Resolve the scope to an ordered unit list. Steps the plan marks trivial may bundle
   into one unit with one-line commits each. A unit whose diff would pass the plan's
   line ceiling is split before dispatch and the split written into the plan; a pure deletion is
   exempt, because a tree that must stay green cannot lose a component in halves.
4. Derive the run mechanics:
   - Gate command(s) from the repo (type-check/lint/test/build, or a workspace-wide
     gate). Each unit's row may name its gate scope — the components it touches plus
     their dependents; a row that names none takes the repo's whole gate, and the whole
     gate runs at the group boundary either way. The full gate fires immediately before
     a commit that changes code it exercises, and the unit's scratch notes name every firing and
     what it answered; a firing that answered nothing is a deviation. Iteration inside
     a unit uses scoped commands only. Where builds are slow, ration every run to the
     narrowest scope that answers the question.
   - Any A/B ritual the plan names: record before, record after, land only on the
     plan's landing rule (e.g. green count up with zero green→red); probes tune
     against a frozen snapshot, never a live corpus. A ritual run already recorded for
     the same base revision and invocation is not re-paid; a re-run is ordered only
     when the recorded run's log shows environment failure — an anomalous verdict with
     a clean log is a finding, not a re-run.
   - PR topology from the plan's grouping; default one branch and one PR at the end.
     Every `gh pr create` names its base explicitly. The run opens PRs; it never
     merges and never pushes to the default branch.
5. Pre-flight picks. For every question the plan defers to the owner: re-verify the
   premise against the tree first — where the code already settled it, the code wins —
   then pick by the plan's own evidence and CLAUDE.md. Post one short message listing
   the picks (question, pick, reason) so the owner can interrupt, then proceed.
6. Preconditions before the first dispatch: tree clean on the plan's base (the default
   branch when the plan names none) — when the prompt asks for a worktree, the run creates
   one on a new branch off that base and the check applies there; the gate green at the start; every unit on another
   thread the scope is gated on has landed there — its closing test is in the tree, or
   its plan's Steps table says so; the environment the scoped units need (cluster, env vars,
   secrets, disk, `gh` auth, quiet neighbors — file watchers, IDE indexers and
   test-discovery runners on the tree, where the machine has them). Any violation:
   stop and say so.

## Workers

- Each worker takes the model §Models resolves for its role. Never `fork` — a fork
  copies the orchestrator's context.
- One `sonnet` clerk per run, continued by message, owns the run's mechanics: it runs
  the enforcement gate script after every commit and fix round and reports the red or
  green line, collects gate tails and worker-report tails verbatim, drafts scratch
  notes and veto-table rows, and executes the stall poll. It pastes raw command
  output, never a summary of it, and decides nothing — a drafted line lands only when
  the orchestrator accepts it, or untouched where the run pre-authorized its template.
- Fresh agent per unit per role. Briefs point at the plan's section or row, name the
  files the worker owns, and state what "done" means (the unit's verify clause).
  Briefs never paste plan text. A brief that names a heavyweight ritual tool pins
  its full invocation from the plan — filters, jobs, timeout, output; a worker never
  explores a tool's options by trial runs. Where the plan does not yet pin one, the
  orchestrator derives it once, writes it into the plan, and every brief thereafter
  uses that line.
- Workers read only their reading list and keep their context small. On units that can
  exhaust a window, the builder keeps a scratchpad state file current — naming the
  step it has entered and when it next expects to be heard from — so a successor
  resumes cold.
- Workers report in a fixed format under ~20 lines: commit hash(es), gate tail,
  per-criterion proof, A/B verdict where the unit calls for one, deviations, surprises.
- The orchestrator never opens a source file to understand it. It reads reports, gate
  output, `git show` diffs, and the diff classes the plan flags as silent-failure
  carriers (migrations, wire bodies, signatures) — and may re-run anything to
  reproduce a finding.
- Every dispatch of a builder or reviewer schedules a stall poll — one cheap look
  each ~10 minutes at the worker's transcript tail and state file, cancelled by its
  completion notice; the clerk can run it. No progress past the time the state file
  named, or the same command three times running, escalates: a nudge by message
  first, a successor from the state file once a nudge goes unanswered. A healthy
  quiet gate never trips it — the trigger is the state file's own stated expectation.
- A stalled or rate-limited worker is continued by message, never replaced. A
  successor starts from the worker's state file, and only once the original is gone.

## Per-unit loop

1. Test writer first where the plan names the unit's tests: writes them red, commits
   nothing, reports test names and files; the builder may not edit them. Where the
   plan doesn't name tests, red-first rides in the builder's brief.
2. Builder builds compiler/test-driven on the named files, writes no bridge code,
   leaves protected tests untouched, runs the full gate once, commits (one line, no
   co-author trailer), appends to or opens the PR, writes its unit's notes to the
   plan's scratch file, and writes what it learned into the sections of later units that owe it. A
   deviation stops the builder before its commit: it reports the finding and the
   options, and nothing lands until the orchestrator answers.
3. Where the enforcement inventory names checkables, a `sonnet` writes a scratchpad
   gate script from it (protected-test hashes, forbidden-idiom count deltas,
   comment-line delta, line ceilings); the clerk runs it after every commit and fix
   round. Red items route back by message; the reviewer is not dispatched until
   green.
4. Reviewer: fresh. `blind` — the default — gets the diff and the plan's sections,
   never the builder's report; `checklist` (`sonnet`) gets the diff, the unit's close
   criteria and the checklist core below. A diff that crosses a silent-failure
   carrier (migrations, wire bodies, signatures) is reviewed blind whatever the row
   says. Findings only, `file:line` with a severity, each claim verified before it
   is called a defect. Checklist core: unasked deviation from the plan's tables;
   every seam crossed with a non-degenerate value; the one-way rule (old path
   deleted in the same change); a test weakened to pass; the comment rule; tracking
   references in code; files touched outside the brief.
5. Fix rounds go back to the builder by message: at most two. A round whose diff
   changes no code the full gate exercises — free comments, plan text, formatting,
   docs the gate does not test — runs the repo's fast checks and the enforcement
   script only; the full gate does not re-fire for it. A third means the unit
   is wrong — the orchestrator reads the specific finding, not the diff.
6. Route a reported deviation through Deviations. A pick inside the plan's named
   scope: pick it by CLAUDE.md and the plan's own law, write it into the owning
   section, ripple-check later sections in the same edit, note it for the veto table,
   continue the builder. Anything else stops the run and is posted to the owner.
7. Close the unit — only on its stated close criteria (greps, tests, gate firings),
   never on the builder's say-so; review stays a blind subagent. Fold the unit's
   notes into the plan per the rules, then dispatch the next.
   Strictly serial: one lane, one warm build, no worktrees inside a run, no parallel
   units.
8. A unit whose deliverable is a document or a dataset — nothing compiles, no gate —
   skips the test writer and the gate. Its reviewer checks the deliverable against
   the unit's close criterion as written (a row count against the source's catalog, never
   a sample), and such units run in parallel where the plan says they do. The builder
   records the command or URL its count came from; the reviewer re-runs it and never
   takes the builder's number. Parallel builders write only their files and never run
   git or edit the plan; the orchestrator commits each unit and folds its notes into the plan
   once its reviewer passes.

## Red lines

1. Production data stores are read-only (SELECT / dump) unless the plan explicitly
   pre-authorizes writes. Migrations land as files; production gets them via the
   owner's release flow, never in-run.
2. Frozen scoring sheets are scored exactly as the plan says and never tuned against;
   the working gate must stay green throughout.
3. A probe that fails its bar is reported, not landed — "probed, no landing" with the
   grid in the plan is a completed unit.
4. Never weaken a pin to pass it. A pin changes only because the behavior deliberately
   changed, and the commit says so.
5. Shared external environments are never written. Dangerous exec edges prove
   themselves on fakes and test rigs only; a live deploy or adopt is the owner's call,
   never the run's.
6. A blocked batch operation — a permission classifier refusing a multi-file move —
   is split; still blocked, the blocker is written into the plan and the other units continue. Never
   leave silent divergence behind.

## Close

- Landing the thread's final unit closes the thread in the same sitting, per the
  rules' closing paragraph, after the unit's own close has folded its notes into the thread file.
  Delete the thread's index entry as part of that close; mint any successor the picks
  created via `/todo:new` — its close-moment trigger.
- Whole-run audit when the plan carries one: a `sonnet` writes and runs the script
  from the plan's audit list, no builds.
- Index entries close only on green evidence.
- Final report: PR URLs; the evidence ladder the plan tracks (start → per-unit →
  end); the veto table (question, pick, reason, where written); every reviewer
  finding not fixed and why; units closed "probed, no landing"; remaining reds;
  out-of-run follow-ups named with the component that owns them. A subset run reports
  its units plus what it owes the later ones.
