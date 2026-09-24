# @v1nvn/rm

The CLI behind the rm plugin: it beams a Markdown reply — or any Markdown
file — to a reMarkable as EPUB over `ssh`/`scp`, then reports the single
`Sent:` line.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — `/rm:send` beams the last reply
through a `UserPromptExpansion` hook with zero model tokens:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic
```

In a terminal, last reply or a named file:

```sh
npx -y @v1nvn/rm@0.25.0
npx -y @v1nvn/rm@0.25.0 reply.md
```

## Usage

| Invocation | Does |
|---|---|
| `npx -y @v1nvn/rm@0.25.0` | the previous assistant reply from local transcripts → EPUB on the device |
| `npx -y @v1nvn/rm@0.25.0 reply.md` | that file instead of the last reply |

Needs `pandoc` locally and `ssh`/`scp` access to the device —
`REMARKABLE_HOST`, default `remarkable`; the device directory is
`REMARKABLE_DIR`, default `/home/root/books`.

## Develop

```sh
yarn workspace @v1nvn/rm build
yarn workspace @v1nvn/rm test
yarn lint && yarn typecheck       # from the repo root
```

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`rm-send`) — dispatch, exit codes |
| `src/send.ts` | pandoc → EPUB → scp, and the `Sent:` line |

## Contracts

- One line of output on success; failures print the failing stage.
- Nothing is left on the local machine — the EPUB streams to the device.
