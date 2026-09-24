---
name: handoff
description: Produce the handoff that continues this session's work in a fresh session — updates the repo's thread/progress file when one exists and emits a short pointer prompt; otherwise emits a self-contained paste-into-fresh-session block. Use when the user says "handoff", "handoff prompt", "fresh new session", or is ending a session to continue the work elsewhere.
argument-hint: (no args)
---

Hand this session's work to a fresh one — update the thread's `progress/` file and emit a short pointer prompt, or emit a self-contained paste-in block when no thread file exists. Scaffold: the full procedure is not written yet.
