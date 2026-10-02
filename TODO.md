# TODO — open-work index

## readability

- **Site-matched extraction presets + real-world corpus** · HIGH · [packages/readability] → progress/presets-corpus.md
- **npm names follow the plugins** · MEDIUM · [packages/readability, packages/omlx]
  Wanted: the two MCP-server packages publish as `@v1nvn/readability` and `@v1nvn/omlx`, like the other seven. The `-mcp` names deprecate in the same release, with the bin names and the presets cache namespace following.

## statusline

- **Statusline — preview width flag** · LOW
  `preview` renders at a fixed 200 columns; chat panes are narrower, so a sketch wraps. Wanted: a preview width the picker can match to the pane.
- **Statusline — unify the main and panel render engines** · LOW · [packages/statusline]
  The line engine (`src/render/engine.ts`, byte-counting `vlen`) and the panel engine (`src/render/panel.ts`, codepoint `vlen`, own fit ladder) are two faithful ports of two bash files. Wanted: one engine where unifying changes no rendered bytes — a deliberate re-baseline thread, never a side effect.

## tokens

- **Mods — tokens e2e first** · HIGH · [packages/tokens] → progress/mods.md
