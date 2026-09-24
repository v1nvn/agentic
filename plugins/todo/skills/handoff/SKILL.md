---
name: handoff
description: Produce the handoff that lets this session's work continue in a fresh session (here or in another repo). Updates the repo's thread/progress file when one exists and emits a short pointer prompt; otherwise emits a self-contained paste-into-fresh-session block. Use when the user says "handoff", "handoff prompt", "fresh new session", or is ending a session to continue the work elsewhere.
argument-hint: (no args)
---

Load `/todo:rules` first — the thread-file and index shapes this handoff updates live there.

End the session with a handoff. Work out which case applies, then do exactly one.

## Case 1 — the repo has a thread file (`progress/<slug>.md`, or a `TODO.md` index pointing at one)

The durable home for session state already exists. Do not write a parallel handoff
document — that is a second home for the same facts.

1. Update the thread file: current state (what this session did, what is verified),
   next step, and any decisions/constraints learned this session. Append to its log.
2. Update the `TODO.md` index line if its status clause is now stale.
3. Print a short pointer prompt the user can paste into the fresh session:

   ```
   Continue <thread> in this repo: read progress/<slug>.md first, then pick up at
   <next step>. <One line: anything a fresh session would otherwise get wrong.>
   ```

## Case 2 — no thread file (throwaway work, cross-repo handoff, or a non-repo cwd)

Print a self-contained block the user pastes into the fresh session. Include only what
a cold session cannot reconstruct from the target repo in under a minute:

- What this session was trying to do — one line.
- Where things stand: what changed, what is committed/PR'd vs working-tree-only, what is verified.
- The next concrete step.
- Constraints and decisions learned this session that the target repo does not record:
  commands that work, the trap that was hit, the approach that was rejected and why.
- Open questions for the user.

Keep it tight. Never invent next steps that were not agreed — if the next step is
undecided, say so and list the options with a recommendation.

## Always

- Say which case you used and where the durable state now lives.
- Cross-repo handoff: name the target repo/dir at the top of the block.
- If a background agent or verification run is still in flight, say what it is and how
  to check it, so the fresh session does not redo it.
