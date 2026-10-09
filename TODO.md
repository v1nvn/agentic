# TODO — open-work index

## Next

1. **Audit — refactor** · HIGH · [packages] → progress/audit-refactor.md
2. **Rules plugin — base set + AGENTS.md lifecycle** · HIGH · [packages] → progress/rules-plugin.md
3. **Mods port — release and live-verify the four commands** · HIGH · [packages]
   Merge the mods-port PR, release the train, then verify `/rm-send`, `/md-edit`, `/md-view`, `/zai-usage` from a fresh install — the thread record is archive/mods-port.md.

## readability

- **Site-matched extraction presets + real-world corpus** · HIGH · [packages/readability] → progress/presets-corpus.md

## statusline

- **Panel row — token-samples sparkline** · LOW · [packages/statusline]
  The tick carries 16 token samples per task, rendered nowhere. Wanted: a sparkline item on the row.
- **Panel row — per-task cache and cost** · LOW · [packages/statusline]
  The tick carries neither; the only door today is a 3-hop transcript mine. Revisit when Claude Code ships them in the tick.
- **Statusline — preview width flag** · LOW
  `preview` renders at a fixed 200 columns; chat panes are narrower, so a sketch wraps. Wanted: a preview width the picker can match to the pane.
- **Statusline — lab as a pane**
  Wanted: the lab as a zero-token mod pane replacing the model-read skill; recommended, unruled — the consult is archived at archive/mods-port.md.

## todo

- **Rules promotion triage — where a thread's rules land** · MEDIUM · open
  Parked from the audit consult (2026-10-09): draw the line for when a rule earned in a
  thread promotes to the consumer repo's `references/`, and when it belongs in todo's own
  rules in this repo. Strict by default; `references/` must not accrete.
- **todo — board pane or band**
  Wanted: a zero-token always-visible board; the cost is an island parser of shapes `todo:rules` defines in prose. Unruled — held in the archived consult, archive/mods-port.md.

## Out of scope

- **zai quota status line** — the always-on clock exec cut from tokens stands as the precedent
- **readability / omlx / enhansome as mods** — model-facing by design; mods are the zero-token UI door
