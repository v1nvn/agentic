---
name: run
description: Execute a progress/<plan>.md plan file unit by unit — one subagent per unit, each closed on its stated criteria, one commit per unit; landing the final unit closes the thread in the same sitting. Use when the user points at a plan file and asks to run it, fully or a named subset of units.
argument-hint: <plan> [units]
---

Execute a `progress/<plan>.md` plan unit by unit — one subagent per unit, each closed on its stated close criteria, one commit per unit; landing a thread's final unit closes the thread in the same sitting, never waiting on merge. Scaffold: the full procedure is not written yet.
