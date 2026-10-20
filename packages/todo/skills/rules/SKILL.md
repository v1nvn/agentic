---
name: rules
description: The work-tracking rules — TODO.md is the index, progress/<slug>.md the thread file, references/ holds promoted facts, archive/ holds landed work. Use whenever any of the four is read or touched — resuming, creating or editing an entry, starting, running, or closing a thread.
---

# Work tracking

**`TODO.md` → `progress/` → `references/` → `archive/`.**

- **`TODO.md` is the index** — what is open, what it is worth, and, for work nobody has picked up, what it is. State lives only in the thread file, so the index has nothing that can go stale.
- **`progress/<slug>.md` is the thread file** — the thread's detail home, created when its entry needs one (below): a piece of work with a goal and a way to close, or a standing loop. `/todo:run` executes it, so its shape is what a run reads. **A resuming session reads that file, its scratch notes and its ritual records, nothing else about the thread.** A report or a review is not a thread: it goes to `references/` when it states current facts, to `archive/` when it is a record.
- **`progress/.scratch/` holds a sitting's notes and a run's ritual records.** Notes — `<slug>.md`, or per builder `<slug>-<id>-builder.md`, `<id>` the group's name or, for a parallel document or dataset unit, the unit's id — are dated entries, half-findings, gate output; they fold into the thread file and are deleted (below). A builder's file is private to its id and dies at its close: what a later group needs reaches it only through the fold. A run's before/after ritual records and gate logs live in `<slug>/`, a separate object the fold keeps until the thread closes. The directory ignores itself — created on first use with `progress/.scratch/.gitignore` holding `*` — so none of it is committed.
- **`references/` holds promoted facts** — created on first promotion, not by `/todo:init`. It carries verified reusable numbers, settled decisions. Current only: no history, no dated sections; a verification date on a number is its method, not history. An external reference — material from outside the repo, marked external at its top — is kept as written; it describes no code, so it cannot drift.
- **`archive/` holds landed / killed / parked documents**, moved verbatim, never deleted — a reviewer reads landed units there against the diff. A thread has one archive file, `archive/<slug>.md`, created when absent: each group's landed units and the Plan-section text only they used append to it verbatim, under a heading for the group (a group already headed there continues under it), when the group lands or a run's scope ends inside it; the rest of the thread file appends on close. A rendering of what the code already is (an explainer, a generated view) carries no intent and is deleted, not archived. A trivial task — one-shot, done in the sitting that found it — skips `progress/` entirely: its entry is deleted on done, with one line in `archive/completed.md`.

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
- **A group is the units that land in one PR** — by default the whole thread — named by its first unit's id. A second group is cut only when its PR must wait on something the first does not: another PR, a release, a gate that flips last. One review covers the group's diff.
- **A live look** is the owner looking at a built surface; a unit's close criterion may call for one.
- **Owed work** is what a sitting or a run finds that no unit carries — a live look's new want, a finding outside every unit, a cut. It is a line in its thread's Current state, never a new index entry, until the owner turns it into units or drops it; only the owner mints or re-cuts a unit.

## A thread file

```
# <title>

**Run:** <departures: orchestrator model · groups · ask or standing-pick · no review>
**Todo:** 0.52.0

## Goal
## Current state
## Next step
## Steps
| id | unit | model | review | consult | close criteria |
## Plan
## Design
```

- **`**Run:**`** — what departs from `/todo:run`'s defaults: an orchestrator model other than the launching session's; more than one group; `ask: all` (every pick posted) or `standing-pick: all` (even money and names taken); no review, with its reason. Absent means the defaults: one group, one commit per unit, one review.
- **`**Todo:**`** — the plugin version that last maintained the file; the example above is the running version. The mint writes it; every fold and every audit of the thread rewrites it to the running version, never backward; a file moving to `archive/` keeps its last stamp. Absent means the file predates the stamp.
- **Goal** — what done means: the thread's close criteria, testable.
- **Current state** — the only place the thread's state lives, open findings and owed work included. Rewritten in place, never appended to; no dates, no snapshots beside it.
- **Next step** — one concrete action. A step waiting on a date names it; a passed date means the step is rewritten. A dated next step and the scratch notes are the only places dates appear; a slug never carries one.
- **Steps** — the unit table `/todo:run` executes, one row per unit in dependency order, for multi-step work only. `model` tiers the unit's build: blank for the builder's role default, a model or a `model/effort` pair (`sonnet/low`), or `owner` for a unit the run must not do — decisions included; `opus` goes on units that carry a unit review or a design choice, because later units build on what they decide, and units on one model sit together where the dependency order allows, because a model change starts a fresh builder. `review` is blank — the group review covers the unit — or `unit`, a review of the unit alone before later units build on it, earned by a seam carrier — a change whose two ends land or ship apart: a migration or stored data's shape, a wire format another process or release reads, money; generated code regenerated in the same commit is not one — or a foundation (two or more later units of the group build on its new type, API or file layout). `consult` is blank or `design`: a read-only reviewer consult on the picks a unit leaves open. Close criteria are testable sentences; a landed unit's cell ends with its evidence (commit or PR) until its group lands and the row moves to the archive. Priority belongs to the entry, never to a unit. A dataset unit whose columns parallel workers fill states the one test each judgment column is filled by.
- **Plan** — what a run reads beyond the table, when the thread has it: per-unit reading lists; the tactical map — the files, anchors and scoped gate lines per unit and the workspace gate line with its ceiling in minutes, folded as groups land; the enforcement inventory (tests that must survive byte-for-byte, forbidden idioms, counts that must never rise, checklist lines for what no script can check); run mechanics, stop rules, the groups when there is more than one, the end checks, open questions for the owner.
- **Design** — the design the units rest on, while the thread is live: decisions made for it, options rejected. Current only; what outlives the thread moves to `references/` when it closes.
- **A standing thread** — a loop that never closes — has no Steps and is worked by the session, never by `/todo:run`: its goal is the loop's purpose, its current state is rewritten each sitting, and a recurring schedule lives in Current state with only the next occurrence as Next step.
- **A cost or gain** the file states is a measured number with its method, or an estimate that names the unit whose result replaces it.

**Notes fold in; the file stays current.** During a sitting, notes go to the thread's scratch files. Closing a unit, a handoff, or the end of any sitting that changed the thread folds them in: re-read the thread file top to bottom, carry what the notes established into Current state, the Steps table and Plan, rewrite in place anything the work made false or spent — the next unit's row included — delete superseded clauses (git is the history) — a landed group's units and the Plan-section text only they used are archived per the `archive/` bullet — then delete the scratch files. Scratch files found when a thread is picked up are folded in first, after the stamp gate has read the stamp: a sitting can end without warning. The index entry changes in the same sitting only when its title, priority or areas did.

**One home per fact.** Index in `TODO.md`, task state in `progress/`, reusable facts in `references/`. Where a repo already keeps a kind of fact elsewhere, that is its home: an entry or a file names it, never copies.

**Every design document describes intent; the code is the only account of what exists.** Do not trust an anchor (`file:line`, a signature, "nothing does X") in any file under `progress/`, `references/` or `archive/` without re-reading the source — they drift, and they say so. An external reference is the exception.

**Starting a thread.** A thread starts via `/todo:new` the moment it is picked up — the index is maintained at start, not after the fact: a picked-up thread with no `→ progress/<slug>.md` pointer is a broken index — the trivial task above excepted. A slug already in `archive/` or `progress/` is taken: a successor thread adds a suffix (`<slug>-2`).

**Closing a thread.** A `/todo:run` run closes its thread when it lands the final unit — owed work posted to the owner first, the thread file appended verbatim to `archive/<slug>.md` and deleted, one commit, no waiting on merge. Threads ended outside a run close by hand, the same way. **Deferrals do not ride along:** owed work and cuts the owner still wants earn one `TODO.md` entry per goal — its successor, minted via `/todo:new` — before the thread closes; the rest is dropped with the file.

**Stamp gate.** Before working an existing thread, and before any fold in a sitting that has not yet run it, compare its `**Todo:**` stamp to the running version (the one in the shape above). A stamp behind the running version, or none, trips it: run `/todo:audit <thread>` before any work starts. A stamp ahead of it means the install is older than the thread: say so, leave the stamp, run no audit. An audit of the thread — `/todo:audit` and the reviewer it dispatches — is the gate's own path and never trips it.

**Priority:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` — the value the work carries, not how broken something is. Untagged = not yet valued; a thread whose value hangs on an open question stays untagged and carries a unit that answers it. Status is not priority, and neither is sequencing: a blocker outside the thread lives in its Next step, a parked entry's trigger in its entry.
