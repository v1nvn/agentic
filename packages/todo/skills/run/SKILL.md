---
name: run
description: Execute a progress/<slug>.md thread file — build its units with one commit each, review the work, and close the thread when the final unit lands. Use when the user points at a thread file and asks to run it ("run progress/x.md"), fully or a named subset of units.
argument-hint: <thread> [units]
---

Load `/todo:rules` first — the thread shapes this run opens, realigns, and closes live there,
and so do the meanings of thread, unit, group, owed work and the table's cells.

Run a thread file autonomously. The arguments name a thread file path, then optionally the
units to run — ids exactly as the thread file names them, or a range like `P7-P11`. No scope
means the whole thread. If the path or a scope id doesn't resolve, stop and say so.

The thread file carries the work in the rules' shape; this skill carries the loop. Where
the thread file is silent, derive from the repo and CLAUDE.md, decide, and write the
decision into it — inside the deviation law below.

## Deviations

Every pick the thread file's text does not name is either taken or stopped on. A pick is
written down — the options, a recommendation — and the run takes the recommendation and
continues: the pick is said in one line as it is taken, written into the thread file, and
listed in the veto table; no pick is ruled silently. A protected test or snapshot that
moves only by a rename the thread file names (no assertion line or snapshot value
otherwise changed) is a taken pick: the enforcement script proves it and the veto table
lists it. A changed assertion, or a test deleted beyond the unit's list, stops.

What stops the run and waits: a pick that touches money, names what a caller sees, forces
a second deviation to land, touches a file the thread file doesn't name, or would mint,
split or merge a unit, which only the owner does (§Owed work) — a small early deviation
compounds into places the thread file never chose. The list is a floor: a big deviation
stops for the owner too. A `**Run:**` line moves where taking ends and stopping starts:
`ask: all` posts every pick, `standing-pick: all` takes even money and names.

## Owed work

The Steps table is cut before the run, and only the owner mints a unit: every unit added
mid-run pays a build and a review the thread file never priced. A consult or a builder
that finds a unit is two deliverables raises a deviation that stops. What a run finds
takes one of three routes:

1. **A defect against a unit's close criteria** — from a review or a live look, on a
   landed or an in-flight unit — is a finding and takes a fix round (§The loop). The unit
   stays one unit.
2. **A worker that stops mid-unit** is replaced (§Workers). The unit commits once, when
   the replacement stops green.
3. **Anything else** — a live look's new want, a finding outside every unit, a consult's
   discovery, a cut — is owed work: one line each in Current state, posted to the owner
   once per event (one message per look, review or consult). For a live look the
   orchestrator proposes one unit carrying every want of that look; a unit the owner
   mints is appended to the Steps table and builds after the planned units, in this run.
   What the owner neither mints nor drops stays in Current state until the close.

## Session frame

The session is orchestrator and decision-maker only. It never builds or reviews: it
dispatches, commits, rules, routes findings and passes tiers. Its only long-running
commands are the waits no worker may hold — the pre-flight gate, a gate past four
minutes, a ritual — started in the background. It is the one agent whose cache lasts an
hour, so it is the cheapest place to wait and the dearest place to read, every line it reads being re-read at each wake. A reproduction
or a script goes to the role that owns it. The owner answers only what §Deviations and
§Owed work post. Every decision is written into the thread file as it is made, in the
section it affects, never a log section — the veto table lives only in the final report. The thread
file, its scratch notes and ritual records are the resume record; every commit names its
unit's id; write no parallel run document. A resume does not re-run Open: it checks the
tree clean on the run's own branch, runs the rules' stamp gate, folds the scratch notes and
continues; the group review re-checks every landed unit.

## Dispatch

A dispatch is one Agent call: a fresh spawn of one of the plugin's two role agents. A
role's file carries its law, so a brief carries only pointers. Never `fork` — a fork copies the
orchestrator's context — and never another agent type.

| role            | does                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `todo:builder`  | builds a group's units in sequence, fires their gates, fixes routed findings |
| `todo:reviewer` | read-only: group review, unit review, design consult, rescue                 |

The tier rides the dispatch: a cell's `model/effort` pair becomes the Agent call's `model`
and `effort` parameters (`sonnet/low` → `model: "sonnet"`, `effort: "low"`) and beats the
role file's frontmatter; a blank cell passes neither. The cell is the build's tier only —
the orchestrator never passes its own model or a pick of its own; a different tier is a
ruling — the owner's, or the rescue consult's — written into the unit's row before the
dispatch. A document-unit review carries its own `sonnet/low` (§The loop 7).

- A session on a different model than the `**Run:**` line names says so before its first
  dispatch and continues — it cannot switch itself.
- A `model` cell of `owner` marks a unit the run does not do: it is skipped, its
  dependents stop at it, and the final report lists it as left to the owner. A tier is
  fixed at spawn: consecutive units on one model share a builder, spawned at the highest
  effort among them, and a unit on another model starts a fresh builder.
- A `review` cell of `unit` is a review of that unit alone, passed before the next unit
  is built.
- A `design` consult is a `todo:reviewer` dispatched **beside the previous unit's build**
  — at pre-flight for the first unit, after the previous unit reports when it touches this
  unit's files; a consult not back when its unit is due holds that unit. Its brief names
  the exact open picks; the orchestrator writes the recommendations into the thread file
  before the builder sees the unit.

The orchestrator may also consult on a question the thread file does not mark, one brief
per question, logged in the veto table; the rescue (§The loop) is such a consult. A
`**Run:**` line that names no review — a docs sweep its end checks verify — skips the
group review.

## Open

1. Read the thread file whole, then check the tree: clean on its base (the default branch
   when it names none) — when the prompt asks for a worktree, create it on a new branch off
   that base and work there from here on. Read the repo CLAUDE.md sections that bite, and
   run the rules' stamp gate on the thread file before any dispatch.
2. Complete the thread file. One with no units in its Steps table: stop and say so. One
   whose units lack close criteria (testable sentences) is a design, not a runnable
   thread: one `design` consult at pre-flight writes them plus an enforcement inventory,
   and the orchestrator writes its report into the Steps table and Plan section. Nothing
   builds before they exist. Missing reading lists and tactical-map lines are the
   builder's to derive and record for the fold. A design that rests on a live measure has
   the measure run once here, on the cheap proxy; a measure that misses its bar reopens
   the design here, not mid-run.
3. Resolve the scope to an ordered unit list and its groups — the thread file's groups,
   else the whole thread as one group.
4. Derive the run mechanics:
   - Gates by construction. The tactical map pins each unit's scoped gate lines (its
     components plus their dependents) and the workspace gate line with its ceiling in
     minutes, as the pre-flight gate measured them, rounded up. The builder runs the
     scoped lines while it builds and, for a ceiling of four minutes or under, the
     workspace gate as the last step before each unit's report, in the foreground with the
     Bash `timeout` set to the ceiling: a command the harness moves to the background
     leaves a subagent polling. A longer gate outlasts a subagent's cache, so it is the
     orchestrator's — started in the background once per group, after its last unit
     commits and before the group review, its red result routed like a blocking finding.
     A firing re-fires only for a stated cause — changed code, or a flake with the
     failure quoted.
   - Any A/B ritual the thread file names: record before, record after, both to
     `progress/.scratch/<slug>/` — the ritual-record folder the rules keep until the
     thread closes — and land only on the thread file's landing rule; probes tune against a frozen snapshot, never a live corpus.
     Across many inputs, the first input's baseline and log are checked before the rest
     run — an environment failure stops the ritual there. A run already recorded for the
     same input (the file's git blob where the ritual runs per file, else the revision)
     and invocation is not re-paid; re-run only when its log shows environment failure —
     an anomalous verdict with a clean log is a finding.
   - A ritual command longer than a few minutes is started by the orchestrator in the
     background, and its exit notifies it: a subagent is not woken by its own background
     command. While a ritual holds a resource the gate needs, each active brief names the
     gate the resource permits and defers one workspace-gate firing to the ritual's end.
     A builder writes the ritual's script and reconciles its output. A unit held on an
     owner ruling runs its after pass on the held tree meanwhile; the ruling re-runs only
     the inputs its change touches. A ritual blocks only marking the PR ready for
     review — never a commit, a push or a dispatch.
   - PR topology: one PR per group, opened at the group's first commit; by default one
     group, one branch and one PR. Every `gh pr create` names its base explicitly. The run never merges and never
     pushes to the default branch.
5. Pre-flight picks. For every question the thread file defers to the owner: re-verify
   the premise first — git state the orchestrator reads itself; where the question rests
   on code, a `todo:reviewer` consult reads it, and the code wins — then send it through
   §Deviations. A question the thread file dates to a unit ("ruled at 7") waits for that
   unit — the evidence it needs does not exist at launch.
6. Preconditions before the first dispatch: commit what steps 1–5 wrote — the thread file and
   the index — as one line; the workspace gate green at the start, fired by the orchestrator in
   the background, its minutes written into the tactical map as the gate's ceiling; every
   unit on another thread the scope is gated on has landed there; the environment the
   scoped units need (cluster, env vars, secrets, disk, `gh` auth, quiet neighbors: file
   watchers, indexers, test-discovery runners). Any violation: stop and say so.

## Workers

- A group's builder lives across the group's units: it reports at each unit's end —
  green, red, or stopped on a deviation — and at each routed fix's green, never
  mid-unit; the next unit reaches it by message. Every other role is a fresh dispatch per
  job. A worker inherits only its role file and the thread file. Its private notes live
  in the builder's scratch file or a reviewer's report; the fold is the only way a
  finding outlives its worker.
- A worker is ended and replaced when it stops mid-unit — a stall or rate limit past five
  minutes, a lapsed hold — or passes the context ceiling (a third of its window, off the
  last usage entry of its transcript; ended at its report). A builder's replacement
  continues from its scratch file; a reviewer's is a fresh dispatch of the same brief. A worker idle five minutes without a hold is never resumed, any
  role. One stalled or rate-limited for under five minutes is continued by message.
- One builder at a time, no worktrees inside a run, no parallel builds — except
  document and dataset units (§The loop 7). A build overlaps only the next unit's
  read-only prep — its consult, its brief.
- Briefs point at the thread file's units and sections, name the files the worker owns
  and what "done" means (each unit's close criteria) — the message that hands a builder
  its next unit is one — and never paste thread-file text. A brief naming a heavyweight
  ritual tool pins its full invocation; the orchestrator derives it once and writes it
  into the thread file when the thread file pins none.
- No worker waits on another worker. A subagent's cache expires after five idle minutes
  and a resume re-writes its whole context, at about ten times the price of a cache read.
  So a live builder whose next message must wait — an owner answer, a background gate, a
  live look — gets `hold` from the orchestrator every four minutes; after ten holds the
  orchestrator stops and the builder lapses. A builder whose group has no unit left is not
  held. While a worker is in flight or a builder is held, the orchestrator wakes every
  four minutes — to check on the worker or send the hold; with neither, it sets no timer.
- The orchestrator never opens a source file to understand it. It reads reports, gate
  output, `git diff` and `git show` diffs, and the diff classes the thread file flags as
  silent-failure carriers (migrations, wire bodies, signatures).

## The loop

For each group:

1. **Build.** The builder builds the unit on its scoped gates, fires the workspace gate
   and the enforcement script as the unit's last step (§Open.4), its gate log written to
   `progress/.scratch/<slug>/gate-<unit id>.log` as the brief names it, and reports green with
   the tree uncommitted — or reports red with the failing line and its diagnosis,
   which the orchestrator routes like a blocking finding. Where the enforcement inventory
   names checkables, the group's first builder writes the enforcement script from it into
   `progress/.scratch/<slug>/`, and every builder after runs it.
2. **Commit.** In the wake of that report the orchestrator commits the unit as one commit
   (one line naming the unit's id, no co-author trailer) and appends to or opens the PR,
   because auto mode refuses a worker's commit. The lockfile, README and docs the gate
   exercises ride that commit; a split build is a deviation. In the same
   wake it messages the builder the next unit — or, when the unit carries a unit review,
   dispatches that review and holds the builder until it passes. A deviation stops its
   unit, and nothing that depends on it lands until the orchestrator answers.
3. **Unit review**, for a unit whose `review` cell says `unit`. A fresh `todo:reviewer`
   gets the unit's diff, the thread file's sections and the gate log
   `progress/.scratch/<slug>/gate-<unit id>.log` — never the builder's report or scratch file.
   A `blocking` finding goes by message to the held builder, which fixes it, fires the
   gate and reports the fix green; the orchestrator commits the fix naming the unit's id,
   has it re-reviewed once (step 5), and then messages the next unit. With no builder
   live, the fix goes to a fresh builder. A report naming a process its builder could not
   stop holds the next dispatch until that process is stopped.
4. **Group review.** When the group's last unit is committed and its gate is green, one
   fresh `todo:reviewer` reviews the group's whole diff on the same terms. Its brief names every one of the group's gate logs, the
   units' rows in the thread file and, for units landed in an earlier sitting, in
   `archive/<slug>.md` under the group's heading.
5. **Fix round.** Every `blocking` finding of the group review, with its `nit` findings,
   goes to one fresh builder in one brief, at the highest tier among the faulted units;
   the orchestrator commits the round as one commit naming every faulted unit's id, on a
   green gate. A fix to a finding on a unit that carries a unit review is re-reviewed
   once, by a fresh reviewer over the fix diff; every other fix stands on its gate. A
   group review with no blocking finding runs no round: its nits go to the final report.
   A finding still open after its re-review, or a round whose gate stays red, means the
   unit is wrong: the orchestrator reads the specific finding, not the diff, and may take
   the rescue — a reviewer consult that diagnoses the failure — then routes the diagnosis
   to a fresh builder at the tier the consult recommends; said in one line and listed in
   the veto table. A finding still open after one rescue stops the run and goes to the owner.
6. **Close the units** — each only on its stated close criteria (greps, tests, gate
   firings), as its reviews reported them, never on the builder's say-so — once no open
   blocking finding remains and every fix is committed on a green gate. Route each
   deviation a builder reported through §Deviations: a pick inside the thread file's named
   scope is written into the owning section with later sections ripple-checked in the
   same edit; what stops the run goes to the owner with the builder's questions and the
   reviewer's in one message. A question that touches money or would mint a unit is
   posted only after a reviewer consult's read-only trace of the code it rests on, so
   every option it offers is buildable. Fold the group's scratch into the thread file per
   the rules and delete it.
7. **Document and dataset units** — nothing compiles, no gate — are the one exception to
   one builder and one review per group: each gets its own builder, skips the gate, and
   gets its own review at `sonnet/low` — none under a `**Run:**` line that names no
   review. Its reviewer checks the deliverable against the close criterion as written (a
   row count against the source's catalog, never a sample) by re-running the count's
   source — the command or URL the builder recorded — and never takes the builder's
   number. Such units run in parallel where the thread file says so; parallel builders
   write only their files and never run git or edit the thread file, and the
   orchestrator commits each unit and folds its notes in once its reviewer passes. A unit
   may measure built code from a landed commit, on resources of its own, beside the next
   build: its row holds the match criterion, a mismatch is a blocking finding against the
   measured unit, and its reviewer re-runs the source side only.

## Red lines

1. Production data stores are read-only (SELECT / dump) unless the thread file explicitly
   pre-authorizes writes. Migrations land as files; production gets them via the
   owner's release flow, never in-run.
2. Frozen scoring sheets are scored exactly as the thread file says and never tuned
   against; the workspace gate must stay green throughout.
3. A probe that fails its bar is reported, not landed — "probed, no landing" with the
   grid in the thread file is a completed unit.
4. Never weaken a pin to pass it. A pin changes only because the behavior deliberately
   changed, and the commit says so.
5. Shared external environments are never written. Dangerous exec edges prove
   themselves on fakes and test rigs only; a live deploy or adopt is the owner's call.
6. A multi-file operation a permission classifier refuses is re-issued as smaller
   commands; still refused, the blocker is written into the thread file and the other
   units continue.

## Close

When a group's last unit closes, or the run's scope ends inside a group: write each
landed unit's commit into its row and archive the group's landed units per the rules'
`archive/` bullet — one commit, before the PR is marked ready. Skipped when the group
holds the thread's final unit: the thread's close appends the whole file.

At the run's end:

- Landing the thread's final unit closes the thread in the same sitting, after the group's
  fold: post owed work and mint successors per the rules' closing paragraph, then close
  the thread per it — index entry included.
- End checks when the thread file carries them: a builder writes and runs the script from
  its end-checks list, no builds.
- Final report: PR URLs; the gate results (start → per-unit → end); the veto table
  (question, pick, reason, where written); every finding not fixed and why, nits
  included; owed work; units closed "probed, no landing"; remaining reds; late findings
  (for each blocking finding, whether a later unit had already built on the faulted
  unit); out-of-run follow-ups named with the component that owns them. A subset run
  reports its units plus what it owes the later ones.
