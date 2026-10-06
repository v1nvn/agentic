# agentic

Nine Claude Code plugins, installed independently from one marketplace. The code lives
in eight npm packages (`@v1nvn/*`); each plugin directory is a thin manifest — most run
their package through version-pinned `npx`; `enhansome` is an HTTP MCP config pointing
at the hosted registry server, and `todo` is manifest + skills, no package.

| Plugin          | What it does                                                                                                                           | Invoke                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this"                           |
| **omlx**        | Delegate bulk work — commit messages, docstrings, summarization, extraction, image description — to a local omlx inference server.     | the agent routes on its own, or "ask the local model" |
| **enhansome**   | Search the enhansome registry forest — curated registries and the repos they carry — via the hosted MCP server.                        | the agent routes on its own, or "search the registry" |
| **rm**          | Beam the last reply to a reMarkable as EPUB.                                                                                           | `/rm-send`                                            |
| **md**          | Send the last reply to a Markdown-Viewer as a `#share=` URL — editable or read-only.                                                   | `/md-edit`, `/md-view`                                |
| **zai**         | GLM Coding Plan quota and usage — the report as a pane.                                                                                | `/zai-usage`                                          |
| **tokens**      | Live token usage — the full report as a pane.                                                      | `/tokens-usage`                                       |
| **statusline**  | Pick a theme for the status line + agent panel, or revert the setup.                                                                   | `/statusline:lab`                                                |
| **todo**        | Work tracking — the rules plus six verbs over `TODO.md`, `progress/`, `references/`, `archive/`. Every repo carries data only.         | `/todo:run <plan>`, or a what's-next ask              |

`rm`, `md`, `zai` and `tokens` are zero-token the mod way — a function-hook module serves the command, a surface the model never reads.

## Prerequisites

- Claude Code
- Node.js — the package-backed plugins run through `npx`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:6659`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, enhansome, md, zai, tokens, statusline, todo
```

Start Claude Code and run the command shown above for the plugin you installed.

## In a plain shell

The four tool CLIs run outside Claude Code too:

```sh
npx -y @v1nvn/zai@0.37.0        # GLM Coding Plan usage report
npx -y @v1nvn/tokens@0.37.0     # token usage + cache hit rate from local transcripts
npx -y @v1nvn/rm@0.37.0         # last reply → reMarkable (or a file: npx -y @v1nvn/rm@0.37.0 reply.md)
npx -y @v1nvn/md@0.37.0         # last reply → Markdown-Viewer (--view for read-only; or a file: npx -y @v1nvn/md@0.37.0 reply.md)
```

`rm` needs `pandoc` plus `ssh`/`scp` access to the device (`REMARKABLE_HOST`, default
`remarkable`, device dir `REMARKABLE_DIR`, default `/home/root/books`); `md` honors
`MD_VIEWER_URL` (default `https://md.v1n.space`) and `MD_NO_OPEN=1` to skip opening
the browser.

## statusline

Five commands drive both surfaces. In Claude Code, `/statusline:lab` sketches the themes
as plain renders and offers the picker in chat — the agent writes the pick.
In a terminal outside Claude Code, the wizard is the guide:

```sh
npx -y @v1nvn/statusline@0.37.0 configure                          # the wizard — bare, on a TTY
npx -y @v1nvn/statusline@0.37.0 configure --theme lean             # a theme write
npx -y @v1nvn/statusline@0.37.0 configure --theme lean --bar gauge # a theme plus one swap
npx -y @v1nvn/statusline@0.37.0 preview --theme rich --plain       # chat-safe sketch, nothing written
npx -y @v1nvn/statusline@0.37.0 catalog                            # themes block, then one line per item
npx -y @v1nvn/statusline@0.37.0 restore                            # both keys back to their pre-lab values
npx -y @v1nvn/statusline@0.37.0 status                             # rows + verdict — exit 0 healthy, 1 needs action
```

`configure` is the sole writer: one run touches exactly the `statusLine` and
`subagentStatusLine` keys of `~/.claude/settings.json` and deploys a resolver
(`render.mjs`) into the plugin data dir — the whole write footprint.
Each value is one inline shell command: `node` on that data-dir resolver, the
decisions as flags — `--theme` first, then one `--<item>=<alt>` per pick that
differs from the theme's own, `--layout` only when passed; the subagent key
adds `--subagent`, the one valueless flag. The resolver reads Claude Code's install record
(`installed_plugins.json`) and imports the newest installed plugin's
`render.mjs`, so a plugin update repaints with no rerun. Raw:

```sh
node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean --bar=gauge || true
node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --subagent --theme=lean || true
```

The layout — brace clusters of item ids — rides as `--layout` only when
passed; the theme's layout holds otherwise. With flags, `configure` is
strict — `--theme <name>` (quiet, lean, classic, rich, custom) is the base
design, item flags override it, and a layout item nothing picks is an error
naming it; `classic` names the shipped defaults. The theme resolves at paint,
and `preview` renders a candidate through the same resolution without
writing — `--plain` strips the color escapes so the sketch survives chat. A
foreign settings key is refused unless `--force`. The first takeover saves
the pre-lab key values to `backup.json`; `restore` splices them back
byte-exact — keys absent before the lab are removed — then deletes the lab
data. The theme name rides the key — `status` and `catalog` read it from
there, and swaps keep the name. `status` checks the install: node, the
renderer the install record resolves, both keys, config drift, the theme,
backup, captures — one row per fact plus a verdict, every action row naming
its fix. `/statusline:lab` inside a session runs the same commands.

Repo and machine:

```
repo
  packages/statusline/                the CLI and the renderer — pure TS, zero bash
    src/  test/  dist/                dist/ holds index.js and render.mjs
    assets/payloads/  p1–p4.json          preview fixtures, main surface
    assets/ticks/     multi.json          preview fixtures, agent panel
    SKILL.md                          the /statusline:lab skill — model-taught entry point
    render.mjs                        the renderer — committed build artifact, synced by `yarn build`

machine, after `claude plugin install statusline@agentic`
  ~/.claude/plugins/cache/agentic/statusline/<version>/   the installed plugin — its render.mjs paints
  ~/.claude/plugins/data/statusline-agentic/
    render.mjs                            the resolver — deployed by configure, spawned by both keys
    backup.json                           pre-lab key values — first takeover wins
    captures/main.json  captures/tick.json  every paint's stdin, teed by the renderer; feeds previews
  ~/.claude/settings.json                 statusLine + subagentStatusLine → the inline commands
```

Install: `claude plugin marketplace add v1nvn/agentic`, then
`claude plugin install statusline@agentic`, then `/statusline:lab` in a session — or
`npx -y @v1nvn/statusline@0.37.0 configure` in a terminal, where the wizard
previews both surfaces at 80/120/200 columns and saves.

Uninstall runs `npx -y @v1nvn/statusline@0.37.0 restore` first, then uninstalls
the plugin: a plain uninstall deletes the data dir — `backup.json` and the
resolver go with it — and the keys left behind point `node` at a file that is
gone: a blank line at the next paint.

## Layout

A plugin's root is its package home; there is no `plugins/` directory — all
nine plugins root at `packages/<name>/` itself. Seven homes publish
npm code.

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into the package homes
packages/                           one yarn workspace — every plugin's home
  readability/  omlx/               the two MCP servers (@v1nvn/readability, @v1nvn/omlx) — the plugin root itself:
                                     .claude-plugin/ + .mcp.json (pinned npx) + dev.mcp.json (dev wiring) (+ skills/)
  core/                             @v1nvn/agentic-core — last-reply + CLI plumbing, shared by the tools
  rm/  md/  zai/                    the tool CLIs (rm-send, md-send, zai-usage) + their mods — the plugin root itself:
                                     .claude-plugin/ + hooks/register.ts(x) + tests/ + bin/*.mjs
                                     (standalone build the mod execs, committed)
                                     zai also types/ (state contract)
  tokens/                            tokens-report CLI + the tokens mod — the plugin root itself:
                                     .claude-plugin/ + hooks/register.tsx + tests/ + types/
                                     (state contract), island aggregate/format/text.ts in src/
                                     (text.ts is the one fixed-width home, via @v1nvn/tokens/text),
                                     bin/report.mjs (standalone build the mod execs, committed)
  statusline/                        the configure CLI + renderer, pure TS (@v1nvn/statusline) — the plugin root itself:
                                     .claude-plugin/ + SKILL.md (see statusline above) + render.mjs (committed artifact)
  enhansome/  todo/                 package-less homes — the plugin root itself:
                                    .claude-plugin/ + .mcp.json, todo: .claude-plugin/ + skills/ + README.md
types/claude-code.d.ts              vendored mod API declarations, engine-written per version
tsconfig.mods.json                  type-checks every mod package against the vendored types
```

Versions ride one lockstep train: `.claude-plugin/marketplace.json` is the source, and
`set-version.mjs` mirrors it into every package, plugin manifest, and npx pin.
