---
name: run
description: Execute a progress/<plan>.md plan file unit by unit — fresh builder and reviewer subagents per unit, the next unit building while the last is reviewed, each unit closed on its stated criteria, one commit per unit; landing the final unit closes the thread in the same sitting. Use when the user points at a plan file and asks to run it, fully or a named subset of units.
argument-hint: <plan> [units]
---

Load `/todo:rules` first — the thread shapes this run opens, realigns, and closes live there.

Run a plan file autonomously. The arguments name a plan file path, then optionally the
units to run — ids exactly as the plan names them (phase, step, block, unit), or a range like
`P7-P11`. No scope means the whole thread. If the path or a scope id doesn't resolve,
stop and say so.

The plan carries the work in the rules' progress-file shape: Goal, the Steps unit table
(dependency order, close criteria, `model`, `review`, `consult`), and its Plan section —
reading lists, the tactical map, the enforcement inventory, run mechanics, stop rules,
PR grouping, open questions, audit list. This skill carries the loop. Where the plan is
silent, derive from the repo and CLAUDE.md, decide, and write the decision into the
plan — inside the deviation law below.

## Deviations

The run deviates from nothing the plan's text does not already name. A pick outside
that is written as a ruling — the options, a recommendation — and the run takes the
recommendation and continues: the pick is said in one line as it is taken, written into
the plan, and listed in the veto table; no pick is ruled silently. What stops the run
and waits: a pick that touches money, names what a caller sees, forces a second
deviation to land, touches a file the plan doesn't name, or mints or splits a unit —
a small early deviation compounds into places the plan never chose. The list is a
floor: a big deviation stops for the owner whether or not the list names it.
A plan's `**Run:**` line moves
the split: `ask: all` posts every pick, `standing-pick: all` takes even money and names. A single mechanical pick inside the
plan's named scope proceeds and is written into the plan. A protected test or snapshot that
moves only by a rename the plan names, with no assertion line and no snapshot value changed
otherwise, is such a pick: the enforcement script proves it and it goes in the veto table. A
changed assertion, or a test deleted beyond the row's list, stops.

## Session frame

The session is orchestrator and decision-maker only. It never builds or reviews: it
dispatches, commits, rules, routes findings and passes tiers. Its only long-running
commands are the waits no worker may hold — the pre-flight gate, a gate past four minutes, a ritual —
started in the background. It is the one agent whose cache lasts an hour, so it is the
cheapest place to wait and the dearest place to read: every line it reads is re-read
at each wake. Nothing else falls back to the session — a reproduction or a script goes
to the role that owns it. The owner
answers only what §Deviations posts. Every decision is written into the plan as it is
made, into the section the pick affects (Steps, Plan, Design; open reviewer findings in
Current state), never a log section — the veto table lives only in the final report.
The plan file, with its scratch notes and ritual records, is the resume record — a
later session picks up from those alone; write no parallel run document. On resume,
fold any scratch notes in first, then have a reviewer re-check the last landed unit's
close criteria (a resume check, not a re-review; its row is in the live file or, once
its group landed, in `archive/<slug>.md`) instead of trusting its row.

## Dispatch

Every worker is a spawn of one of the plugin's two role agents. A role's file carries
its law, so a brief carries only pointers. Never `fork` — a fork copies the
orchestrator's context — and never another agent type.

| role            | does                                                                              |
| --------------- | --------------------------------------------------------------------------------- |
| `todo:builder`  | builds a unit tests-first, fires its gates, fixes routed findings, writes scripts |
| `todo:reviewer` | read-only: blind review with close-criteria checks, slice review, consult, rescue |

The tier rides the dispatch. A cell's `model/effort` pair becomes the Agent call's
`model` and `effort` parameters — `sonnet/low` dispatches with `model: "sonnet"`,
`effort: "low"` — and they beat the role file's frontmatter. A blank cell passes
neither, so the role file's defaults decide. The cell is the tier's only source — the
orchestrator never passes its own model or a pick of its own; a different tier is an
owner ruling, written into the row before the dispatch.

- A `**Run:**` line names the orchestrator model only when the owner launches one other
  than the default; without it, the launching session orchestrates. A session on a
  different model than the line names says so before its first dispatch and continues —
  it cannot switch itself; the owner launched it.
- The `model` cell tiers the unit's builder: blank for the role default, a model or a
  `model/effort` pair (`sonnet/low`), or `owner` for a unit the run does not do — it is
  skipped, its dependents stop at it, and the final report lists it as owed.
- The `review` cell tiers the unit's blind reviewer: blank for the role default, a
  `model/effort` pair, or `none`. A pair or `none` holds only when the plan's Plan
  section names why the unit is low-risk, and `none` is listed in the pre-flight picks
  and the final veto table. A diff that crosses a silent-failure carrier (migrations,
  wire bodies, signatures) is reviewed at the role default whatever the cell says.
- The `consult` cell marks `todo:reviewer` consults, comma-separated, each at the tier
  the plan names for it, else the role default:
  - `design` or `split` — dispatched **beside the previous unit's build**, so it never
    holds a dispatch, on a row that leaves design open or may pass the size signal —
    after that build reports when it touches the row's files, at pre-flight for the
    first unit; a consult not back when its unit is due holds that dispatch. Its
    brief names the exact open picks; the consult reads the code the row names and
    rules those picks and the split, and the orchestrator writes them into the row
    before the builder sees it. A consult that must read widely to find its questions
    marks a plan that was not hardened;
  - `review` — **a slice review** beside the unit's blind review, over only the diff the
    plan marks high-stakes (its silent-failure carriers, money).

  The orchestrator may also consult on a question the plan does not mark, one brief per
  question, logged in the veto table; the rescue (§Per-unit loop) is such a consult.

## Open

1. Read the plan whole, the repo CLAUDE.md sections that bite, and the tracking rules
   (loaded above).
2. Harden if needed. A plan without per-unit close criteria (testable sentences), reading
   lists and the tactical map is a design, not a runnable plan: the first unit is a
   docs-only hardening unit that writes them — plus an enforcement inventory (tests that
   must survive byte-for-byte, forbidden idioms, counts that must never rise, checklist
   lines for what no script can check) and the
   small-row line — into the plan's Steps table and Plan section, and commits. Nothing
   builds before they exist. A design that rests on a live measure has the measure run
   once at hardening, on the cheap proxy; a measure that misses its bar reopens the
   design here, not mid-run.
3. Resolve the scope to an ordered unit list. A row that carries unrelated risks — a
   coverage change beside a money change — is split at hardening. The orchestrator reads
   no source, so it never guesses a row's size: a row the plan marks `split` takes its
   consult beside the previous unit's build; for any other, the size signal organizes its review and
   stops nothing.
   Small work is one dispatch. The rows the plan's `Small rows:` line names — a row
   qualifies only when it leaves no design freedom (deletions, renames, doc fixes, swaps
   to a named target), and nothing money-touching or design-bearing ever does — batch
   into one builder dispatch per thread or PR group. The brief points at all of them; the
   builder works them in sequence on their scoped gates, records each row's files, and
   fires one workspace gate at the batch's end; the orchestrator commits row by row
   from those file lists, and rows sharing a file land in one commit naming both ids.
   Then one blind review over the whole batch diff checks every row's close criteria.
   The pipeline count scales with risk, not with unit count.
4. Derive the run mechanics:
   - Gates by construction. The tactical map pins each row's scoped gate lines — the
     components the row touches plus their dependents, inside the builder's package
     tree — and the workspace gate line with its ceiling: its minutes as the pre-flight
     gate measured them, rounded up. The builder runs the scoped lines while it builds
     and, for a ceiling of four minutes or under, the workspace gate once as its last
     step, in the foreground with the Bash `timeout` set to the ceiling: a command the
     harness moves to the background leaves a subagent polling. A ceiling over four
     minutes outlasts a subagent's cache, so that gate is the orchestrator's — started
     in the background once the builder stops, its red result routed like a blocking
     finding.
     A batch fires it once at its end, and the row commits that follow that green fire
     nothing more. A firing re-fires only for a stated cause — changed code, or a flake
     with the failure quoted.
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
     poll. While a ritual holds a resource the gate needs, each active brief names the
     gate the resource permits and defers one workspace-gate firing to the ritual's end.
     A builder writes the ritual's script and reconciles its output. A unit held on an
     owner ruling runs its after pass on the held tree meanwhile; the ruling re-runs only
     the inputs its change touches. A ritual blocks only marking the PR ready for
     review — never a commit, a push or a dispatch.
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
   one on a new branch off that base and the check applies there; the workspace gate
   green at the start, fired by the orchestrator in the background, its minutes written into the tactical map as the gate's ceiling; every unit on another thread the scope is
   gated on has landed there — its closing test is in the tree, or its plan's Steps
   table says so; the environment the scoped units need (cluster, env vars, secrets,
   disk, `gh` auth, quiet neighbors — file watchers, IDE indexers and test-discovery
   runners on the tree, where the machine has them). Any violation: stop and say so.

## Workers

- Fresh spawns per unit, every role. A worker inherits only the common base: its role
  file and the plan. Everything unit-private — notes, state file, gate output — lives in
  the builder's per-worker scratch file, a reviewer's in its report, and dies when the
  unit closes; the fold is the only way a finding outlives its worker. No worker lives
  past its unit except to take a routed finding while still building, and none carries
  another's transcript.
- One builder at a time, no worktrees inside a run, no parallel builds — except
  document and dataset units (§Per-unit loop 8). A unit's build overlaps only the
  previous unit's review and the next unit's read-only prep — its trace, its consult,
  its brief.
- Briefs point at the plan's row and sections, name the files the worker owns, and state
  what "done" means (the unit's close criteria). Briefs never paste plan text. A brief
  that names a heavyweight ritual tool pins its full invocation from the plan — filters,
  jobs, timeout, output. Where the plan does not yet pin one, the orchestrator has it
  derived once, writes it into the plan, and every brief thereafter uses that line.
- No worker ever waits — not on a gate, a review or a reply — and no worker idle five
  minutes is resumed, any role: a subagent's cache expires after five idle minutes, so
  a resume re-writes its whole context at the write rate. Its next work goes to a live
  worker or a successor. A builder past the context ceiling (a third of its window, off
  the last usage entry of its transcript) is ended at its report and a successor
  continues from its state file.
- The orchestrator never opens a source file to understand it. It reads reports, gate
  output, `git diff` and `git show` diffs, and the diff classes the plan flags as
  silent-failure carriers (migrations, wire bodies, signatures).
- Round-trips happen only at boundaries; each one wakes the orchestrator and re-reads
  its whole context. A builder reports once — when it stops green, or on a
  deviation — never with mid-build progress. While a worker is in flight, the
  orchestrator checks on it every five minutes; with none in flight, it sets no timer.
- A worker stalled or rate-limited for under five minutes is continued by message;
  past five idle minutes it is ended and a successor starts from its state file.

## Per-unit loop

1. The builder writes the unit's tests red first, builds on the row's scoped gates,
   fires the workspace gate and the enforcement script as its last step (§Open.4), and
   stops green with the tree uncommitted. Where the enforcement inventory names
   checkables, the first builder writes the gate script from it once into
   `progress/.scratch/<slug>/`, and every builder after runs it.
2. On green the orchestrator commits the build as one commit (one line, no co-author
   trailer) and appends to or opens the PR, because auto mode refuses a worker's
   commit. The lockfile, README and docs the gate exercises ride that commit; a build
   split across commits is a deviation. A deviation stops its item, not the builder,
   and nothing that depends on it lands until the orchestrator answers.
3. In the same wake it dispatches the unit's blind reviewer and the next unit's
   builder: the next unit builds on the committed one while it is reviewed. The
   reviewer is a fresh `todo:reviewer` — the diff, the plan's sections and the gate
   log in the builder's scratch file, never the builder's report — at the tier the `review` cell names, plus a slice review where
   the `consult` cell names `review`. It checks the row's close criteria with raw
   output, and tags each finding `blocking` or `nit`. A report naming a process its
   builder could not stop holds the next dispatch until that process is stopped.
4. A `blocking` finding goes by message to the live builder — a builder is live from
   dispatch until it reports; usually the next unit's, mid-build — which fixes it
   before its own gate and records the fix's files under the finding, so the
   orchestrator commits the fix apart from its unit. A reported builder is never
   messaged again. Where the next
   unit builds on the faulted code, its dependent items wait for the fix. With no
   builder live, the finding leads the next builder's brief; after the last unit it
   goes to one fresh builder, whose fix the run commits on a
   green gate. Never hold a builder alive to await
   its own review. The review that follows names the fix commit in its brief, so it
   diffs the fix too; no fix is re-reviewed on its own. `nit` findings are written into the plan's Current state and wait for the
   nit sweep at the end of their PR group (§Close).
5. A blocking finding that following review still finds open means the unit is wrong: the
   orchestrator reads the specific finding, not the diff, and may take the rescue — a
   reviewer consult that diagnoses the failure — then routes the diagnosis to the live
   builder or a fresh one, at the tier the consult recommends and the orchestrator
   picks; said in one line and listed in the veto table.
6. Route a reported deviation through §Deviations: a pick inside the plan's named
   scope is written into the owning section with later sections ripple-checked in the
   same edit, and the builder continues. What stops the run goes to the owner with the
   builder's questions and the reviewer's in one message. A question that touches money or would mint a unit is posted only after a
   read-only trace of the code it rests on, so every option it offers is buildable.
7. Close the unit — only on its stated close criteria (greps, tests, gate firings), as
   its reviewer reported them, never on the builder's say-so — once its review holds
   no open blocking finding and any fix is committed on a green gate. Fold the unit's
   scratch into the plan per the rules — what later units need into their rows, what
   the tactical map lacks into the map, its fix entries from the builder that took
   them — and delete the scratch. A finding shape an earlier unit's review already
   raised goes into the enforcement inventory in the same fold — as a checkable the
   next builder adds to the gate script before its gate, else as a checklist line —
   so the next build is checked for it before review. A finding outside the
   unit's row does not hold the unit: the unit commits on its row, and the finding lands
   as its own commit after its ruling.
8. A unit whose deliverable is a document or a dataset — nothing compiles, no gate —
   skips the gate. Its reviewer checks the deliverable against
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

When a PR group's last unit closes, or the run's scope ends inside a group:

- Nit sweep, skipped when none are queued: one fresh builder at the role default
  takes every `nit` queued in Current state, fires the workspace gate per §Open.4, and
  stops green; the orchestrator commits and removes the swept nits from Current state.
  One fresh reviewer at the role default reviews only the sweep's diff — a sweep across many files breaks things the
  gate cannot see. Its blocking findings take one round from a fresh builder,
  committed on a green gate; its nits go to the final report, never to another sweep.
- Archive what landed: every landed row of the group — this run's and any the group
  landed earlier; its open rows stay — and the plan text only those rows used
  (tactical-map entries, inventory items, rulings) append verbatim to
  `archive/<slug>.md`, created when absent, under the group's heading — a group
  already headed there continues under it — and leave the live file, which keeps only
  open work. One commit, before the PR is marked ready. Skipped when the group holds
  the thread's final unit: the thread's close appends the whole file.

At the run's end:

- Landing the thread's final unit closes the thread in the same sitting, per the
  rules' closing paragraph, after the unit's own close has folded its notes into the thread file.
  Delete the thread's index entry as part of that close; mint any successor the picks
  created via `/todo:new` — its close-moment trigger.
- Whole-run audit when the plan carries one: a builder writes and runs the script from
  the plan's audit list, no builds.
- Index entries close only on green evidence.
- Final report: PR URLs; the evidence ladder the plan tracks (start → per-unit →
  end); the veto table (question, pick, reason,
  where written); every reviewer finding not fixed and why; units closed "probed, no
  landing"; remaining reds; out-of-run follow-ups named with the component that owns
  them. A subset run reports its units plus what it owes the later ones.
