---
name: new
description: Start a work-tracking thread — the TODO.md index entry always, and progress/<slug>.md folded from the sitting's notes when the entry needs one. Use when the session opened a new thread of work ("start a thread on X", "add a line for X"), the moment a sitting picks up work that has no entry or whose entry now needs a file, or when closing one thread mints its successors in the same edit.
argument-hint: [title]
---

Load `/todo:rules` first — the index-entry and thread-file shapes this verb writes, and the
talk-entry form its notes use, live there.

Write this sitting's threads into the index. `[title]` given: it is the title — the
primary path, the way the owner names a successor. Skipped: derive everything — titles,
slugs, and how many entries the sitting owes — from the sitting's notes. The index entry
is written always; `progress/<slug>.md` only when the rules say the entry gets one.

## When a start is owed

- The moment a sitting picks up work that has no entry, or whose entry now needs a file
  — not after the fact. Mid-sitting, the moment the owner says "open the thread".
- A thread's close mints its successors — one per goal kept — from owed work the owner
  kept, in the same edit that closes the predecessor, never a separate sitting.
- A sitting that only parked blocked work owes a thread too: the file then holds the
  resume plan, not work-in-flight.

## The notes

A thread file is folded from notes, never written from recall. The notes are the
work's own `progress/.scratch/<slug>.md`. A sitting without them writes them first, in the rules' talk-entry form, from its record — the owner's messages, your
reports, the tool results — then folds them; a successor's notes are the owed-work lines
the owner kept. An index entry with no file needs no notes.

## Derivation (no `[title]`)

1. Read the notes last to first — a later entry wins over the one it replaces — then
   the repo state they name (`TODO.md`, sibling thread files) where a subject never
   entered them.
2. Every thread minted must have its subject present in the notes — subject presence is
   the invariant; label compression is fine. No subject found: say so and ask. Never mint
   from nothing.
3. Segment by the rules' thread test. Follow the owner's ruling where the notes carry one
   ("create 2 todos", "combine the 2 into 1"); only when no ruling is present and the test
   finds more than one thread, ask once, proposing the partition in the (a)/(b) form —
   which entries, which files — then mint all of them on the answer. The first answer is
   provisional: a structural correction may re-cut the partition.
4. Merge and supersede: an owner-ordered archive-then-create, or combine of live
   threads, derives the new thread from the predecessors' names — and the predecessors
   close in the same gesture, or the mint duplicates them beside the live entries.
5. Spin-off vs resume: a sitting pointed at an existing thread file whose subject is new
   adds it there as owed work when the rules' thread test makes it part of that thread;
   otherwise it mints a new thread. A recurring runbook mints one standing thread.
6. Check every slug against `archive/` and live `progress/` before writing — a collision
   means a past thread owns the name. Suffix the new slug per the rules; when the
   owner's own naming pinned the collision, ask.

## The mint

- Index entry in the rules' shape, tagged per their priority ladder only when an `owner:`
  entry valued it, untagged otherwise; its context, when it has no file, passes the
  rules' test.
- `progress/<slug>.md` in the rules' shape — written only when the entry needs one:
  context past two sentences, or work the sitting already did on the thread itself. Its
  Design carries the notes per the rules: `owner:` entries as decisions naming their
  words, options not taken with their reasons, `proposed:` entries as proposed, `found:`
  entries as the evidence they are, `open:` entries as open questions.
- The fold deletes the notes it read, per the rules.
- Which repo receives the thread is the owner's call. Placement is never derived.

## Cutting groups

A thread with Steps is cut here into groups and units, because a `/todo:run` session builds one
whole group from the thread alone. Per the rules' group and unit tests, and per group:

- **Tier** — one model or `model/effort` pair for the group, the highest any of its units
  needs; `owner` for a group of decisions the run must not build.
- **Consults** — for each unit that sets a design rule, a resource budget, or a seam a later
  unit or group relies on: the exact questions a read-only consult answers before it builds.
- **Stops** — every measure the design rests on, with its bar; a miss stops the build for the
  owner.
- **Review lens** — what the review weighs beyond regressions, seams and simplification.
- **Rig** — what the group measures with, ready on the branch, how to run it, and what it
  shares that breaks a second run beside it (a port, a wallet, a fixture directory).
- **Plan** — the tactical map's cheap-check lines beside the workspace gate, and the Goal's
  measure the thread review re-runs.

Before the mint ends, read the thread as a fresh builder would. Every value a unit relies on —
a threshold, a timeout, a limit — is in the thread with its source and its arithmetic; every
test, file or helper the thread cites exists on the base branch; nothing the sitting decided
lives only in the conversation. A gap is filled, or written as an open question.
