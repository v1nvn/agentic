---
name: cleanup
description: Tracking hygiene — archive sweep of landed threads, log realign of stale thread files, index/progress divergence repair, evaporated-deferral detection. Use when the user asks for tracking cleanup, an archive sweep, or index repair; optional, never required.
argument-hint: (no args)
---

Load `/todo:rules` first — the archive, realignment, and index shapes this sweep repairs live there.

Sweep the repo's tracking state for what pre-adoption hand practice left behind. Every
repair follows the rules' own shapes; every finding and its repair are reported.

1. **Never-archived landed threads** — a `TODO.md` line whose thread verifiably landed
   (its plan's final unit closed, the work shipped) while its file still sits in
   `progress/`: close it by hand, exactly as the rules' closing paragraph prescribes.
2. **Index/`progress/` divergence** — a `progress/` file with no index line. Read the
   file: the work landed → archive it per the rules; the work is live → the index is
   broken, restore the line in the rules' shape. An index line with no file is not
   divergence — that is an unstarted thread.
3. **Stale thread files** — pre-adoption files that accumulated history instead of
   realigning: realign each per the rules' realignment duty.
4. **Evaporated deferrals** — work an archived thread deferred that no live `TODO.md`
   line carries: the deferral was lost at its close; restore the line so the debt
   survives.
