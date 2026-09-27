# agentic

Eight Claude Code plugins, installed independently from one marketplace. The code lives
in eight npm packages (`@v1nvn/*`); each plugin directory is a thin manifest that runs
its package through version-pinned `npx` — except todo: manifest + skills, no package.

| Plugin          | What it does                                                                                                                           | Invoke                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this"                           |
| **omlx**        | Delegate bulk work — commit messages, docstrings, summarization, extraction, image description — to a local omlx inference server.     | the agent routes on its own, or "ask the local model" |
| **rm**          | Beam the last reply to a reMarkable as EPUB.                                                                                           | `/rm:send`                                            |
| **md**          | Send the last reply to a Markdown-Viewer as a `#share=` URL — editable or read-only.                                                   | `/md:edit`, `/md:view`                                |
| **zai**         | Query GLM Coding Plan quota and usage.                                                                                                 | `/zai:usage`                                          |
| **tokens**      | Per-model token usage and cache hit rate from local transcripts.                                                                       | `/tokens:usage`                                       |
| **statusline**  | Pick a theme for the status line + agent panel, or revert the setup.                                                                   | `/lab`                                                |
| **todo**        | Work tracking — the rules plus six verbs over `TODO.md`, `progress/`, `references/`, `archive/`. Every repo carries data only.         | `/todo:run <plan>`, or a what's-next ask              |

`rm`, `md`, `zai`, and `tokens` run zero-token: a `UserPromptExpansion` hook intercepts the command before it reaches the model.

## Prerequisites

- Claude Code
- Node.js — every plugin runs its package through `npx`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:6659`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, md, zai, tokens, statusline, todo
```

Start Claude Code and run the command shown above for the plugin you installed.

## In a plain shell

The four tool CLIs run outside Claude Code too, same bins the hooks use:

```sh
npx -y @v1nvn/zai@0.29.0        # GLM Coding Plan usage report
npx -y @v1nvn/tokens@0.29.0     # token usage + cache hit rate from local transcripts
npx -y @v1nvn/rm@0.29.0         # last reply → reMarkable (or a file: npx -y @v1nvn/rm@0.29.0 reply.md)
npx -y @v1nvn/md@0.29.0         # last reply → Markdown-Viewer (--view for read-only; or a file: npx -y @v1nvn/md@0.29.0 reply.md)
```

`rm` needs `pandoc` plus `ssh`/`scp` access to the device (`REMARKABLE_HOST`, default
`remarkable`, device dir `REMARKABLE_DIR`, default `/home/root/books`); `md` honors
`MD_VIEWER_URL` (default `https://md.v1n.space`) and `MD_NO_OPEN=1` to skip opening
the browser.

## statusline

Five commands drive both surfaces. In Claude Code, `/lab` sketches the themes
as plain renders and offers the picker in chat — the agent writes the pick.
In a terminal outside Claude Code, the wizard is the guide:

```sh
npx -y @v1nvn/statusline@0.29.0 configure                          # the wizard — bare, on a TTY
npx -y @v1nvn/statusline@0.29.0 configure --theme lean             # a theme write
npx -y @v1nvn/statusline@0.29.0 configure --theme lean --bar gauge # a theme plus one swap
npx -y @v1nvn/statusline@0.29.0 preview --theme rich --plain       # chat-safe sketch, nothing written
npx -y @v1nvn/statusline@0.29.0 catalog                            # themes block, then one line per item
npx -y @v1nvn/statusline@0.29.0 restore                            # both keys back to their pre-lab values
npx -y @v1nvn/statusline@0.29.0 status                             # rows + verdict — exit 0 healthy, 1 needs action
```

`configure` is the sole writer: one run touches exactly the `statusLine` and
`subagentStatusLine` keys of `~/.claude/settings.json` and syncs the bundled
renderer (`render.mjs`) into the plugin data dir — the whole write footprint.
Each value is one inline shell command: `node` on that data-dir renderer, the
decisions as flags — `--theme` first, then one `--<item>=<alt>` per pick that
differs from the theme's own, `--layout` only when passed; the panel key adds
the `panel` positional. Raw:

```sh
node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" --theme=lean --bar=gauge || true
node "$HOME/.claude/plugins/data/statusline-agentic/render.mjs" panel --theme=lean || true
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
data-dir renderer, both keys, config drift, the theme, backup, captures —
one row per fact plus a verdict, every action row naming its fix. `/lab`
inside a session runs the same commands.

Repo and machine:

```
repo
  packages/statusline/                the CLI and the renderer — pure TS, zero bash
    src/  test/  dist/                dist/ holds index.js and render.mjs
    assets/payloads/  p1–p4.json          preview fixtures, main surface
    assets/ticks/     multi.json          preview fixtures, agent panel
  plugins/statusline/
    SKILL.md                              the /lab skill — model-taught entry point

machine, after `claude plugin install statusline@agentic`
  ~/.claude/plugins/data/statusline-agentic/
    render.mjs                            the renderer — synced in by configure, spawned by both keys
    backup.json                           pre-lab key values — first takeover wins
    captures/main.json  captures/tick.json  every paint's stdin, teed by the renderer; feeds previews
  ~/.claude/settings.json                 statusLine + subagentStatusLine → the inline commands
```

Install: `claude plugin marketplace add v1nvn/agentic`, then
`claude plugin install statusline@agentic`, then `/lab` in a session — or
`npx -y @v1nvn/statusline@0.29.0 configure` in a terminal, where the wizard
previews both surfaces at 80/120/200 columns and saves.

Uninstall runs `npx -y @v1nvn/statusline@0.29.0 restore` first, then uninstalls
the plugin: a plain uninstall deletes the data dir — `backup.json` and
`render.mjs` go with it — and the keys left behind point `node` at a renderer
that is gone: a blank line at the next paint.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
packages/                           the eight npm packages — one yarn workspace
  readability-mcp/  omlx-mcp/       the two MCP servers (@v1nvn/readability-mcp, @v1nvn/omlx-mcp)
  core/                             @v1nvn/agentic-core — last-reply + text formatting, shared by the tools
  zai/  tokens/  rm/  md/           the tool CLIs (zai-usage, tokens-report, rm-send, md-send)
  statusline/                    the configure CLI + renderer — pure TS (@v1nvn/statusline)
plugins/                            the eight plugins — manifests, skills, config wrappers; no code
  readability/  omlx/               .mcp.json (pinned npx) + plugin.json
  zai/  tokens/  rm/  md/           hooks.json (pinned npx) + plugin.json + commands/
  statusline/                   root SKILL.md (see statusline above)
  todo/                         plugin.json + skills/ — the rules and six verbs, no package
```

Versions ride one lockstep train: `.claude-plugin/marketplace.json` is the source, and
`set-version.mjs` mirrors it into every package, plugin manifest, and npx pin.
