# The panel row renders the theme's layout

## Goal

The subagent row is the theme's layout filtered to what a task carries — same
braces, same group grammar (style join inside a group, style sep between), same
forms via the shared segment renderers — with the task's label+description
leading. Every theme's row differs from every other's wherever its picks differ
on task items, and a corpus pin holds that forever.

## Current state

Ruled and approved on live previews (owner, this sitting): panel honors the six
per-task items — state, model, effort, bar, tokens, duration — through the picks
it already receives; layout groups drive order and grouping; forms come from
`renderSegment` (zen/pill/dim/percent/free/gauge grown onto the panel); the
panel keeps its own vlen and fit ladder (ruling `packages/statusline/src/render/panel.ts`
header). Items with no per-task data (cwd, git five, cache two, cost, lines,
rate) never render; the tick carries none of them. Status pill = task `status`,
uppercased. The engines stay separate — that closes the unify-or-drop question.

## Next step

Rewrite `renderPanel` on the layout grammar, wire `layout` through entry and
preview, regenerate panel goldens.

## Steps

| id | unit | model | review | close criteria |
|----|------|-------|--------|----------------|
| u1 | Panel renders the theme's layout; entry + preview wired | | | every theme's panel row matches the approved preview; `yarn test` green with regenerated goldens |
| u2 | Drift pin | | | a corpus test proves each theme with task-item variants differs from the default row, and every honored alternative moves the row |
| u3 | Docs + live verify | | | README and SKILL.md state the panel grammar; live `render.mjs --subagent --theme=X` checked per theme |

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
