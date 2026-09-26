# @v1nvn/md

The CLI behind the md plugin: it sends a Markdown reply — or any Markdown
file — to a self-hosted Markdown-Viewer as a `#share=` URL, opens the page,
and copies the link.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — `/md:edit` (editable) and
`/md:view` (read-only) run this CLI through a `UserPromptExpansion` hook with
zero model tokens:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install md@agentic
```

In a terminal, last reply or a named file:

```sh
npx -y @v1nvn/md@0.27.3              # editable — both panes
npx -y @v1nvn/md@0.27.3 --view       # read-only — preview pane only
npx -y @v1nvn/md@0.27.3 reply.md
```

## Usage

| Invocation | Does |
|---|---|
| `npx -y @v1nvn/md@0.27.3` | last reply → viewer, edit pane enabled, link copied |
| `npx -y @v1nvn/md@0.27.3 --view` | read-only share |
| `npx -y @v1nvn/md@0.27.3 reply.md` | that file instead of the last reply |
| `npx -y @v1nvn/md@0.27.3 -` | Markdown from stdin |

`MD_VIEWER_URL` sets the viewer (default `https://md.v1n.space`); any set
`MD_NO_OPEN` value (not just `1`) skips opening the browser.

## Develop

```sh
yarn workspace @v1nvn/md build
yarn workspace @v1nvn/md test
yarn lint && yarn typecheck       # from the repo root
```

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`md-send`) — dispatch, exit codes |
| `src/share.ts` | the viewer upload and `#share=` URL |

## Contracts

- One status line of output (e.g. `Opened in Markdown-Viewer (link copied).`).
- The document reaches only the configured viewer — no third-party service.
