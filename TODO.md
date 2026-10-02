# TODO — open-work index

## readability

- **Site-matched extraction presets + real-world corpus** · HIGH · [packages/readability-mcp] → progress/presets-corpus.md

## todo

- **Todo plugin — adopt** · HIGH
  Wanted on the owner machine: a fresh Claude Code session lists the seven `todo:*` skills, `/todo:rules` answers, and touching a `TODO.md` loads the rules skill.
- **Todo plugin — land the seven migrated repos** · MEDIUM
  Wanted: each of the seven migrated repos — testril, firstmenu, homelab-gitops, stonks, streamdeck, enhansome/action, enhansome/webapp — carries its tracking fold on its default branch.

## statusline

- **Statusline — preview width flag** · LOW
  `preview` renders at a fixed 200 columns; chat panes are narrower, so a sketch wraps. Wanted: a preview width the picker can match to the pane.
- **Statusline — unify the main and panel render engines** · LOW · [packages/statusline]
  The line engine (`src/render/engine.ts`, byte-counting `vlen`) and the panel engine (`src/render/panel.ts`, codepoint `vlen`, own fit ladder) are two faithful ports of two bash files. Wanted: one engine where unifying changes no rendered bytes — a deliberate re-baseline thread, never a side effect.
- **Statusline — delete the old `@v1nvn/statusline-lab` npm name** · LOW
  Wanted: no version of `@v1nvn/statusline-lab` left on npm, so the package lives under one name, `@v1nvn/statusline`. `https://registry.npmjs.org/@v1nvn%2fstatusline-lab` shows what remains.

## tokens

- **Mods — tokens e2e first** · HIGH · [packages/tokens] → progress/mods.md

## Parked

- **Statusline — adopt `/lab`** · LOW — revisit when statusline-render lands
