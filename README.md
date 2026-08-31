# agentic

Six Claude Code plugins, installed independently from one marketplace.

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
- Node.js, for `readability`, `omlx`, `zai`, and `tokens`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:8000`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, md, zai, tokens
```

Start Claude Code and run the command shown above for the plugin you installed.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
plugins/<name>/                     the six plugins
readability-mcp/                    the readability MCP server (published to npm as readability-mcp)
omlx-mcp/                           the omlx MCP server (published to npm as omlx-mcp)
shared/bin/                         scripts shared across plugins
```
