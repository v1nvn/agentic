# The panel row renders the theme's layout

## Goal

The subagent row is the theme's layout filtered to what a task carries — same
braces, same group grammar (style join inside a group, style sep between), same
forms via the shared segment renderers — with the task's label+description
leading. Every theme's row differs from every other's wherever its picks differ
on task items, and a corpus pin holds that forever.

## Current state

Landed on main. The panel renders the theme's layout over the six task items
with the shared segment registry; the drift pin holds theme-reach and
per-alternative responsiveness; both READMEs state the grammar; verified live
per theme through `render.mjs --subagent`. The engines stay separate — that
rules the old unify-or-drop question: kept separate, theme unified.

## Next step

None — closed. Cut as v0.39.1.

## Steps

| id | unit | model | review | close criteria |
|----|------|-------|--------|----------------|
| u1 | Panel renders the theme's layout; entry + preview wired | | | every theme's panel row matches the approved preview; `yarn test` green with regenerated goldens — 0e4d8a5 |
| u2 | Drift pin | | | a corpus test proves each theme with task-item variants differs from the default row, and every honored alternative moves the row — 08f4f1e |
| u3 | Docs + live verify | | | README and SKILL.md state the panel grammar; live `render.mjs --subagent --theme=X` checked per theme — 0c184c4 |

## Plan

- u1 reuses `RUNG_ORDERS`/`demote` semantics for the squeeze ladder; gauge demotes
  to flat first (engine's `demote` no-ops off-rung alts — panel cannot).
- Goldens regenerate byte-exact from the corpus runner; width-boundary comments
  re-measured against the new ladder.
- u2 pin lives beside the corpus, the panel twin of engine-corpus's
  "every registered alternative has a segment renderer".
- No per-task cache/cost: not in the tick (checked live — task fields are
  id/type/status/description/label/model/startTime/contextWindowSize/tokenCount/
  tokenSamples/cwd). Upstream carrying them is a new thread when it ships.
- tokenSamples sparkline: a new item, a later thread, not this one.

## Design

The row: `head {theme groups ∩ task items}`, head = label + truncated desc as
its own group. Working picks start from the resolved theme picks; the ladder
steps: drop desc, duration none, tokens compact, bar flat (gauge lands here),
bar flat6, model strip, bar flat4, state none, effort hidden, tokens none,
bar percent, bar none. `style` keeps its warn-on-unknown; the same warn
generalizes to every honored item.
