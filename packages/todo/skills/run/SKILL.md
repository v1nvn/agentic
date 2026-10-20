---
name: run
description: Execute a progress/<plan>.md plan file — build its units with one commit each, review the work, and close the thread when the final unit lands. Use when the user points at a plan file and asks to run it ("run this plan", "run progress/x.md"), fully or a named subset of units.
argument-hint: <plan> [units]
---

Load `/todo:rules` first — the thread shapes this run opens, realigns, and closes live there,
and so do the meanings of thread, unit, group and owed work.

Run a plan file autonomously. The arguments name a plan file path, then optionally the
units to run — ids exactly as the plan names them, or a range like `P7-P11`. No scope
means the whole thread. If the path or a scope id doesn't resolve, stop and say so.

The plan carries the work in the rules' progress-file shape: Goal, the Steps table
(dependency order, close criteria, `model`, `review`, `consult`), and its Plan section —
reading lists, the tactical map, the enforcement inventory, run mechanics, stop rules,
groups, open questions, audit list. This skill carries the loop. Where the plan is
silent, derive from the repo and CLAUDE.md, decide, and write the decision into the
plan — inside the deviation law below.

## Deviations

The run deviates from nothing the plan's text does not already name. A pick outside
that is written down — the options, a recommendation — and the run takes the
recommendation and continues: the pick is said in one line as it is taken, written into
the plan, and listed in the veto table; no pick is ruled silently. What stops the run
and waits: a pick that touches money, names what a caller sees, forces a second
deviation to land, touches a file the plan doesn't name, or would mint, split or merge a
unit, which only the owner does (§Owed work) — a small early deviation compounds into
places the plan never chose. The list is a floor: a big deviation stops for the owner
whether or not the list names it. A plan's `**Run:**` line moves where taking ends and
stopping starts: `ask: all` posts every pick, `standing-pick: all`
takes even money and names. A single mechanical pick inside the plan's named scope
proceeds and is written into the plan. A protected test or snapshot that moves only by a
rename the plan names, with no assertion line and no snapshot value changed otherwise, is
such a pick: the enforcement script proves it and it goes in the veto table. A changed
assertion, or a test deleted beyond the unit's list, stops.

## Owed work

The Steps table is cut before the run. The run never splits, merges or mints a unit —
not the orchestrator, a consult, a reviewer or a builder — because every unit added
mid-run pays a build and a review the plan never priced. What a run finds takes one of
three doors:

1. **A defect against a unit's close criteria** — from a review or a live look, on a
   landed or an in-flight unit — is a finding and takes a fix round (§The loop). The unit
   stays one unit.
2. **A worker that stops mid-unit** — the context ceiling, a stall, a rate limit, a lapsed
   hold — is replaced by a successor on the same unit, from its state file. The unit
   commits once, when the successor stops green.
3. **Anything else** — a live look's new want, a finding outside every unit, a consult's
   discovery, a cut — is owed work: one line each in Current state, posted to the owner
   once per event (one message per look, review or consult). Only the owner turns owed
   work into units, and only the owner re-cuts one — a consult or a builder that finds a
   unit is two deliverables raises a deviation that stops. For a live look the
   orchestrator proposes one unit carrying every want of that look; a unit the owner
   mints is appended to the Steps table and builds after the planned units, in this run.
   What the owner neither mints nor drops stays in Current state until the close.

## Session frame

The session is orchestrator and decision-maker only. It never builds or reviews: it
dispatches, commits, rules, routes findings and passes tiers. Its only long-running
commands are the waits no worker may hold — the pre-flight gate, a gate past four
minutes, a ritual — started in the background. It is the one agent whose cache lasts an
hour, so it is the cheapest place to wait and the dearest place to read: every line it
reads is re-read at each wake. Nothing else falls back to the session — a reproduction
or a script goes to the role that owns it. The owner answers only what §Deviations and
§Owed work post. Every decision is written into the plan as it is made, into the section
the pick affects (Steps, Plan, Design; open findings and owed work in Current state),
never a log section — the veto table lives only in the final report. The plan file, with
its scratch notes and ritual records, is the resume record — a later session picks up
from those alone, with `git log` on the run's branch — every commit names its unit's
id; write no parallel run document. On resume, fold any scratch notes in first, then
continue: the group review re-checks every landed unit.

## Dispatch

A dispatch is one Agent call: a fresh spawn of one of the plugin's two role agents. A
role's file carries its law, so a brief carries only pointers. Never `fork` — a fork copies the
orchestrator's context — and never another agent type.

| role            | does                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `todo:builder`  | builds a group's units in sequence, fires their gates, fixes routed findings |
| `todo:reviewer` | read-only: group review, unit review, design consult, rescue                 |

The tier rides the dispatch. A cell's `model/effort` pair becomes the Agent call's
`model` and `effort` parameters — `sonnet/low` dispatches with `model: "sonnet"`,
`effort: "low"` — and they beat the role file's frontmatter. A blank cell passes
neither, so the role file's defaults decide. The cell is the tier's only source — the
orchestrator never passes its own model or a pick of its own; a different tier is an
owner's ruling, written into the unit's row before the dispatch.

- A `**Run:**` line names the orchestrator model only when the owner launches one other
  than the default; without it, the launching session orchestrates. A session on a
  different model than the line names says so before its first dispatch and continues —
  it cannot switch itself; the owner launched it.
- The `model` cell tiers the unit's build: blank for the role default, a model or a
  `model/effort` pair, or `owner` for a unit the run does not do — it is skipped, its
  dependents stop at it, and the final report lists it as left to the owner. A tier is
  fixed at spawn: consecutive units on one model share a builder, spawned at the highest
  effort among them, and a unit on another model starts a fresh builder.
- The `review` cell is blank — the group review covers the unit — or `unit`: a review of
  this unit alone, passed before the next unit is built. A diff that crosses a seam
  carrier, as the rules define it, gets a unit review whatever the cell says.
- The `consult` cell is blank or `design`: a `todo:reviewer` consult dispatched **beside
  the previous unit's build** — at pre-flight for the first unit, and after the previous
  unit reports when that unit touches this unit's files. A consult not back when its unit
  is due holds that unit. Its brief names the exact open picks; the consult reads the
  code the unit names and recommends a pick for each, and the orchestrator writes them
  into the plan before the builder sees the unit.

The orchestrator may also consult on a question the plan does not mark, one brief per
question, logged in the veto table; the rescue (§The loop) is such a consult. A
`**Run:**` line that names no review — a runbook, a docs sweep checked by `/todo:audit` —
skips the group review.

## Open

1. Read the plan whole, the repo CLAUDE.md sections that bite, and the tracking rules
   (loaded above). When the rules' stamp gate trips on the plan, dispatch one
   `todo:reviewer` at `sonnet/low` to audit it (`/todo:audit <plan>`'s thread scope) before
   any other dispatch, and fold its findings in first.
2. Complete the plan. A plan with no units in its Steps table: stop and say so. A plan
   whose units lack close criteria (testable sentences) is a design, not a runnable
   plan: one `design` consult at pre-flight writes them — plus an enforcement inventory
   (tests that must survive byte-for-byte, forbidden idioms, counts that must never rise,
   checklist lines for what no script can check) — as its report; the orchestrator writes
   the report into the plan's Steps table and Plan section and commits. Nothing builds
   before they exist. Missing reading lists and tactical-map lines are not a design gap:
   the builder derives them and records them for the fold. A design that rests on a live
   measure has the measure run once here, on the cheap proxy; a measure that misses its
   bar reopens the design here, not mid-run.
3. Resolve the scope to an ordered unit list and its groups — the plan's groups, else the
   whole thread as one group.
4. Derive the run mechanics:
   - Gates by construction. The tactical map pins each unit's scoped gate lines — the
     components the unit touches plus their dependents, inside the builder's package
     tree — and the workspace gate line with its ceiling: its minutes as the pre-flight
     gate measured them, rounded up. The builder runs a unit's scoped lines while it
     builds and, for a ceiling of four minutes or under, the workspace gate as the last
     step before each unit's report, in the foreground with the Bash `timeout` set to
     the ceiling: a command the harness moves to the background leaves a subagent
     polling. A ceiling over four minutes outlasts a subagent's cache, so that gate is
     the orchestrator's — started in the background once per group, after its last unit
     commits and before the group review, its red result routed like a blocking finding.
     A firing re-fires only for a stated cause — changed code, or a flake with the
     failure quoted.
   - Any A/B ritual the plan names: record before, record after — both records go to
     `progress/.scratch/<slug>/`, the ritual-record folder the rules keep until the
     thread closes — and land only on the plan's landing rule (e.g. green count up
     with zero green→red); probes tune against a frozen snapshot, never a live
     corpus. Across many inputs, the first input's baseline and log are checked before
     the rest run — an environment failure stops the ritual there. A ritual run already
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
   - PR topology: one PR per group, opened at the group's first commit; by default one
     group, one branch and one PR. Every `gh pr create` names its base explicitly. The run opens PRs; it never
     merges and never pushes to the default branch.
5. Pre-flight picks. For every question the plan defers to the owner: re-verify the
   premise against the tree first — where the code already settled it, the code wins —
   then send it through §Deviations' test. A mechanical pick inside the plan's named
   scope is picked by the plan's own evidence and CLAUDE.md and written into the plan,
   listed in one short message (question, pick, reason) so the owner can interrupt,
   and the run proceeds; anything else follows §Deviations' ruling — taken and said in
   one line, or posted to wait where it touches money or names what a caller sees. A
   question the plan dates to a unit ("ruled at 7") is raised when the run reaches that
   unit, never at pre-flight — the evidence it needs does not exist at launch.
6. Preconditions before the first dispatch: tree clean on the plan's base (the default
   branch when the plan names none) — when the prompt asks for a worktree, the run creates
   one on a new branch off that base and the check applies there; the workspace gate
   green at the start, fired by the orchestrator in the background, its minutes written
   into the tactical map as the gate's ceiling; every unit on another thread the scope is
   gated on has landed there — its closing test is in the tree, or its plan's Steps
   table says so; the environment the scoped units need (cluster, env vars, secrets,
   disk, `gh` auth, quiet neighbors — file watchers, IDE indexers and test-discovery
   runners on the tree, where the machine has them). Any violation: stop and say so.

## Workers

- A group's builder lives across the group's units: it reports at each unit's end —
  green, red, or stopped on a deviation — and at each routed fix's green, never
  mid-unit; the next unit reaches it by message. Every other role is a fresh dispatch per
  job. A worker inherits only its role file and the plan. Its
  private state — notes, state file, gate output — lives in the builder's scratch file
  or a reviewer's report; the fold is the only way a finding outlives its worker, and no
  worker carries another's transcript.
- One builder at a time, no worktrees inside a run, no parallel builds — except
  document and dataset units (§The loop 7). A build overlaps only the next unit's
  read-only prep — its consult, its brief.
- Briefs point at the plan's units and sections, name the files the worker owns, and
  state what "done" means (each unit's close criteria); the message that hands a builder
  its next unit is such a brief. Briefs never paste plan text. A brief that names a
  heavyweight ritual tool pins its full invocation from the plan — filters, jobs,
  timeout, output. Where the plan does not yet pin one, the orchestrator has it derived
  once, writes it into the plan, and every brief thereafter uses that line.
- No worker waits on another worker. A subagent's cache expires after five idle
  minutes, and a resume then re-writes its whole context at about 1.25 times the input
  price, while a cache read costs about a tenth. So a live builder whose next message
  must wait — an owner answer, a background gate, a live look — gets `hold` from the
  orchestrator every four minutes: ten holds cost less than one re-write. After ten
  holds the orchestrator stops; the builder lapses and a successor continues from its
  state file. A builder whose group has no unit left is not held. A worker idle five minutes without a hold is never resumed, any role: its
  next work goes to a successor.
- A builder past the context ceiling (a third of its window, off the last usage entry of
  its transcript) is ended at its report, and a successor continues the group from its
  state file.
- The orchestrator never opens a source file to understand it. It reads reports, gate
  output, `git diff` and `git show` diffs, and the diff classes the plan flags as
  silent-failure carriers (migrations, wire bodies, signatures).
- Round-trips happen only at boundaries; each one wakes the orchestrator and re-reads
  its whole context. While a worker is in flight or a builder is held, the orchestrator
  wakes every four minutes — to check on the worker, or to send the waiting builder its
  hold; with neither, it sets no timer.
  A worker stalled or rate-limited for under five minutes is continued by message; past
  that it is ended and a successor starts from its state file.

## The loop

For each group:

1. **Build.** The builder builds the unit on its scoped gates, fires the workspace gate
   and the enforcement script as the unit's last step (§Open.4), and reports green with
   the tree uncommitted — or reports red with the failing line and its diagnosis,
   which the orchestrator routes like a blocking finding. Where the enforcement inventory names checkables, the group's
   first builder writes the gate script from it once into `progress/.scratch/<slug>/`,
   and every builder after runs it.
2. **Commit.** In the wake of that report the orchestrator commits the unit as one commit
   (one line naming the unit's id, no co-author trailer) and appends to or opens the PR, because auto mode
   refuses a worker's commit. The lockfile, README and docs the gate exercises ride that
   commit; a build split across commits is a deviation. In the same wake it messages the
   builder the next unit — or, when the unit carries a unit review, dispatches that review
   and holds the builder until it passes. A deviation stops its unit, and nothing that
   depends on it lands until the orchestrator answers.
3. **Unit review**, for a unit marked `unit` or crossing a seam carrier. A fresh
   `todo:reviewer` gets the unit's diff, the plan's sections and the gate log in the
   builder's scratch file — never the builder's report. It runs the unit's greps and
   counts with raw output, takes a criterion a test proves from that gate log, and runs
   no build or test suite, because the builder's gate already paid for that run. A
   `blocking` finding goes by message to the held builder, which fixes it, fires the gate
   and reports the fix green; the orchestrator commits the fix naming the unit's id,
   has it re-reviewed once (step 5), and then messages the next unit. With no builder
   live, the fix goes to a fresh builder and commits on a green gate.
   A report naming a process its builder could not stop holds the next dispatch until
   that process is stopped.
4. **Group review.** When the group's last unit is committed and its gate is green, one
   fresh `todo:reviewer` reviews the group's whole diff on the same terms — every unit's
   close criteria from the gate logs, the core checks, and what the units do together
   that no single unit shows.
5. **Fix round.** Every `blocking` finding of the group review, with its `nit` findings,
   goes to one fresh builder in one brief, at the highest tier among the faulted units;
   the orchestrator commits the round as one commit on a green gate. A fix to a finding
   on a unit that carries a unit review is re-reviewed once, by a fresh reviewer over the
   fix diff; every other fix stands on its gate. A group review with no blocking finding
   runs no round: its nits go to the final report. A finding still open after its
   re-review, or a round whose gate stays red, means the unit is wrong: the orchestrator
   reads the specific finding, not the diff, and may take the rescue — a reviewer consult
   that diagnoses the failure — then routes the diagnosis to a fresh builder at the tier
   the consult recommends; said in one line and listed in the veto table. One rescue per
   finding: a finding still open after it stops the run and goes to the owner.
6. **Close the units** — each only on its stated close criteria (greps, tests, gate
   firings), as its reviews reported them, never on the builder's say-so — once no open
   blocking finding remains and every fix is committed on a green gate. Route each
   deviation a builder reported through §Deviations: a pick inside the plan's named
   scope is written into the owning section with later sections ripple-checked in the
   same edit; what stops the run goes to the owner with the builder's questions and the
   reviewer's in one message. A question that touches money or would mint a unit is
   posted only after a read-only trace of the code it rests on, so every option it offers
   is buildable. Fold the group's scratch into the plan per the rules — what later groups
   need into their units, what the tactical map lacks into the map, the fix entries —
   and delete the scratch.
7. **Document and dataset units** — nothing compiles, no gate — are the one exception to
   one builder and one review per group: each gets its own builder, skips the gate, and
   gets its own review at `sonnet/low` — none under a `**Run:**` line that names no
   review — because its check is re-running a count against its source. Its
   reviewer checks the deliverable against the unit's close criterion as written (a row
   count against the source's catalog, never a sample); such units run in parallel where
   the plan says they do. The builder records the command or URL its count came from;
   the reviewer re-runs it and never takes the builder's number. Parallel builders write
   only their files and never run git or edit the plan; the orchestrator commits each
   unit and folds its notes into the plan once its reviewer passes. Such a unit may
   measure built code from a landed commit, on resources of its own the plan names,
   beside the next build: its row holds the match criterion, a mismatch is a blocking
   finding against the measured unit, and its reviewer re-runs the source side only.

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
6. A multi-file operation a permission classifier refuses is re-issued as smaller
   commands; still refused, the blocker is written into the plan and the other units
   continue. Never leave silent divergence behind.

## Close

When a group's last unit closes, or the run's scope ends inside a group: write each
landed unit's commit into its row, then archive what
landed — every landed unit of the group, this run's and any the group landed earlier;
its open units stay — and the plan text only those units used (tactical-map entries,
inventory items, rulings) append verbatim to `archive/<slug>.md`, created when absent,
under the group's heading — a group already headed there continues under it — and leave
the live file, which keeps only open work. One commit, before the PR is marked ready.
Skipped when the group holds the thread's final unit: the thread's close appends the
whole file.

At the run's end:

- Landing the thread's final unit closes the thread in the same sitting, per the
  rules' closing paragraph, after the group's fold. Delete the thread's index entry as
  part of that close. Before it, post the owed work still in Current state to the
  owner once: what the owner keeps is minted via `/todo:new` as the thread's successor,
  and the rest drops with the file.
- Whole-run audit when the plan carries one: a builder writes and runs the script from
  the plan's audit list, no builds.
- Index entries close only on green evidence.
- Final report: PR URLs; the evidence ladder the plan tracks (start → per-unit →
  end); the veto table (question, pick, reason, where written); every finding not fixed
  and why, nits included; owed work; units closed "probed, no landing"; remaining reds;
  late findings — for each blocking finding, whether a later unit had already built on
  the faulted unit; out-of-run follow-ups named with the component that owns them. A
  subset run reports its units plus what it owes the later ones.
