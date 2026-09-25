---
name: status
description: Read-only projection of work tracking — the board (no arg) or one thread's state and next step. Use for what's-next asks ("what's next on me", "status of <thread>", "what am I doing") — reads thread files, never the index alone, and writes no state.
argument-hint: [thread]
---

Load `/todo:rules` first — the index and thread-file shapes this projection reads live there.

Read-only: write no file, mint no state. No arg answers the board; `[thread]` answers one
thread.

- **The board.** Read `TODO.md` for its entries — its `## Next` queue first, where it
  keeps one. Then read every entry's thread file and take its state and next step
  from there: the index carries neither. An entry with no file is unstarted — its
  context is all there is; say so.
- **One thread.** Resolve `[thread]` to its `progress/<slug>.md` — a slug, a path, or a
  title the index's pointers match — and report its current state and its next step. No file for it: say so and stop.
