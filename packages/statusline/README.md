# @v1nvn/statusline

The statusline package: the CLI that writes the two settings keys painting
Claude Code's status line and agent panel, plus the resolver those keys spawn
and the renderer it imports — `dist/resolver.mjs` deployed into the plugin
data dir, `dist/render.mjs` resolved from the installed plugin. Pure
TypeScript, zero bash.

User-facing docs: [root README § statusline](../../README.md#statusline).

## Quickstart

Install once:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install statusline@agentic
```

In Claude Code — type `/statusline:lab`: the agent sketches the themes as plain renders,
offers the picker in chat, and writes the pick.

In a terminal outside Claude Code — the wizard, the terminal guide:

```sh
npx -y @v1nvn/statusline@0.35.0 configure
```

Pass one stacks the five theme bars: `j/k` focus · `w` width · enter picks.
Pass two refines the pick: `j/k` move · `h/l` variant · `s` none · `t` back
to the themes · `w` width · enter saves · `q` cancels.

## Usage

One CLI, both ways: `/statusline:lab` inside a session runs these same commands; `npx`
runs them in a terminal. Every subcommand takes `--home <dir>` to operate on
another home instead of `$HOME`.

| Command     | Does                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configure` | the sole writer — writes both settings keys and deploys the bundled resolver into the data dir. Bare on a TTY: the wizard. With flags: `--theme <name>` (quiet, lean, classic, rich, custom) is the base design, item flags override it, `--layout` overrides its layout; a layout item nothing picks is an error naming it; a foreign key needs `--force` |
| `preview`   | render the candidate bar and panel row through the same theme resolution the keys paint with, writing nothing; `--plain` strips the color escapes so glyphs survive chat                                                                                                                                                                                   |
| `catalog`   | the themes block (`*` marks the theme the key names) then one line per item, `*` marking the resolved variant; `--themes` cuts to the block                                                                                                                                                                                                                |
| `status`    | one row per fact — node, the renderer the install record resolves, both keys, the theme the key names, backup, captures — plus a verdict; exit 0 healthy, 1 needs action, every action row names its fix                                                                                                                                                   |
| `restore`   | both keys back to their pre-lab values from `backup.json`, then deletes the lab data — `--dry-run` prints the plan; `--force` splices over a key changed after the takeover                                                                                                                                                                                |

```sh
npx -y @v1nvn/statusline@0.35.0 preview --theme rich --plain          # chat-safe sketch, nothing written
npx -y @v1nvn/statusline@0.35.0 configure --theme rich                 # the write — live on the next paint
npx -y @v1nvn/statusline@0.35.0 configure --theme rich --bar percent   # one swap on top of the theme
npx -y @v1nvn/statusline@0.35.0 catalog --themes
npx -y @v1nvn/statusline@0.35.0 status
npx -y @v1nvn/statusline@0.35.0 restore
```

## Develop

```sh
yarn workspace @v1nvn/statusline build    # vite → dist/ (index.js + render.mjs + resolver.mjs)
yarn workspace @v1nvn/statusline test     # vitest
yarn lint && yarn typecheck               # from the repo root
yarn build                                # root — every package, then syncs the plugin artifact
```

`packages/statusline/render.mjs` is a committed build artifact: the root
`yarn build` copies `dist/render.mjs` there, and CI drift-gates the copy.

Node ≥ 22. One workspace dep: `@v1nvn/agentic-core` (usage/exit helpers).

## Modules

| File                                   | Role                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/cli.ts`                           | commander wiring — five subcommands, help text                                                               |
| `src/index.ts`                         | bin entry — verb dispatch, exit codes, wizard TTY deps                                                       |
| `src/configure.ts`                     | the writer — validation, diff-from-base flags, ours-matcher, JSON splice engine, backup write, renderer sync |
| `src/resolve.ts`                       | the settings keys — composition, ours-matching, and parsing back into decisions                              |
| `src/restore.ts`                       | revert decision tree + explicit-path cleanup                                                                 |
| `src/status.ts`                        | diagnostic rows + verdict — node, renderer, keys, theme                                                      |
| `src/catalog.ts`                       | themes block + item listing, resolved picks starred                                                          |
| `src/themes.ts`                        | the five theme bundles — layout, one variant per item, summary                                               |
| `src/preview.ts`                       | the preview command — a candidate rendered, nothing written                                                  |
| `src/wizard.ts` · `src/wizard-tui.ts`  | the terminal wizard — theme pass, then refinement of the pick's overrides                                    |
| `src/payloads.ts` · `src/demo-repo.ts` | preview plumbing — fixtures anchored to the moment, in-process renders; demo git repo                        |
| `src/render/entry.ts`                  | the `render.mjs` entry the keys spawn — argv to line or panel, both capture tees                             |
| `src/render/resolver.ts`               | the deployed entry the keys spawn — resolves the install record, imports its render.mjs                      |
| `src/render/install-record.ts`         | `resolveInstall` — the install record, newest usable entry wins                                              |
| `src/render/argv.ts`                   | the renderer's argv grammar — `node:util` parseArgs, never commander                                         |
| `src/render/theme.ts`                  | `resolvePaint` — the one theme resolution, shared by paint and display                                       |
| `src/render/engine.ts`                 | the line engine — compose, `vlen`, the fit ladder                                                            |
| `src/render/items.ts`                  | the item registry — 16 items, defaults, rungs, `DEFAULT_LAYOUT`                                              |
| `src/render/segments.ts`               | the per-item segment renderers                                                                               |
| `src/render/payload.ts`                | the stdin payload types + parse                                                                              |
| `src/render/git.ts`                    | the git reads                                                                                                |
| `src/render/panel.ts`                  | the agent-panel renderer — its own `vlen` and fit ladder                                                     |
| `src/render/awk.ts`                    | printf-style decimal formatting on exact IEEE bits                                                           |
| `src/render/capture.ts`                | the capture tee + `DATA_DIR`                                                                                 |
| `src/render/index.ts`                  | the in-process barrel the CLI renders through                                                                |
| `assets/`                              | preview fixtures — `payloads/p1–p4.json` (main surface), `ticks/multi.json` (panel)                          |

## Contracts

- `configure` is the sole writer: one run writes both keys and deploys the
  bundled resolver as the data-dir `render.mjs` — its only other write is
  `backup.json`. `preview`, `catalog`, and `status` write nothing;
  `captures/` is the renderer's paint-time tee, not a CLI write.
- The key value is one direct data-dir command:
  `node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean --bar=gauge || true`
  — the data-dir file is a resolver: it reads Claude Code's install record
  (`installed_plugins.json`) and imports the newest installed plugin's
  `render.mjs` with argv and stdin intact; the panel key adds the `panel`
  positional. Key spellings are pinned byte-exact by tests.
- Decisions ride argv: `--theme` first, then one `--<item>=<alt>` per pick
  that differs from the theme's own, `--layout` only when passed. Ambient
  state stays env — `NO_COLOR`, `COLUMNS`, `HOME`.
- The renderer resolves the theme at paint: item flags beat it, `--layout`
  beats its layout — one resolution path, no second one. `catalog` stars
  through it, `preview` and the wizard render through it in-process, and
  `status` reads the theme name straight from the key.
- The theme name rides the key: `status` and `catalog` read it straight from
  the key, swaps appended — `theme: lean +bar=gauge` — so a swap keeps the
  name.
- The render bundles are dependency-free (node built-ins only) and parse
  their own argv — never commander, never `@v1nvn/agentic-core` — so any
  node ≥ 18 the host has paints.
- One splice home: the settings.json span primitives live in `configure.ts`;
  `restore` imports them.
- `restore` never runs the renderer — it works uninstalled, deleting
  `render.mjs` with the rest of the lab data by explicit path.
- Deletion is explicit paths only — no globs, no recursive rm.
