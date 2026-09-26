---
name: rules
description: The work-tracking rules — TODO.md is the index, progress/<slug>.md the detail home, references/ holds promoted facts, archive/ holds landed work. Use whenever any of the four is read or touched — resuming a thread from its progress file, creating or editing an index entry, starting, running, or closing a thread: the shapes, verbs, and priorities live here.
---

# Work tracking

**`TODO.md` → `progress/` → `references/` → `archive/`.**

- **`TODO.md` is the index** — what is open, what it is worth, and, for work nobody has picked up, what it is. State lives only in the thread's progress file, so the index has nothing that can go stale.
- **`progress/<slug>.md` is the thread's detail home** — created when its entry needs one (below): a piece of work with a goal and a way to close, or a standing loop. It is also the plan `/todo:run` executes, so its shape is what a run reads. **A resuming session reads that file and its scratch notes, nothing else about the thread** — the index carries no state. A report or a review is not a thread: it goes to `references/` when it states current facts, to `archive/` when it is a record.
- **`progress/.scratch/<slug>.md` holds a sitting's notes** — dated entries, half-findings, gate output. The directory ignores itself — created on first use with `progress/.scratch/.gitignore` holding `*` — so notes are never committed; they fold into the thread file and are deleted (below).
- **`references/` holds promoted facts** — verified reusable numbers, settled decisions — so neither the index nor a thread file carries them twice. Current only: no history, no dated sections; a verification date on a number is its method, not history. An external reference — material from outside the repo, marked external at its top — is kept as written.
- **`archive/` holds landed / killed / parked documents**, moved verbatim, never deleted — a reviewer reads a landed plan there against the diff. A rendering of what the code already is (an explainer, a generated view) carries no intent and is deleted, not archived. A trivial task — one-shot, done in the sitting that found it — skips `progress/` entirely: its entry is deleted on done, with one line in `archive/completed.md`.

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

- **Sections, in this order.** `## Next`, `## Reading`, `## Parked` and `## Out of scope` are optional; a section with no entries is deleted. Area sections are named like the area their entries share — a group label, not a rule. Nothing else sits in the index — no per-repo rules, no prose between sections, no heading suffixes.
- **An entry** is a title line — title, then the optional parts in this order: priority, areas, pointer; nothing follows the pointer except a parked entry's trigger — and, on an entry with no pointer, at most two sentences of context under it. No checkbox: a done entry is deleted, never ticked. A link to read is an entry in `## Reading`, its title the link.
- **Context passes one test: it would still be true if nobody had investigated.** It may say what goes wrong or is wanted, where it shows (a screen, a command, a named key, function or file), why it matters, the one fact observable from outside that reproduces it (a command and its output, a reply, a snapshot), and where a finding about it is recorded — an archived plan, a reference. It never names the mechanism inside the code that causes it, nor carries an option, a fix sketch, a plan, a measurement, a `file:line` anchor, status, dates or history.
- **An entry gets a file** when the thread is picked up — a sitting whose task is this entry starts working toward its goal: investigating it, deciding for it, building it — or when its context needs more than two sentences. Findings about it made during other work (an audit, a review, another thread) do not start it: its context names where they are recorded, and the code is the account of the rest. The entry then drops its context and points at the file. A file whose content an entry could hold is folded back into the entry.
- **One file, one entry.** Each progress file has exactly one index entry pointing at it, and the `→` pointer only ever points into `progress/`; an archived or reference document is named in context, never pointed at.
- **Areas** name the code a thread touches, each spelled as an existing directory's name, so a search for that name finds every entry on it. Code a plan has yet to create is tagged by the existing directory it will live in.
- **`## Next`** is the one pinned queue: its order is the order of work. What's next is its first item — without one, the highest-priority entry. Order anywhere else means nothing.
- **`## Parked`** holds work stopped until something happens; the trigger names that event — another thread's unit landing (`revisit when <thread> <unit> lands`), a date, a resource arriving — never the owner's mood. An entry another thread will make moot is parked on that thread's unit. Its archived document, when one exists, is named in its context.
- **`## Out of scope`** holds decisions not to do something, so nobody re-proposes them. Never work, never next; a killed thread is archived, not listed here.
- **Ids are kept.** An id — in an entry's title or a unit's id column — is never renumbered or reused, so cross-references keep resolving.

## A progress file

```
# <title>

**Run:** <orchestrator model> · <grain: what one unit is, what one PR holds>

## Goal
## Current state
## Next step
## Steps
| id | unit | model | review | close criteria |
## Plan
## Design
```

- **`**Run:**`** — what departs from `/todo:run`'s defaults: an orchestrator model other than the launching session's, a grain other than one commit per unit and one PR per thread. Absent means the defaults.
- **Goal** — what done means: the thread's close criteria, testable.
- **Current state** — the only place the thread's state lives. Rewritten in place, never appended to; no dates, no snapshots beside it.
- **Next step** — one concrete action. A step waiting on a date names it; a passed date means the step is rewritten. A dated next step and the scratch notes are the only places dates appear; a slug never carries one.
- **Steps** — the unit table `/todo:run` executes, one row per unit in dependency order, for multi-step work only. `model` is blank for the run's default, `opus` or `sonnet` where a builder departs from it, or `owner` for a unit the run must not do — decisions included; never fable, the orchestrator's model, which reaches a unit only as the run's posted rescue. `review` is blank for `blind`, or `checklist` / `none` (`none` justified in `## Plan`). A row may name its gate scope. Close criteria are testable sentences; a landed unit's cell ends with its evidence (commit or PR). Priority belongs to the entry, never to a unit. A dataset unit whose columns parallel workers fill states the one test each judgment column is filled by.
- **Plan** — what a run reads beyond the table, when the thread has it: per-unit reading lists, the enforcement inventory (tests that must survive byte-for-byte, forbidden idioms, counts that must never rise, the line ceiling), PR grouping, the audit list, open questions for the owner. A run's hardening unit writes what is missing before anything builds.
- **Design** — the design the units rest on, while the thread is live: decisions made for it, options rejected. Current only; what outlives the thread moves to `references/` when it closes.
- **A standing thread** — a loop that never closes — has no Steps: its goal is the loop's purpose, its current state is rewritten each sitting, and a recurring schedule lives in Current state with only the next occurrence as Next step.
- **A cost or gain** the file states is a measured number with its method, or an estimate that names the unit whose result replaces it.

**Notes fold in; the file stays current.** During a sitting, notes go to the thread's scratch file. Closing a unit, a handoff, or the end of any sitting that changed the thread folds them in: re-read the thread file top to bottom, carry what the notes established into Current state, the Steps table and Plan, rewrite in place anything the work made false or spent — the next unit's row included — delete superseded clauses (git is the history), then delete the scratch file. A scratch file found when a thread is picked up is folded in first: a sitting can end without warning. The index entry changes in the same sitting only when its title, priority or areas did.

**One home per fact.** Index in `TODO.md`, task state in `progress/`, reusable facts in `references/`. Where a repo already keeps a kind of fact elsewhere, that is its home: an entry or a file names it, never copies. Don't duplicate.

**Every design document describes intent; the code is the only account of what exists.** Do not trust an anchor (`file:line`, a signature, "nothing does X") in any file under `progress/`, `references/` or `archive/` without re-reading the source — they drift, and they say so. The exception is an external reference: it describes no code, so it cannot drift from it.

**Starting a thread.** A thread starts via `/todo:new` the moment it is picked up — the index is maintained at start, not after the fact: a picked-up thread with no `→ progress/<slug>.md` pointer is a broken index. A slug already in `archive/` is taken: a successor thread adds a suffix (`<slug>-2`).

**Found work stays in its thread.** Work a thread turns up inside its own scope becomes a unit in its progress file, never a new index entry.

**Closing a thread.** A `/todo:run` run closes its thread when it lands the final unit — deferral gate first, `git mv`, one commit, no waiting on merge. Threads ended outside a run close by hand, the same way. **Deferrals do not ride along:** work cut from a thread's scope earns its own `TODO.md` entry before that thread closes, or it is lost with the file.

**Checking.** `/todo:audit` checks all of the above — the whole repo, one thread, or one unit.

**Priority:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` — the value the work carries, not how broken something is. Untagged = not yet valued; a thread whose value hangs on an open question stays untagged and carries a unit that answers it. Status is not priority, and neither is sequencing: blockers and "after X" live in the thread's Next step, a parked entry's trigger in its entry.
