---
name: status
description: Read-only projection of work tracking — the board (no arg) or one thread's state, next step, and live log. Use for what's-next asks ("what's next on me", "status of <thread>", "what am I doing") — reads thread files, never the index alone, and writes no state.
argument-hint: [plan]
---

Read-only projection — no arg: the board (pinned top plus in-flight threads, next step read off each thread file, never the index alone); with `[plan]`: that thread's state · next step · live log. Scaffold: the full procedure is not written yet.
