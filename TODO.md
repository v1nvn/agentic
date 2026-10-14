# TODO — open-work index

## Next

1. **Audit — refactor** · HIGH · [packages] → progress/audit-refactor.md
2. **Rulings — port into the marketplace as the tenth plugin** · HIGH · [packages] → progress/rulings-port.md
3. **Rules plugin — catalogue · config · per-session render** · HIGH · [packages] → progress/rules-plugin.md
4. **Mods port — live-verify from a fresh install** · HIGH · [packages]
   Verify `/rm-send`, `/md-edit`, `/md-view`, `/zai-usage` and the tokens pane `/tokens-usage` from a fresh install — records: archive/mods-port.md, archive/zai-pane.md.

## readability

- **Site presets — real-world corpus and backlog** · HIGH · [packages/readability] → progress/presets-corpus.md

## statusline

- **Panel row — token-samples sparkline** · LOW · [packages/statusline]
  The tick carries 16 token samples per task, rendered nowhere. Wanted: a sparkline item on the row.
- **Statusline — preview width flag** · LOW · [packages/statusline]
  `preview` renders at a fixed 200 columns; chat panes are narrower, so a sketch wraps. Wanted: a preview width the picker can match to the pane.
- **Statusline — lab as a pane** · [packages/statusline]
  Wanted: the lab as a zero-token mod pane replacing the model-read skill; recommended, unruled — the consult is archived at archive/mods-port.md.

## todo

- **Rules promotion triage — where a thread's rules land** · MEDIUM · [packages/todo]
  Draw the line for when a rule earned in a thread promotes to the consumer repo's
  `references/`, and when it belongs in todo's own rules in this repo — the consult's
  rulings are recorded in progress/audit-refactor.md. Strict by default; `references/`
  must not accrete.
- **todo — board pane or band** · [packages/todo]
  Wanted: a zero-token always-visible board; the cost is an island parser of shapes `todo:rules` defines in prose. Unruled — held in the archived consult, archive/mods-port.md.
- **todo:run — re-measure under the role agents** · HIGH
  Wanted: a fresh `/todo:run` of `progress/audit-refactor.md` whose `/todo:postmortem` per-unit wall, tokens and minutes to first edit sit beside the baseline recorded in archive/run-costs.md.

## Parked

- **Panel row — per-task cache and cost** · LOW · [packages/statusline] — revisit when Claude Code ships them in the tick
  The tick carries neither; the only door today is a 3-hop transcript mine.
- **Panel row — retire the transcript-derived used-context reader** · LOW · [packages/statusline] → progress/tokencount-reader.md — revisit when a Claude Code changelog entry fixes subagentStatusLine's tokenCount

## Out of scope

- **zai quota status line** — the always-on clock exec cut from tokens stands as the precedent
- **readability / omlx / enhansome as mods** — model-facing by design; mods are the zero-token UI door
