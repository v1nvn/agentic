# agentic

Six Claude Code plugins, installed independently from one marketplace. The code lives
in seven npm packages (`@v1nvn/*`); each plugin directory is a thin manifest that runs
its package through version-pinned `npx`.

| Plugin | What it does | Invoke |
|---|---|---|
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this" |
| **omlx** | Delegate bulk work — commit messages, docstrings, summarization, extraction, image description — to a local omlx inference server. | the agent routes on its own, or "ask the local model" |
| **rm** | Beam the last reply to a reMarkable as EPUB. | `/rm:send` |
| **md** | Send the last reply to a Markdown-Viewer as a `#share=` URL. | `/md:send` |
| **zai** | Query GLM Coding Plan quota and usage. | `/zai:usage` |
| **tokens** | Per-model token usage and cache hit rate from local transcripts. | `/tokens:usage` |

`rm`, `md`, `zai`, and `tokens` run zero-token: a `UserPromptExpansion` hook intercepts the command before it reaches the model.

## Prerequisites

- Claude Code
- Node.js — every plugin runs its package through `npx`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:6659`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, md, zai, tokens
```

Start Claude Code and run the command shown above for the plugin you installed.

## In a plain shell

The four tool CLIs run outside Claude Code too, same bins the hooks use:

```sh
npx -y @v1nvn/zai        # GLM Coding Plan usage report
npx -y @v1nvn/tokens     # token usage + cache hit rate from local transcripts
npx -y @v1nvn/rm         # last reply → reMarkable (or a file: npx -y @v1nvn/rm reply.md)
npx -y @v1nvn/md         # last reply → Markdown-Viewer (or a file: npx -y @v1nvn/md reply.md)
```

`rm` needs `pandoc` plus `ssh`/`scp` access to the device (`REMARKABLE_HOST`, default
`remarkable`); `md` honors `MD_VIEWER_URL` (default `https://md.v1n.space`) and
`MD_NO_OPEN=1` to skip opening the browser.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
packages/                           the seven npm packages — one yarn workspace
  readability-mcp/  omlx-mcp/       the two MCP servers (@v1nvn/readability-mcp, @v1nvn/omlx-mcp)
  core/                             @v1nvn/agentic-core — last-reply + text formatting, shared by the tools
  zai/  tokens/  rm/  md/           the tool CLIs (zai-usage, tokens-report, rm-send, md-send)
plugins/                            the six plugins — manifests + config wrappers, no code
  readability/  omlx/               .mcp.json (pinned npx) + plugin.json
  zai/  tokens/  rm/  md/           hooks.json (pinned npx) + plugin.json + commands/
```

Versions ride one lockstep train: `.claude-plugin/marketplace.json` is the source, and
`set-version.mjs` mirrors it into every package, plugin manifest, and npx pin.
