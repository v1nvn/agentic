# @v1nvn/statusline

The CLI behind the statusline plugin: it composes the two settings keys
that paint Claude Code's status line and agent panel, then reverts and checks
them. Pure TypeScript — the bash runtime it points at ships inside the plugin
(`plugins/statusline/runtime/`), not in this package.

User-facing docs: [root README § statusline](../../README.md#statusline).

## Quickstart

The wizard is the way to configure — both surfaces, live previews, enter saves.

Install once (the runtime the keys point at lives in the plugin cache):

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install statusline@agentic
```

In Claude Code — type `/lab`, run the wizard it hands you (`!`
runs it in your session with a real terminal):

```
! npx -y @v1nvn/statusline@0.25.0 configure
```

In a terminal — same command, bare:

```sh
npx -y @v1nvn/statusline@0.25.0 configure
```

`j/k` move · `h/l` switch design · `w` width · enter saves · `q` cancels.

## Usage

One CLI, both ways: `/lab` inside a session runs these same
commands; `npx` runs them in a terminal.

| Command | Does |
|---|---|
| `configure` | bare on a TTY: the wizard. With flags: strict — every layout item needs a variant flag or `--fallback=default\|existing`; `--dry-run` renders without writing; a foreign key needs `--force` |
| `catalog` | one line per item, `*` marks the live variant |
| `status` | one row per fact plus a verdict — exit 0 healthy, 1 needs action, every action row names its fix |
| `restore` | both keys back to their pre-lab values from `backup.json`, then deletes the lab data — run it before uninstalling |

```sh
npx -y @v1nvn/statusline@0.25.0 catalog
npx -y @v1nvn/statusline@0.25.0 configure --model block --bar gauge --fallback=default --dry-run   # preview, write nothing
npx -y @v1nvn/statusline@0.25.0 configure --model block --bar gauge --fallback=default             # the write
npx -y @v1nvn/statusline@0.25.0 status
npx -y @v1nvn/statusline@0.25.0 restore
```

## Develop

```sh
yarn workspace @v1nvn/statusline build    # vite → dist/, chmod +x the bin
yarn workspace @v1nvn/statusline test     # vitest
yarn lint && yarn typecheck                   # from the repo root
```

Node ≥ 22. One workspace dep: `@v1nvn/agentic-core` (usage/exit helpers).

## Modules

| File | Role |
|---|---|
| `src/cli.ts` | commander wiring — four subcommands, help text |
| `src/index.ts` | bin entry — verb dispatch, exit codes, wizard TTY deps |
| `src/configure.ts` | the writer — key composition, ours-matcher, JSON splice engine, backup write, dry-run render |
| `src/resolve.ts` | runtime resolution + key parsing — the one resolution way |
| `src/restore.ts` | revert decision tree + explicit-path cleanup |
| `src/status.ts` | diagnostic rows + verdict |
| `src/catalog.ts` | item listing, live variant starred |
| `src/wizard.ts` · `src/wizard-tui.ts` | the terminal wizard — previews both surfaces, saves via `configure` |
| `src/payloads.ts` · `src/demo-repo.ts` | preview plumbing — spawns the runtime with env + stdin; demo git repo for fixtures |
| `assets/` | preview fixtures — `payloads/p1–p4.json` (main surface), `ticks/multi.json` (panel) |

## Contracts

- `configure` writes exactly two keys of `~/.claude/settings.json` — nothing
  else on disk except `backup.json` and `captures/`.
- The key value is one inline shell command: resolver statement first, env
  assignments hugging `bash` last; statement order is pinned by golden tests.
- One resolution way: the newest-plugin-cache glob — `installed_plugins.json`
  is read nowhere.
- One splice home: the settings.json span primitives live in `configure.ts`;
  `restore` imports them.
- `restore` never resolves the runtime — it works uninstalled.
- Deletion is explicit paths only — no globs, no recursive rm.
