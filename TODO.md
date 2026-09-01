# TODO — open-work index

> **Work-tracking system: `TODO.md` (this file) → `progress/` → `archive/`** — a physical Kanban.
> - **`TODO.md` = the index.** One line per thread, two at most: title, priority tag, and — once one exists — a `→ progress/<slug>.md` pointer with a short status clause. Plans, anchors, measured numbers and fix sketches never live here — they are what the progress file is for. A line answers *what* and *how important*, nothing else. What's next is whatever sits highest in the file.
> - **`progress/<slug>.md` = the detail home.** Created when a thread is picked up — or earlier, to hold the detail an index line cannot carry. Shape: goal · current state · next step · append-only log. **A resuming session reads ONLY that file.** Authored to the task — no rigid template; let the shape emerge.
> - **`archive/`** = move the file there (verbatim) when done / killed / parked. Trivial one-shot completions → `archive/completed.md`.
>
> Trivial tasks skip `progress/` (TODO line → `archive/completed.md` on done). **One home per fact** — the index here, task state in `progress/`. Don't duplicate. System installed 2026-08-24 (the previous file was a single unscoped line).
>
> **START-A-TASK RULE — the index is maintained by whoever picks the task up, at start, not after the fact.** The moment you begin a non-trivial task from this file, do **both**, in order: (1) annotate its TODO line with `→ progress/<slug>.md`; (2) create that `progress/<slug>.md` file if it does not exist (goal · current state · next step · append-only log). An in-flight task with no pointer = a broken, out-of-sync index. Trivial one-shots are the only exception (no `progress/` file — TODO → `archive/completed.md` on done).
>
> **PRIORITY:** `CRITICAL` · `HIGH` · `MEDIUM` · `LOW` — how bad it is to leave unfixed; untagged = untriaged. When a thread lands, its file moves to `archive/` and its line is deleted — no completion history in this file.

---

- [HIGH] Yarn monorepo: all six plugins ride pinned-npx packages, CLIs on npm → progress/monorepo-npx.md — executed + v0.14.0 bump on PR #1; awaiting review + owner's npm trusted-publisher entries

