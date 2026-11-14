---
name: rules
description: The work-tracking rules — TODO.md is the index, progress/<slug>.md the thread file, references/ holds promoted facts, archive/ holds landed work. Use whenever any of the four is read or touched — resuming, creating or editing an entry, starting, running, or closing a thread.
---

# Work tracking

**`TODO.md` → `progress/` → `references/` → `archive/`.**

- **`TODO.md` is the index** — what is open, what it is worth, and, for work nobody has picked up, what it is. State lives only in the thread file, so the index has nothing that can go stale.
- **`progress/<slug>.md` is the thread file** — the thread's detail home, created when its entry needs one (below): a piece of work with a goal and a way to close, or a standing loop. `/todo:run` builds it one group at a time, so its shape is what a builder reads. **A resuming session reads that file, its scratch notes and its ritual records, nothing else about the thread.** A report or a review is not a thread: it goes to `references/` when it states current facts, to `archive/` when it is a record.
- **`progress/.scratch/` holds a sitting's notes and a run's ritual records.** Notes — `<slug>.md`, `brainstorm-<session id>.md` for a brainstorm no thread names yet — are dated entries, half-findings, gate output; they fold into the thread file and are deleted (below).
- **A sitting's talk is noted as it happens, one entry per event**, tagged by source, because the reasoning behind a turn is gone from the record once the turn ends: `owner:` a ruling, constraint or reason in the owner's own words, quoted; `proposed:` the model's proposal or lean with its reason; `options:` a lettered menu, the owner's pick resolved to its option's text, the reason kept for each option not taken; `found:` a measured fact or evidence with its source; `open:` a question nobody answered. A changed position is a new entry carrying `replaces: <quote>`, and the entry it replaces is deleted. An entry is the quote and one line of reason, never a retelling of a report. A hypothesis or a "let's say" is noted as what it is, and an owner's "yes" rules only the proposal it answers. A run's before/after ritual records and gate logs live in `<slug>/`, a separate object the fold keeps until the thread closes. The directory ignores itself — created on first use with `progress/.scratch/.gitignore` holding `*` — so none of it is committed.
- **`references/` holds promoted facts** — created on first promotion, not by `/todo:init`. It carries verified reusable numbers, settled decisions. Current only: no history, no dated sections; a verification date on a number is its method, not history. An external reference — material from outside the repo, marked external at its top — is kept as written; it describes no code, so it cannot drift.
- **`archive/` holds landed / killed / parked documents**, moved verbatim, never deleted. A thread has one archive file, `archive/<slug>.md`, created when absent; the thread file appends to it verbatim when the thread closes. A rendering of what the code already is (an explainer, a generated view) carries no intent and is deleted, not archived. A trivial task — one-shot, done in the sitting that found it — skips `progress/` entirely: its entry is deleted on done, with one line in `archive/completed.md`.

## The index

```
# TODO — open-work index

<optional: one paragraph — the standing constraint every entry works inside, and where its detail lives>

## Next
1. **<title>** · <PRIORITY> · [<areas>] → progress/<slug>.md

## <area>
- **<title>** · <PRIORITY> · [<areas>] → progress/<slug>.md
- **<title>** · <PRIORITY> · [<areas>]
  <at most two sentences: what goes wrong or is wanted, where it shows, why it matters>

## Reading
- **[<what it is>](<url>)**

## Parked
- **<title>** · <PRIORITY> → progress/<slug>.md — revisit when <trigger>

## Out of scope
- **<thing>** — <why, one clause>
```

- **Sections, in this order.** `## Next`, `## Reading`, `## Parked` and `## Out of scope` are optional; a section with no entries is deleted. Area sections are named like the area their entries share — a heading label, not a rule. Nothing else sits in the index — no per-repo rules, no prose between sections, no heading suffixes.
- **An entry** is a title line — title, then the optional parts in this order: priority, areas, pointer; nothing follows the pointer except a parked entry's trigger — and, on an entry with no pointer, context under it: at most two sentences, or one clause per finding when the entry carries several findings fixed and checked together. No checkbox: a done entry is deleted, never ticked. A link to read is an entry in `## Reading`, its title the link.
- **Context passes one test: it would still be true if nobody had investigated.** It may say what goes wrong or is wanted, where it shows (a screen, a command, a named key, function or file), why it matters, the one fact observable from outside that reproduces it (a command and its output, a reply, a snapshot), and where a finding about it is recorded — an archived thread file, a reference. It never names the mechanism inside the code that causes it, nor carries an option, a fix sketch, a plan, a measurement, a `file:line` anchor, status, dates or history.
- **An entry gets a file** when the thread is picked up — a sitting whose task is this entry starts working toward its goal: investigating it, deciding for it, building it — or when its context outgrows that cap. Findings about it made during other work (a review, another thread) do not start it: its context names where they are recorded, and the code is the account of the rest. The entry then drops its context and points at the file. A file whose content an entry could hold is folded back into the entry.
- **One file, one entry.** Each thread file has exactly one index entry pointing at it, and the `→` pointer only ever points into `progress/`; an archived or reference document is named in context, never pointed at.
- **Areas** name the code a thread touches, each spelled as an existing directory's name, so a search for that name finds every entry on it. Code a thread has yet to create is tagged by the existing directory it will live in.
- **`## Next`** is the one pinned queue: its order is the order of work. What's next is its first item — without one, the highest-priority entry. Order anywhere else means nothing.
- **`## Parked`** holds work stopped until something happens; the trigger names that event — another thread's unit landing (`revisit when <thread> <unit> lands`), a date, a resource arriving — never the owner's mood. An entry another thread will make moot is parked on that thread's unit. Its archived document, when one exists, is named in its context.
- **`## Out of scope`** holds decisions not to do something, so nobody re-proposes them. Never work, never next; a killed thread is archived, not listed here.
- **Ids are kept.** An id — in an entry's title or a unit's id column — is never renumbered or reused, so cross-references keep resolving.

## Threads and units

- **A thread is one goal the owner picks up and lands as one stretch of work.** Work from one source — a review, a design — is one thread, and the order between its parts is the order of its units, never a reason for a second thread. A second thread is owed only by work with a different priority, an owner decision still open that the rest does not wait on, or a wait on something outside this repo (a release, another repo, a date). A recurring runbook is one standing thread, never a thread per round.
- **A review's findings are content, not threads.** Each finding becomes part of a unit — its content or a close criterion — in the thread whose goal it serves; a finding no goal carries goes to a bare entry, shared with the findings fixed and checked alongside it.
- **A unit is one outcome of the Goal the owner would accept or revert whole**, leaving the gate green, or a named precondition of one. It is accepted on its close criteria; its build is one commit, and any fix commit names every faulted unit's id. A finding or a criterion is never a unit; work that shares a file set or a verification is one unit; parts are two units only when they need different verification — a coverage change beside a money change — or one must be revertible alone. A probe that lands a keep-or-delete verdict is a unit; an "only if" step is a Plan-section note until its condition is known. A thread usually has two to six units: past six, merge the units that share a verification before adding one.
- **A group is the units that land in one PR**, built end to end by one `/todo:run` session — by default the whole thread — named by its first unit's id. A second group is cut when its PR must wait on something the first does not — another PR, a release, a gate that flips last — or when one builder session cannot hold both. One review covers the group's diff.
- **A live look** is the owner looking at a built surface; a unit's close criterion may call for one.
- **Owed work** is what a sitting or a run finds that no unit carries — a live look's new want, a finding outside every unit, a cut. It is a line in its thread's Current state, never a new index entry, until the owner turns it into units or drops it; only the owner mints or re-cuts a unit.

## A thread file

```
# <title>

**Todo:** 0.56.0

## Goal
## Current state
## Next step
## Steps
### <first unit id> · <PR title> · <model/effort>
- **Base:** <the branch or group the PR stacks on>
- **Consults:** <unit id>: <the exact questions>
- **Stops:** <a measure's bar, a fork for the owner>
- **Review lens:** <what the review weighs beyond the defaults>
- **Rig:** <what the group measures with, and how to run it>
| id | unit | close criteria |
## Plan
## Design
```

- **`**Todo:**`** — the plugin version that last maintained the file; the example above is the running version. The mint writes it; the stamp gate, every fold and every audit of the thread rewrite it to the running version, never backward; a file moving to `archive/` keeps its last stamp. Absent means the file predates the stamp.
- **Goal** — what done means: the thread's close criteria, testable.
- **Current state** — the only place the thread's state lives, open findings and owed work included. Rewritten in place, never appended to; no dates, no snapshots beside it.
- **Next step** — one concrete action. A step waiting on a date names it; a passed date means the step is rewritten. A dated next step and the scratch notes are the only places dates appear; a slug never carries one.
- **Steps** — for multi-step work only: one section per group, in the order the PRs land, each headed by its first unit's id, its PR's title and its tier. The tier is a model or a `model/effort` pair (`opus/high`) for the builder session — one per group, because one session builds the whole group — or `owner` for a group the run must not build, decisions included. Its fields, each omitted when empty: **Base**, when the PR stacks on another group's branch instead of the default branch; **Consults**, each a unit id and the exact questions a read-only consult answers before that unit builds; **Stops**, the group's own measure-first bars and forks for the owner, beyond the floor every build stops on; **Review lens**, what the group's review weighs beyond regressions, seams and simplification; **Rig**, what the group measures with and how to run it. Then its units, one row each in dependency order. Close criteria are testable sentences; a landed unit's cell ends with its commit. Priority belongs to the entry, never to a unit.
- **Plan** — what a builder reads beyond its group, when the thread has it: per-unit reading lists; the tactical map — the files, anchors and scoped gate lines per unit, the cheap checks, and the workspace gate line with its ceiling in minutes; the enforcement inventory (tests that must survive byte-for-byte, forbidden idioms, counts that must never rise, checklist lines for what no script can check); the Goal's measure, which the thread review re-runs; the end checks; open questions for the owner.
- **Design** — the design the units rest on, while the thread is live: decisions made for it, each naming the owner's words it rests on; options rejected, each with its reason; and what the owner has not ruled, marked proposed — an open pick, never a decision. Current only; what outlives the thread moves to `references/` when it closes.
- **A standing thread** — a loop that never closes — has no Steps and is worked by the session, never by `/todo:run`: its goal is the loop's purpose, its current state is rewritten each sitting, and a recurring schedule lives in Current state with only the next occurrence as Next step.
- **A cost or gain** the file states is a measured number with its method, or an estimate that names the unit whose result replaces it.

**Notes fold in; the file stays current.** During a sitting, notes go to the thread's scratch files. Closing a unit, a handoff, or the end of any sitting that changed the thread folds them in: re-read the thread file top to bottom, carry what the notes established into Current state, the Steps table and Plan, rewrite in place anything the work made false or spent — the next unit's row included — delete superseded clauses (git is the history) — then delete the scratch files. Scratch files found when a thread is picked up are folded in first, after the stamp gate has read the stamp: a sitting can end without warning. The index entry changes in the same sitting only when its title, priority or areas did.

**One home per fact.** Index in `TODO.md`, task state in `progress/`, reusable facts in `references/`. Where a repo already keeps a kind of fact elsewhere, that is its home: an entry or a file names it, never copies.

**Every design document describes intent; the code is the only account of what exists.** Do not trust an anchor (`file:line`, a signature, "nothing does X") in any file under `progress/`, `references/` or `archive/` without re-reading the source — they drift, and they say so. An external reference is the exception.

**Starting a thread.** A thread starts via `/todo:new` the moment it is picked up — the index is maintained at start, not after the fact: a picked-up thread with no `→ progress/<slug>.md` pointer is a broken index — the trivial task above excepted. Talk held in a `/todo:brainstorm` is not a pickup: its thread starts only when the owner types `/todo:new`. A slug already in `archive/` or `progress/` is taken: a successor thread adds a suffix (`<slug>-2`).

**Closing a thread.** A thread closes once its last group's PR has merged and `/todo:review <thread>` has reviewed every group's PR against the Goal, so fixes after review are written into the live file before it is archived: owed work posted to the owner first, the thread file appended verbatim to `archive/<slug>.md` and deleted, one commit. A thread with no PR closes the same way when its goal is met. **Deferrals do not ride along:** owed work and cuts the owner still wants earn one `TODO.md` entry per goal — its successor, minted via `/todo:new` — before the thread closes; the rest is dropped with the file.

**Stamp gate.** Before working an existing thread, and before any fold in a sitting that has not yet run it, compare its `**Todo:**` stamp to the running version (the one in the shape above). A stamp behind the running version, or none, trips it: with a stamp, run this skill's `scripts/stamp-gate.mjs <stamp>` — `rules unchanged`, restamp the thread to the running version and work on; a diff, dispatch one `todo:auditor` (its own tier, one `Agent` call, never a brief the session writes) with the thread and the diff, before any work starts; `unresolved`, or no stamp at all, the same dispatch with no diff — every clause. A stamp ahead of it means the install is older than the thread: say so, leave the stamp, and stop until the owner updates the plugin. An audit of the thread — the auditor, from this gate or the owner's ask — is the gate's own path and never trips it.

**Priority:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` — the value the work carries, not how broken something is. Untagged = not yet valued; a thread whose value hangs on an open question stays untagged and carries a unit that answers it. Status is not priority, and neither is sequencing: a blocker outside the thread lives in its Next step, a parked entry's trigger in its entry.
