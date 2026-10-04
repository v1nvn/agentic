# Statusline — unify the main and panel render engines

## Goal

One render engine draws both surfaces — the status line and the agent panel —
and unifying changes no rendered bytes: the golden corpora hold untouched.

## Current state

Investigated, not ruled. The thread is a deferral of the statusline-render
port (PR #8): that port closed byte-identical to the two bash files it
replaced, so unification was cut and recorded as "a deliberate re-baseline,
never a side effect of this thread" (archive/statusline-render.md). No owner
ruling stands behind either direction: `packages/statusline/src/render/panel.ts`
claims "a second renderer by ruling … Never unify them" while the entry wants
one engine — the comment and the index point opposite ways.

The divergences, read from source: the line engine's `vlen`
(`packages/statusline/src/render/engine.ts`) adds +1 per ⚡, which draws two
cells; the panel's (`packages/statusline/src/render/panel.ts`) is plain
codepoints, and the panel carries its own fit ladder, bar maker, `fmt_k` and
24-char description truncation. The vlen seam is crossed only with degenerate
values — the panel never renders ⚡, so the two measurements agree on every
string it fits and no test can tell them apart.

## Next step

Owner rules the direction: one engine as a deliberate re-baseline (the thread
then gains its steps), or two engines permanent (the thread dies, the entry
moves to Out of scope, the panel comment stands).

## Design

- Byte-faithful is the constraint: a unified engine renders both surfaces
  byte-identical to today — the goldens are the guard, and the port's rule
  holds: the re-baseline is deliberate, never a side effect of other work.
- Sequencing: the port of the eight plugins (parked on mods unit 3) moves
  statusline's tree first; the unify starts at the final paths.
