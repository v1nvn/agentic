# agentic

Five Claude Code plugins, installed independently from one marketplace.

| Plugin | What it does | Invoke |
|---|---|---|
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this" |
| **rm** | Beam the last reply to a reMarkable as EPUB. | `/rm:send` |
| **md** | Send the last reply to a Markdown-Viewer as a `#share=` URL. | `/md:send` |
| **zai** | Query GLM Coding Plan quota and usage. | `/zai:usage` |
| **tokens** | Per-model token usage and cache hit rate from local transcripts. | `/tokens:usage` |

`rm`, `md`, `zai`, and `tokens` run zero-token: a `UserPromptExpansion` hook intercepts the command before it reaches the model.

## Prerequisites

- Claude Code
- Node.js, for `readability`, `zai`, and `tokens`

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, md, zai, tokens
```

Start Claude Code and run the command shown above for the plugin you installed.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
plugins/<name>/                     the five plugins
readability-mcp/                             the readability MCP server (published to npm as readability-mcp)
shared/bin/                         scripts shared across plugins
```
