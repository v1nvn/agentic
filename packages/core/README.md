# @v1nvn/agentic-core

The shared runtime of the `@v1nvn` agent tools: the last-reply transcript
reader and the fixed-width text formatting every tool CLI prints through.
A library — no bin, not directly runnable; `zai`, `tokens`, `rm`, `md`, and
`statusline` consume it as a workspace dependency.

User-facing docs: [root README](../../README.md).

## Modules

| File | Role |
|---|---|
| `src/last-reply.ts` | finds the previous assistant reply across local Claude Code transcripts |
| `src/text-format.ts` | fixed-width tables and text the terminals render identically |
| `src/cli.ts` | usage/exit helpers shared by the tool bins |
| `src/hook.ts` | the `UserPromptExpansion` hook plumbing the zero-token plugins ride |
| `src/index.ts` | the public entry — re-exports the modules above |

## Develop

```sh
yarn workspace @v1nvn/agentic-core build
yarn workspace @v1nvn/agentic-core test
yarn lint && yarn typecheck       # from the repo root
```

## Contracts

- No tool-specific logic lives here — a concern lands in core only when two
  or more tools need it.
- `last-reply` reads transcripts only; it never writes.
