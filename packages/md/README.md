# @v1nvn/md

The home of the md plugin — and its plugin root: the `md-send` CLI in `src/`,
the mod's hooks module at `hooks/register.ts` (`.ts`/`.tsx` the engine loads
directly, no build), engine tests at `tests/`. It sends a Markdown reply — the
last one, `-` on stdin, or any Markdown file — to a self-hosted
Markdown-Viewer as a `#share=` URL, opens the page, and copies the link.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — a mod serves the two surfaces the
model never reads: `/md-edit` (editable) and `/md-view` (read-only) exec the
shipped CLI and show its status line as a dim transcript row (nothing execs
until a command runs).

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install md@agentic
```

In a terminal, last reply or a named file:

```sh
npx -y @v1nvn/md@0.41.1              # editable — both panes
npx -y @v1nvn/md@0.41.1 --view       # read-only — preview pane only
npx -y @v1nvn/md@0.41.1 reply.md
```

## Usage

| Invocation | Does |
|---|---|
| `/md-edit` | the previous assistant reply → viewer, edit pane enabled, one dim status row |
| `/md-view` | the same share read-only — preview pane only |
| `npx -y @v1nvn/md@0.41.1` | the same share, printed bare |
| `npx -y @v1nvn/md@0.41.1 --view` | read-only share |
| `npx -y @v1nvn/md@0.41.1 reply.md` | that file instead of the last reply |
| `npx -y @v1nvn/md@0.41.1 -` | Markdown from stdin |

`MD_VIEWER_URL` sets the viewer (default `https://md.v1n.space`); any set
`MD_NO_OPEN` value (not just `1`) skips opening the browser.

## Develop

```sh
yarn workspace @v1nvn/md test       # the CLI side (vitest)
claude plugin validate packages/md  # the mod, as the engine reads it
claude plugin test packages/md      # the mod, through the engine
yarn lint && yarn typecheck         # from the repo root (typecheck
                                    #   covers tsconfig.mods.json too)
```

The mod API is early access and moves between Claude Code releases — a build
that refuses the module loads nothing, so validate after every engine update
and re-vendor `types/claude-code.d.ts` (repo root) from the engine-laid
`.claude-plugin/types/` when it changes. Read `references/mods.md` first.

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`md-send`) — dispatch, exit codes |
| `src/share.ts` | the `#share=` URL, browser open, clipboard, status line |
| `hooks/register.ts` | the mod: registers `/md-edit` and `/md-view`, execs the CLI, shows its line |
| `bin/send.mjs` | the standalone build the mod execs — committed, synced by `yarn build` |

## Contracts

- One status line of output (e.g. `Opened in Markdown-Viewer (link copied).`).
- The document reaches only the configured viewer — no third-party service.
- `/md-edit` and `/md-view` are each one `node <plugin root>/bin/send.mjs`
  exec through the session's Bash tool (`/md-view` adds `--view`) — the same
  share `npx md-send` runs. The one allow rule both need is
  `Bash(node <plugin root>/bin/send.mjs:*)`; the first run asks for it once,
  then it is remembered. Its status line is a dim transcript row the model
  never reads.
