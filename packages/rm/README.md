# @v1nvn/rm

The home of the rm plugin — and its plugin root: the `rm-send` CLI in `src/`,
the mod's hooks module at `hooks/register.ts` (`.ts`/`.tsx` the engine loads
directly, no build), engine tests at `tests/`. It beams a Markdown reply — the
last one, or any Markdown file — to a reMarkable as EPUB over `ssh`/`scp`,
then reports the single `Sent:` line.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code, the plugin is the way in — a mod serves the one surface the
model never reads: `/rm-send` execs the shipped CLI and shows its `Sent:` line
as a dim transcript row (nothing execs until the command runs).

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic
```

In a terminal, last reply or a named file:

```sh
npx -y @v1nvn/rm@0.36.1
npx -y @v1nvn/rm@0.36.1 reply.md
```

## Usage

| Invocation | Does |
|---|---|
| `/rm-send` | the previous assistant reply → EPUB on the device, one dim `Sent:` row |
| `npx -y @v1nvn/rm@0.36.1` | the same beam, printed bare |
| `npx -y @v1nvn/rm@0.36.1 reply.md` | that file instead of the last reply |

Needs `pandoc` locally and `ssh`/`scp` access to the device —
`REMARKABLE_HOST`, default `remarkable`; the device directory is
`REMARKABLE_DIR`, default `/home/root/books`.

## Develop

```sh
yarn workspace @v1nvn/rm test       # the CLI side (vitest)
claude plugin validate packages/rm  # the mod, as the engine reads it
claude plugin test packages/rm      # the mod, through the engine
yarn lint && yarn typecheck         # from the repo root (typecheck
                                    #   covers tsconfig.mods.json too)
```

The mod API is early access and moves between Claude Code releases — a build
that refuses the module loads nothing, so validate after every engine update
and re-vendor `types/claude-code.d.ts` (repo root) from the engine-laid
`.claude-plugin/types/` when it changes. Read `references/mods.md` first.

## Modules

| File | Role |
|---|---|
| `src/index.ts` | bin entry (`rm-send`) — dispatch, exit codes |
| `src/send.ts` | pandoc → EPUB → scp, and the `Sent:` line |
| `hooks/register.ts` | the mod: registers `/rm-send`, execs the CLI, shows its line |
| `bin/send.mjs` | the standalone build the mod execs — committed, synced by `yarn build` |

## Contracts

- One line of output on success; failures print the failing stage.
- Nothing is left on the local machine — the EPUB streams to the device.
- `/rm-send` is one `node <plugin root>/bin/send.mjs` exec through the
  session's Bash tool — the same beam `npx rm-send` runs. The one allow rule
  it needs is `Bash(node <plugin root>/bin/send.mjs)`; the first run asks for
  it once, then it is remembered. Its `Sent:` line is a dim transcript row the
  model never reads.
