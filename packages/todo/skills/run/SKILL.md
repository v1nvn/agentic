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
lists, the enforcement inventory, run mechanics, stop rules, PR grouping, open
questions, audit list. This skill carries the loop. Where the plan is silent, derive from the repo and CLAUDE.md,
decide, and write the decision into the plan — inside the deviation law below.

## Deviations

The run deviates from nothing the plan's text does not already name. A pick outside
that is written as a ruling — the options, a recommendation — and the run takes the
recommendation and continues: the pick is said in one line as it is taken, written into
the plan, and listed in the veto table; no pick is ruled silently. What stops the run
and waits: a pick that touches money, names what a caller sees, forces a second
deviation to land, touches a file the plan doesn't name, or mints or splits a unit —
except a builder's split at the line ceiling (§Workers), which proceeds; a small early
deviation compounds into places the plan never chose. A plan's `**Run:**` line moves
the split: `ask: all` posts every pick, `standing-pick: all` takes even money and names. A single mechanical pick inside
the plan's named scope proceeds and is written into the plan. A protected test or snapshot that
moves only by a rename the plan names, with no assertion line and no snapshot value changed
otherwise, is such a pick: the enforcement script proves it and it goes in the veto table. A
changed assertion, or a test deleted beyond the row's list, stops.

## Session frame

The session is orchestrator, verifier and decision-maker only. The owner answers
only what §Deviations posts. Every decision is written into the plan as it is made,
into the section the pick affects (Steps, Plan, Design; open reviewer findings in
Current state), never a log section — the veto table lives only in the final report.
The plan file, with its scratch notes and ritual records, is the resume record — a
later session picks up from those alone; write no parallel run document. On resume,
fold any scratch notes in first, then re-run the last landed unit's close criteria
instead of trusting its row.

## Models

The plan names its models; this skill's defaults are the fallback.

- A `**Run:**` line names the orchestrator model only when the owner launches one other
  than the default; without it, the launching session orchestrates. A session on a
  different model than the line names says so before its first dispatch and continues —
  it cannot switch itself; the owner launched it.
- A `model` column on the Steps table names that unit's builder: blank for the default,
  `sonnet` for a row the plan marks mechanical (renames, deletions with named
  replacements, doc sweeps) — its edits land in that unit's one commit, never their own —
  or `owner` for a unit the run does not do: it is skipped, its dependents stop at it,
  and the final report lists it as owed. The reviewer and test writer take the default
  whatever the cell says — a review reads a diff against the plan, it does not re-do the
  build. fable never builds: a builder's bill is cache
  fees on its own context, every gate past five minutes re-writes it, and fable's cache
  rates price the same build at multiples of opus's. A cell naming fable is out of shape
  and hardening rewrites it to blank, posting the rewrite.
- A `review` column tiers the reviewer: `blind` (the default), `checklist` (`sonnet`,
  the unit's close criteria and the loop's checklist core), or `none` — which the plan
  must justify in the pre-flight picks and the final veto table.
- **Consult:** fable, read-only, one brief and one answer — it runs no build and no gate,
  so it never idles past its cache. It reaches a unit three ways:
  - **before dispatch**, on a row that leaves design open or will pass the line ceiling:
    it reads the code the row names, rules the open picks and the split, and the
    orchestrator writes them into the row before the builder sees it;
  - **as a slice reviewer**, beside the unit's blind reviewer, over only the diff the
    plan marks high-stakes (its silent-failure carriers, money) — a review that
    re-runs gates over a whole diff idles past the cache at fable's rates, so the
    rest of the diff stays with the default reviewer;
  - **the rescue** — once a unit's fix rounds are burned on the default, the
    orchestrator may re-dispatch it to fable once, posting the pick.
    The plan marks a row's consults in a `consult` column (`design`, `split`, `review`,
    comma-separated); the orchestrator may also consult on a question the plan does not
    mark, one brief per question, logged in the veto table.
- Defaults: judgment roles (orchestrating, hardening, test-writing, building, reviewing,
  fixing) are `opus`; extraction, scripts, re-measures, audits and web enumeration are
  `sonnet`.

## Open

1. Read the plan whole, the repo CLAUDE.md sections that bite, and the tracking rules
   (loaded above).
2. Harden if needed. A plan without per-unit close criteria (testable sentences) and
   reading lists is a design, not a runnable plan: the first unit is a docs-only
   hardening unit that writes them — plus an enforcement inventory (tests that must
   survive byte-for-byte, forbidden idioms, counts that must never rise) — into the
   plan's Steps table and Plan section, and commits. Nothing builds before they exist.
   A design that rests on a live measure has the measure run once at hardening, on the
   cheap proxy; a measure that misses its bar reopens the design here, not mid-run.
3. Resolve the scope to an ordered unit list. Steps the plan marks trivial may bundle
   into one unit with one-line commits each. A row that carries unrelated risks — a coverage
   change beside a money change — is split at hardening. The orchestrator reads no source, so
   it never guesses a row's size: a row the plan marks `split` takes its consult before
   dispatch, and for any other the line ceiling is a stop inside the build.
4. Derive the run mechanics:
   - Gate command(s) from the repo (type-check/lint/test/build, or a workspace-wide
     gate). Each unit's row may name its gate scope — the components it touches plus
     their dependents; a row that names none takes the repo's whole gate, and the whole
     gate runs at the group boundary either way. The full gate fires immediately before
     a commit that changes code it exercises, and the unit's scratch notes name every firing and
     what it answered; a firing that answered nothing is a deviation. A firing's log
     answers every later question about it — re-running a suite to re-shape its output
     is a firing that answered nothing, and a green full gate re-fires only for a
     stated cause: a flake with the failure quoted, or changed code. Iteration inside
     a unit uses scoped commands only. Where builds are slow, ration every run to the
     narrowest scope that answers the question.
   - Any A/B ritual the plan names: record before, record after — both records go to
     `progress/.scratch/<slug>/`, the ritual-record folder the rules keep until the
     thread closes — and land only on the plan's landing rule (e.g. green count up
     with zero green→red); probes tune against a frozen snapshot, never a live
     corpus. In a batch, the first item's baseline and log are checked before the
     rest run — an environment failure stops the batch there. A ritual run already
     recorded for the same input and invocation is not re-paid — the input is the file's
     git blob where the ritual runs per file, else the revision; a re-run is
     ordered only when the recorded run's log shows environment failure — an
     anomalous verdict with a clean log is a finding, not a re-run.
   - A ritual command longer than a few minutes is started by the orchestrator in the
     background, and its exit notifies it: a subagent is not woken by its own background
     command, and a sleep loop past five minutes re-writes the poller's whole cache each
     poll. No worker polls with `sleep`, and no worker backgrounds a command — what it
     cannot wait out in the foreground belongs to the orchestrator. While a ritual holds a resource the gate needs,
   each active brief names the gate the resource permits and defers one full-gate
   firing to the ritual's end. A `sonnet` writes the ritual's script and
     reconciles its output. A unit held on an owner ruling runs its after pass on the
     held tree meanwhile; the ruling re-runs only the inputs its change touches. A ritual
     blocks only marking the PR ready for review — never a commit, a push or a dispatch.
   - PR topology from the plan's grouping; default one branch and one PR at the end.
     Every `gh pr create` names its base explicitly. The run opens PRs; it never
     merges and never pushes to the default branch.
5. Pre-flight picks. For every question the plan defers to the owner: re-verify the
   premise against the tree first — where the code already settled it, the code wins —
   then send it through §Deviations' test. A mechanical pick inside the plan's named
   scope is picked by the plan's own evidence and CLAUDE.md and written into the plan,
   listed in one short message (question, pick, reason) so the owner can interrupt,
   and the run proceeds; anything else follows §Deviations' ruling — taken and said in
   one line, or posted to wait where it touches money or names what a caller sees. A question the
   plan dates to a unit ("ruled at 7") is raised when the run reaches that unit,
   never at pre-flight — the evidence it needs does not exist at launch.
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
  notes and veto-table rows, and at every builder report reads the builder's context
  size off its transcript's last usage entry. It pastes raw command
  output, never a summary of it, and decides nothing — a drafted line lands only when
  the orchestrator accepts it, or untouched where the run pre-authorized its template.
- Fresh agent per unit per role. Briefs point at the plan's section or row, name the
  files the worker owns, and state what "done" means (the unit's verify clause).
  Briefs never paste plan text. A brief that names a heavyweight ritual tool pins
  its full invocation from the plan — filters, jobs, timeout, output; a worker never
  explores a tool's options by trial runs. Where the plan does not yet pin one, the
  orchestrator derives it once, writes it into the plan, and every brief thereafter
  uses that line.
- Workers read only their reading list and keep their context small. A builder the
  clerk reads past the context ceiling (a third of its window) is ended at that report
  and a successor continues from its state file: a subagent's cache expires after five
  idle minutes, so one long gate re-writes the whole context at the write rate, and
  compaction would pay the same bill invisibly. For the same reason a builder idle past
  five minutes is not resumed: its next round goes to a successor. The builder keeps that
  state file current — the step it has entered — so a successor resumes cold.
- The line ceiling counts inserted lines only: deletions, snapshots and moves git detects are
  free (`git diff --shortstat -M -- ':!*.snap'`). A builder past it stops at the next green
  point, saves the full patch, and splits along the row's own clauses: each half gates green
  alone and adds no bridge code, and the first keeps no path the second deletes unless that
  path is already in the tree, because a split that needs a bridge lands two paths. The split is
  written into the plan and reported. With no such split — a rename, a rework that deletes the
  old path — the unit lands whole and the report says why.
- Workers report in a fixed format under ~20 lines: diff stat, gate tail,
  per-criterion proof, A/B verdict where the unit calls for one, deviations, surprises.
- The orchestrator never opens a source file to understand it. It reads reports, gate
  output, `git diff` and `git show` diffs, and the diff classes the plan flags as silent-failure
  carriers (migrations, wire bodies, signatures) — and may re-run anything to
  reproduce a finding.
- A worker stops only the processes it started, by the PID it recorded — never a
  pattern kill, which takes down a ritual's processes on the same machine.
- A stalled or rate-limited worker is continued by message, never replaced. A
  successor starts from the worker's state file, and only once the original is gone.

## Per-unit loop

1. Test writer first where the plan names the unit's tests: writes them red, commits
   nothing, reports test names and files; the builder may not edit them. Where the
   plan doesn't name tests, red-first rides in the builder's brief.
2. Builder builds compiler/test-driven on the named files, writes no bridge code,
   leaves protected tests untouched but for a rename §Deviations admits, runs the full
   gate once, writes its unit's notes to its
   per-worker scratch file under `progress/.scratch/`, writes what it learned into the
   sections of later units that owe it, and stops green with the tree uncommitted. The
   orchestrator commits (one line, no co-author trailer) and appends to or opens the PR,
   because auto mode refuses a worker's commit. A deviation stops its item, not the
   builder: it reports the finding and the options, continues every item that does not
   depend on the answer, and nothing lands until the orchestrator answers.
3. Where the enforcement inventory names checkables, a `sonnet` writes a scratchpad
   gate script from it (protected-test hashes, forbidden-idiom count deltas,
   comment-line delta, line ceilings); the clerk runs it after every commit and fix
   round. Red items route back by message; the reviewer is not dispatched until
   green.
4. Reviewer: fresh. `blind` — the default — gets the diff and the plan's sections,
   never the builder's report; `checklist` (`sonnet`) gets the diff, the unit's close
   criteria and the checklist core below. A diff that crosses a silent-failure
   carrier (migrations, wire bodies, signatures) is reviewed blind whatever the row
   says. A row whose `consult` names `review` also takes a fable slice reviewer over the
   diff the plan marks high-stakes (§Models). Findings only, `file:line` with a severity,
   each claim verified before it is called a defect. Checklist core: unasked deviation
   from the plan's tables; every seam crossed with a non-degenerate value; the one-way
   rule (old path deleted in the same change); a test weakened to pass; the comment rule; tracking
   references in code; files touched outside the brief.
5. Fix rounds go back to the builder by message, or to its successor under §Workers' idle
   rule: at most two. A round whose diff
   changes no code the full gate exercises — free comments, plan text, formatting,
   docs the gate does not test — runs the repo's fast checks and the enforcement
   script only; the full gate does not re-fire for it. A third means the unit
   is wrong — the orchestrator reads the specific finding, not the diff, and may
   take §Models' fable rescue from there. A fix round is verified by one re-review
   scoped to that round's findings; a re-review opens no new question — what it finds
   is a pick under §Deviations, or stops the run.
6. Route a reported deviation through Deviations. A pick inside the plan's named
   scope: pick it by CLAUDE.md and the plan's own law, write it into the owning
   section, ripple-check later sections in the same edit, note it for the veto table,
   continue the builder. Anything else follows §Deviations' ruling — taken and said in
   one line unless it touches money or names what a caller sees; those stop the run
   and are posted to the owner. The
   reviewer is dispatched when the builder stops after its build, so every question the
   unit holds — the builder's and the reviewer's — goes to the owner in one message. A
   question that touches money or would mint a unit is posted only after a read-only
   trace of the code it rests on, so every option it offers is buildable.
7. Close the unit — only on its stated close criteria (greps, tests, gate firings),
   never on the builder's say-so; review stays a blind subagent. Fold the unit's
   notes into the plan per the rules, then dispatch the next. A finding outside the unit's
   row does not hold the unit: the unit commits on its row, and the finding lands as its
   own commit after its ruling.
   Strictly serial: one lane, one warm build, no worktrees inside a run, no parallel
   units. Read-only prep for the next unit — its trace, its before pass, its brief — runs
   beside the current one; its build does not.
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
  end); the veto table (question, pick, reason,
  where written); every reviewer finding not fixed and why; units closed "probed, no
  landing"; remaining reds; out-of-run follow-ups named with the component that owns
  them. A subset run reports its units plus what it owes the later ones.
