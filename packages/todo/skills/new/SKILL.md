---
name: new
description: Start a work-tracking thread — the TODO.md index entry always, and progress/<slug>.md folded from the sitting's notes when the entry needs one. Use when the session opened a new thread of work ("start a thread on X", "add a line for X"), the moment a sitting picks up work that has no entry or whose entry now needs a file, when closing one thread mints its successors in the same edit, or when the owner types /todo:new to close a brainstorm. Inside an open /todo:brainstorm, only the owner's typed /todo:new starts it.
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
- Inside a `/todo:brainstorm`, only when the owner types `/todo:new`.
- A thread's close mints its successors — one per goal kept — from owed work the owner
  kept, in the same edit that closes the predecessor, never a separate sitting.
- A sitting that only parked blocked work owes a thread too: the file then holds the
  resume plan, not work-in-flight.

## The notes

A thread file is folded from notes, never written from recall. The notes are the
brainstorm's `progress/.scratch/brainstorm-<session id>.md` this sitting wrote or resumed,
else the work's own `progress/.scratch/<slug>.md`. A sitting with neither writes them
first, in the rules' talk-entry form, from its record — the owner's messages, your
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
