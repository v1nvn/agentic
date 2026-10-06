# @v1nvn/agentic-core

The shared runtime of the `@v1nvn` agent tools: transcript reading, CLI
plumbing, logging, and the MCP server lifecycle helpers. A library — no
bin, not directly runnable; every other package consumes it as a workspace
dependency.

User-facing docs: [root README](../../README.md).

## Modules

| File                | Role                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `src/last-reply.ts` | finds the previous assistant reply across local Claude Code transcripts |
| `src/input.ts`      | stdin and markdown-file input with the CLI error contracts              |
| `src/cli.ts`        | quiet commander parsing, usage/exit, and the runMain failure tail       |
| `src/logger.ts`     | level-filtered stderr logger for the MCP servers                        |
| `src/shutdown.ts`   | close-then-exit signal handling for the server entrypoints              |
| `src/dev.ts`        | the hot-reload watcher wiring the servers' `yarn dev` harnesses share   |
| `src/vite.ts`       | the modVite two-mode build behind every mod home's `vite.config.ts`     |
| `src/index.ts`      | the public entry — re-exports the modules above                         |

## Develop

```sh
yarn workspace @v1nvn/agentic-core build
yarn workspace @v1nvn/agentic-core test
yarn lint && yarn typecheck       # from the repo root
```

## Contracts

- No tool-specific logic lives here — a concern lands in core only when two
  or more tools need it.
- The `./vite` export is dev-only, loaded by the homes' `vite.config.ts` —
  never by the shipped CLIs, which import `.` alone.
- `last-reply` reads transcripts only; it never writes.
- The logger and shutdown/dev helpers write to stderr only — stdout carries
  the MCP transport on the servers.
