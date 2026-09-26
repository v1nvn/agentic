# @v1nvn/statusline

The CLI behind the statusline plugin: it composes the two settings keys
that paint Claude Code's status line and agent panel, then reverts and checks
them. Pure TypeScript — the bash runtime it points at ships inside the plugin
(`plugins/statusline/runtime/`), not in this package.

User-facing docs: [root README § statusline](../../README.md#statusline).

## Quickstart

Install once (the runtime the keys point at lives in the plugin cache):

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install statusline@agentic
```

In Claude Code — type `/lab`: the agent sketches the themes as plain renders,
offers the picker in chat, and writes the pick.

In a terminal outside Claude Code — the wizard, the terminal guide:

```sh
npx -y @v1nvn/statusline@0.28.0 configure
```

Pass one stacks the five theme bars: `j/k` focus · `w` width · enter picks.
Pass two refines the pick: `j/k` move · `h/l` variant · `s` none · `t` back
to the themes · `w` width · enter saves · `q` cancels.

## Usage

One CLI, both ways: `/lab` inside a session runs these same commands; `npx`
runs them in a terminal. Every subcommand takes `--home <dir>` to operate on
another home instead of `$HOME`.

| Command | Does |
|---|---|
| `configure` | write both settings keys. Bare on a TTY: the wizard. With flags: `--theme <name>` (quiet, lean, classic, rich, custom) is the base design, item flags override it, `--layout` overrides its layout; a layout item nothing picks is an error naming it; a foreign key needs `--force` |
| `preview` | render the candidate bar and panel row through the same resolution `configure` uses, writing nothing; `--plain` strips the color escapes so glyphs survive chat |
| `catalog` | the themes block (`*` marks the live theme) then one line per item, `*` marking the live variant; `--themes` cuts to the block |
| `status` | one row per fact plus a verdict — exit 0 healthy, 1 needs action, every action row names its fix |
| `restore` | both keys back to their pre-lab values from `backup.json`, then deletes the lab data — `--dry-run` prints the plan; `--force` splices over a key changed after the takeover |

```sh
npx -y @v1nvn/statusline@0.28.0 preview --theme rich --plain          # chat-safe sketch, nothing written
npx -y @v1nvn/statusline@0.28.0 configure --theme rich                 # the write — live on the next paint
npx -y @v1nvn/statusline@0.28.0 configure --theme rich --bar percent   # one swap on top of the theme
npx -y @v1nvn/statusline@0.28.0 catalog --themes
npx -y @v1nvn/statusline@0.28.0 status
npx -y @v1nvn/statusline@0.28.0 restore
```

## Develop

```sh
yarn workspace @v1nvn/statusline build    # vite → dist/
yarn workspace @v1nvn/statusline test     # vitest
yarn lint && yarn typecheck                   # from the repo root
```

Node ≥ 22. One workspace dep: `@v1nvn/agentic-core` (usage/exit helpers).

## Modules

| File | Role |
|---|---|
| `src/cli.ts` | commander wiring — five subcommands, help text |
| `src/index.ts` | bin entry — verb dispatch, exit codes, wizard TTY deps |
| `src/configure.ts` | the writer — theme + flag resolution, key composition, ours-matcher, JSON splice engine, backup write |
| `src/resolve.ts` | runtime resolution + key parsing — the one resolution way |
| `src/restore.ts` | revert decision tree + explicit-path cleanup |
| `src/status.ts` | diagnostic rows + verdict, the live theme named |
| `src/catalog.ts` | themes block + item listing, live picks starred |
| `src/themes.ts` | the five theme bundles — layout, one variant per item, summary |
| `src/live-theme.ts` | the shared matcher — the theme a key equals exactly |
| `src/preview.ts` | the preview command — a candidate rendered, nothing written |
| `src/wizard.ts` · `src/wizard-tui.ts` | the terminal wizard — theme pass, then refinement seeded from the pick |
| `src/payloads.ts` · `src/demo-repo.ts` | preview plumbing — spawns the runtime with env + stdin; demo git repo for fixtures |
| `assets/` | preview fixtures — `payloads/p1–p4.json` (main surface), `ticks/multi.json` (panel) |

## Contracts

- `configure` writes exactly two keys of `~/.claude/settings.json` — nothing
  else on disk except `backup.json` and `captures/`.
- The key value is one inline shell command: resolver statement first, env
  assignments hugging `bash` last; statement order is pinned by golden tests.
- A theme is configure-time only: a theme write and a flags write of the same
  values produce identical settings text — the runtime never learns themes
  exist.
- The live theme is re-derived by matching the key against the bundles; no
  theme name is stored in settings.
- One resolution way: the newest-plugin-cache glob — `installed_plugins.json`
  is read nowhere.
- One splice home: the settings.json span primitives live in `configure.ts`;
  `restore` imports them.
- `restore` never resolves the runtime — it works uninstalled.
- Deletion is explicit paths only — no globs, no recursive rm.
