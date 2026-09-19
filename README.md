# agentic

Seven Claude Code plugins, installed independently from one marketplace. The code lives
in eight npm packages (`@v1nvn/*`); each plugin directory is a thin manifest that runs
its package through version-pinned `npx`.

| Plugin          | What it does                                                                                                                           | Invoke                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this"                           |
| **omlx**        | Delegate bulk work — commit messages, docstrings, summarization, extraction, image description — to a local omlx inference server.     | the agent routes on its own, or "ask the local model" |
| **rm**          | Beam the last reply to a reMarkable as EPUB.                                                                                           | `/rm:send`                                            |
| **md**          | Send the last reply to a Markdown-Viewer as a `#share=` URL — editable or read-only.                                                   | `/md:edit`, `/md:view`                                |
| **zai**         | Query GLM Coding Plan quota and usage.                                                                                                 | `/zai:usage`                                          |
| **tokens**      | Per-model token usage and cache hit rate from local transcripts.                                                                       | `/tokens:usage`                                       |
| **statusline-lab**  | Browse the design catalog and configure the status line + agent panel.                                                                | `/statusline-lab`                                 |

`rm`, `md`, `zai`, and `tokens` run zero-token: a `UserPromptExpansion` hook intercepts the command before it reaches the model.

## Prerequisites

- Claude Code
- Node.js — every plugin runs its package through `npx`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:6659`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, md, zai, tokens, statusline-lab
```

Start Claude Code and run the command shown above for the plugin you installed.

## In a plain shell

The four tool CLIs run outside Claude Code too, same bins the hooks use:

```sh
npx -y @v1nvn/zai        # GLM Coding Plan usage report
npx -y @v1nvn/tokens     # token usage + cache hit rate from local transcripts
npx -y @v1nvn/rm         # last reply → reMarkable (or a file: npx -y @v1nvn/rm reply.md)
npx -y @v1nvn/md         # last reply → Markdown-Viewer (--view for read-only; or a file: npx -y @v1nvn/md reply.md)
```

`rm` needs `pandoc` plus `ssh`/`scp` access to the device (`REMARKABLE_HOST`, default
`remarkable`); `md` honors `MD_VIEWER_URL` (default `https://md.v1n.space`) and
`MD_NO_OPEN=1` to skip opening the browser.

## statusline-lab

Two commands drive both surfaces:

```sh
npx -y @v1nvn/statusline-lab catalog                                       # one line per item, * marks the live variant
npx -y @v1nvn/statusline-lab configure --model block --bar gauge --fallback=default
npx -y @v1nvn/statusline-lab configure                                     # the wizard — bare, on a TTY
```

`configure` writes two generated scripts under
`~/.claude/plugins/data/statusline-lab-agentic/` and points the `statusLine` and
`subagentStatusLine` keys of `~/.claude/settings.json` at them; both surfaces go
live on the next paint. The configuration lives in the generated script itself —
one export per layout item plus the layout, brace clusters of item ids:
`--layout '{model effort} {cwd branch} {bar tokens cache}'`. With flags,
`configure` is strict — every layout item needs a variant or a
`--fallback=default|existing`; `--dry-run` renders both surfaces, writing no
scripts and touching no settings — the preview still refreshes `captures/`; a
foreign settings key is refused unless `--force`. `/statusline-lab`
inside a session runs the same two commands.

Repo and machine:

```
repo
  packages/statusline-lab/                the CLI — pure TS, zero bash
    src/  test/  dist/
    assets/payloads/  p1–p4.json          preview fixtures, main surface
    assets/ticks/     multi.json          preview fixtures, agent panel
  plugins/statusline-lab/
    commands/statusline-lab.md            the /statusline-lab command
    runtime/                              the bash runtime — statusline.sh, subagent.sh, lib.sh, components/*.sh

machine, after `claude plugin install statusline-lab@agentic`
  ~/.claude/plugins/cache/agentic/statusline-lab/<version>/runtime/   the installed runtime
  ~/.claude/plugins/data/statusline-lab-agentic/
    statusline-command.sh                 generated — exports the config, execs the cached runtime
    subagent-statusline.sh                generated — same shape, empty config
    captures/main.json  captures/tick.json  every paint's stdin, teed by the runtime; feeds previews
  ~/.claude/settings.json                 statusLine + subagentStatusLine → the generated scripts
```

Install: `claude plugin marketplace add v1nvn/agentic`, then
`claude plugin install statusline-lab@agentic`, then
`npx -y @v1nvn/statusline-lab configure` — the wizard previews both surfaces at
80/120/200 columns and saves.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
packages/                           the eight npm packages — one yarn workspace
  readability-mcp/  omlx-mcp/       the two MCP servers (@v1nvn/readability-mcp, @v1nvn/omlx-mcp)
  core/                             @v1nvn/agentic-core — last-reply + text formatting, shared by the tools
  zai/  tokens/  rm/  md/           the tool CLIs (zai-usage, tokens-report, rm-send, md-send)
  statusline-lab/                    the catalog + configure CLI — pure TS (@v1nvn/statusline-lab)
plugins/                            the seven plugins — manifests + config wrappers; code only in statusline-lab's runtime payload
  readability/  omlx/               .mcp.json (pinned npx) + plugin.json
  zai/  tokens/  rm/  md/           hooks.json (pinned npx) + plugin.json + commands/
  statusline-lab/                   one command + the bash runtime (see statusline-lab above)
```

Versions ride one lockstep train: `.claude-plugin/marketplace.json` is the source, and
`set-version.mjs` mirrors it into every package, plugin manifest, and npx pin.
