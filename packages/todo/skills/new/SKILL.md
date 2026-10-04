---
name: new
description: Start a work-tracking thread — the TODO.md index entry always, progress/<slug>.md when the entry needs one. Use when the session opened a new thread of work ("start a thread on X", "add a line for X"), the moment a sitting picks up work that has no entry or whose entry now needs a file, or when closing one thread mints its successor in the same edit.
argument-hint: [title]
---

Load `/todo:rules` first — the index-entry and thread-file shapes this verb writes live there.

Write this sitting's threads into the index. `[title]` given: it is the title — the
primary path, the way the owner names a successor. Skipped: derive everything — titles,
slugs, and how many entries the sitting owes — from the session's own record. The index
entry is written always; `progress/<slug>.md` only when the rules say the entry gets one.

## When a start is owed

- The moment a sitting picks up work that has no entry, or whose entry now needs a file
  — not after the fact. Mid-sitting, the moment the owner says "open the thread".
- The close of a thread is itself a start: a successor is minted in the same edit that
  closes the predecessor — never a separate sitting.
- A sitting that only parked blocked work owes a thread too: the file then holds the
  resume plan, not work-in-flight.

## Derivation (no `[title]`)

1. Read the whole sitting up to the mint — the owner's messages, your reports, the tool
   results (titles are often near-verbatim lifts of prose the session read: an audit
   heading, a report section, a planning-doc sentence), and repo state (`TODO.md`,
   sibling thread files) where the subject never entered prose. Mid-sitting pivots
   included — the subject can enter late, never only in the opening ask.
2. Every thread minted must have its subject present in that record — subject presence
   is the invariant; label compression is fine. No subject found: say so and ask. Never
   mint from nothing.
3. Segment. One candidate: mint it. Several: follow the owner's ruling where the sitting
   already carries one ("create 2 todos", "combine the 2 into 1"); only when no ruling
   is present, ask once, proposing the partition in the (a)/(b) form — which entries,
   which files — then mint all of them on the answer. The first answer is provisional:
   a structural correction may re-cut the partition.
4. Merge and supersede: an owner-ordered archive-then-create, or combine of live
   threads, derives the new thread from the predecessors' names — and the predecessors
   close in the same gesture, or the mint duplicates them beside the live entries.
5. Spin-off vs resume: a sitting pointed at an existing thread file whose subject is new
   mints a new thread; it never appends to the one pointed at.
6. Check every slug against `archive/` and live `progress/` before writing — a collision
   means a past thread owns the name. Suffix the new slug per the rules; when the
   owner's own naming pinned the collision, ask.

## The mint

- Index entry in the rules' shape, tagged per their priority ladder when the sitting
  judged its value; its context, when it has no file, passes the rules' test.
- `progress/<slug>.md` in the rules' shape — written only when the entry needs one:
  context past two sentences, or work the sitting already did on the thread itself.
- The sitting's content rulings — what the file includes and excludes — ride into the
  file; they are independent of the title.
- Which repo receives the thread is the owner's call. Placement is never derived.
- A document the sitting drafted before any thread was asked for — "not a thread yet" —
  is a document, not a thread: write it, mint no index entry, open the thread only when
  the owner asks for it.
