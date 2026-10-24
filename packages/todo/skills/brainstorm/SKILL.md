---
name: brainstorm
description: Think a piece of work through with the owner before it becomes a thread, noting the talk as it happens — the owner's words quoted, the model's proposals with their reasons, option menus with the picks, findings, open questions — so /todo:new later folds the thread from those notes instead of from recall. Use when the owner wants to explore, design or decide something that has no thread yet ("let's brainstorm X", "grill me on X", "think this through with me", "what are our options for X"), or resumes a brainstorm a handoff named. Not for talk about work that already has a thread file — its notes go to that thread's scratch file.
argument-hint: [topic]
---

Load `/todo:rules` first — the notes' home, the talk-entry form and the fold live there.

## Open

- The notes file is `progress/.scratch/brainstorm-${CLAUDE_SESSION_ID}.md`. When a
  handoff pointer or the owner names an earlier brainstorm's file, keep writing to that
  file instead: one brainstorm keeps one file across sessions.
- Create `progress/.scratch/` the way the rules say when it is absent. A repo with no
  `progress/` has no tracking: say so and stop — `/todo:init` sets it up.
- The file opens with `# <topic>`: the `[topic]` given, else the owner's opening ask in
  their own words. A resumed file keeps its heading.

## While the talk runs

- Write each entry the moment its event happens, in the rules' talk-entry form. A note
  written at the end is a recall act, and recall is what drops the owner's reasons and
  files the model's ideas as rulings.
- Offer a choice as a lettered menu, one question per menu, the recommendation marked —
  a pick against a lettered menu is the one form that reaches a thread intact.
- Investigate freely — read code, run a probe, measure. A result that bears on a choice
  becomes a `found:` entry with its source; the raw output stays out of the notes.
- Write nothing to `TODO.md` or any `progress/<slug>.md`, and never invoke `/todo:new`:
  the mint is the owner's call, made by typing it. When the talk looks settled, say so in
  one line and name what is still `open:`.

## When it ends

- The owner types `/todo:new`: it folds these notes into the thread and deletes them.
- The sitting ends without one: the notes stay where they are, and `/todo:handoff` names
  the file so the next session resumes it.
