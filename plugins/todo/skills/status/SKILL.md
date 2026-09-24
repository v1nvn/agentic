---
name: status
description: Read-only projection of work tracking — the board (no arg) or one thread's state, next step, and live log. Use for what's-next asks ("what's next on me", "status of <thread>", "what am I doing") — reads thread files, never the index alone, and writes no state.
argument-hint: [plan]
---

Load `/todo:rules` first — the index and thread-file shapes this projection reads live there.

Read-only: write no file, mint no state. No arg answers the board; `[plan]` answers one
thread.

- **The board.** Read `TODO.md` for its lines — the repo's pinned top first, where its
  deltas say one exists. Then read every line's own thread file and take the next step
  from the file, never from the index line: a stale line has answered wrong in the
  wild. Where a file and its line disagree, the file wins and the disagreement is
  named in the answer. A line with no file is an unstarted thread — say so.
- **One thread.** Resolve `[plan]` to its `progress/<slug>.md` — a slug, a path, or a
  title the index's pointers match — and report its current state, its next step, and
  its live log, which may be empty. No file for it: say so and stop.
