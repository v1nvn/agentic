---
name: rules
description: The work-tracking rules — TODO.md is the index, progress/<slug>.md the detail home, references/ holds promoted facts, archive/ holds landed work. Use whenever any of the four is touched — creating or editing an index line, starting, running, or closing a thread: the shapes, verbs, and priorities live here.
---

# Work tracking

**`TODO.md` → `progress/` → `references/` → `archive/`.**

- **`TODO.md` is the index.** One line per thread, two at most: title, priority tag, and — once one exists — a `→ progress/<slug>.md` pointer with a short status clause. Plans, anchors, measured numbers and fix sketches never live here — they are what the progress file is for. A line answers *what* and *how important*, nothing else. What's next is whatever sits highest in the file (or in the pinned top, where this repo's deltas say one exists). A section groups lines; ordering within a section means nothing unless this repo's deltas say otherwise.
- **`progress/<slug>.md` is the detail home.** Created when a thread is picked up — or earlier, to hold the detail an index line cannot carry. Shape: goal · current state · next step · log (live context only) — and, for multi-step work, the task list itself: a steps table with per-step verification, defined in the progress file, never in the index. **A resuming session reads ONLY that file**, so it opens with a back-reference line (`> Rules: /todo:rules · Index: ../TODO.md`) and, the day it is created, names what a `/todo:run` run needs: a `**Run:**` line for the orchestrator, a `model` column on the steps table where a builder departs from the skill's default (`owner` for a step the run must not do), and its grain — what one unit is and what one PR holds. A dataset step whose columns parallel workers fill states the one test each judgment column is filled by. A cost or gain the file states is a measured number with its method, or an estimate that names the step whose log line replaces it.
- **A progress file carries current contracts only.** Closing a unit includes re-reading the file top-to-bottom and rewriting in place anything the unit made false or spent — the next unit's row included. Spent log entries and dated sections die at that realignment, their still-true content folded into undated current state. Superseded clauses are deleted, not archived: git is the history. Current state is the handoff — no dated snapshot sections beside it. The `TODO.md` line updates in the same sitting any state here changes.
- **`references/` holds promoted facts** — verified reusable numbers, settled decisions — so an index line stays thin without losing the facts.
- **`archive/` holds landed / killed / parked documents**, moved verbatim, never deleted — a reviewer reads a landed plan there against the diff. A rendering of what the code already is (an explainer, a generated view) carries no intent and is deleted, not archived. Trivial one-shot completions → `archive/completed.md`; trivial tasks skip `progress/` entirely (line deleted on done).

**One home per fact.** Index in `TODO.md`, task state in `progress/`, reusable facts in `references/`. Don't duplicate.

**Every design document describes intent; the code is the only account of what exists.** Do not trust an anchor (`file:line`, a signature, "nothing does X") in any file under `progress/`, `references/` or `archive/` without re-reading the source — they drift, and they say so.

**Starting a thread.** A thread starts via `/todo:new` — the skill is the rule. The index is maintained at start, not after the fact: an in-flight thread with no `→ progress/<slug>.md` pointer is a broken index.

**Closing a thread.** A `/todo:run` run closes its thread when it lands the final unit — deferral gate first, `git mv`, one commit, no waiting on merge. Threads ended outside a run close by hand. **Deferrals do not ride along:** work cut from a thread's scope earns its own `TODO.md` line before that thread closes, or it is lost with the file. `cleanup` is optional hygiene, never required — nothing waits on it.

**Priority:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` — how bad it is to leave unfixed; untagged = backlog. Sequencing ("after X", "on top of Y") is a note on the line, not a second ladder.
