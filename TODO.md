# TODO — open-work index

## readability

- **Site-matched extraction presets + real-world corpus** · HIGH · [packages/readability] → progress/presets-corpus.md
- **npm names follow the plugins** · MEDIUM · [packages/readability, packages/omlx]
  Wanted: the two MCP-server packages publish as `@v1nvn/readability` and `@v1nvn/omlx`, like the other seven. The `-mcp` names deprecate in the same release, with the bin names and the presets cache namespace following.

## statusline

- **Statusline — preview width flag** · LOW
  `preview` renders at a fixed 200 columns; chat panes are narrower, so a sketch wraps. Wanted: a preview width the picker can match to the pane.
- **Statusline — unify the main and panel render engines** · LOW · [packages/statusline] → progress/render-engines.md

## tokens

- **Mods — tokens e2e first** · HIGH · [packages/tokens] → progress/mods.md

## Parked

- **Port the eight plugins to the package-home root** · MEDIUM · [packages] — revisit when the mods thread's unit 3 verifies live
  Wanted: every plugin's root is its package home (the G1b shape tokens lands in), `plugin/` folders gone — marketplace sources, manifests, hooks paths and the CLAUDE.md layout law move with them.
