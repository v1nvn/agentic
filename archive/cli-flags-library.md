# External CLI library for flags + env parsing

## Goal

Replace every hand-rolled flag parser in the repo with an external Node.js CLI library,
found via enhansome. The library must also carry the parallel env-var support that mirrors
flags (zai: `--auth-token` ↔ `ZAI_AUTH_TOKEN`, `--base-url` ↔ `ZAI_BASE_URL`, plus the gated
`ANTHROPIC_*` inheritance). Applies across the board — every package that parses argv today.

Explicit direction: no self-built flags system, and no new core abstraction standing in for
one — an external library.

## Problems

1. **zai-usage rejects `--flag=value`.** `npx @v1nvn/zai --auth-token="…"` prints usage and
   exits 1: the hand-rolled parser in `packages/zai/src/resolve.ts` matches only the
   space-separated form; zsh delivers `--auth-token="…"` as one `=`-joined argument.
2. **A mis-keyed token renders an all-zero report, silently.** With a wrong token (e.g. the
   literal JSON quotes `jq` without `-r` leaves on), the z.ai monitor endpoints answer
   HTTP 200 with `{"code":1000,"msg":"Authentication Failed","success":false}`. The CLI checks
   only the HTTP status (`packages/zai/src/usage.ts`), treats the envelope as data, and prints
   "0 tokens across 0 model calls" — no error; a working setup looks like an empty account.
   Workaround found: `jq -r`.
3. **Flag parsing is hand-rolled in two packages.** `packages/zai/src/resolve.ts` and
   `packages/readability-mcp/src/cli.ts` both carry bespoke argv loops with their own
   edge-case comments; the other three CLIs (md, rm, tokens) poke `process.argv` directly.
4. **Flag ↔ env pairing is bespoke.** zai resolves flag → native env → conditionally
   inherited Claude Code env → default in code sitting beside the parser.
5. **The hook-or-print output skeleton is pasted in four entry points** (zai, md, rm,
   tokens): hook mode wraps the report in a block, direct mode prints or exits 1.

## What was asked

- "We should not implement our own flags system. Instead use a nodejs cli library or
  framework" — investigate candidates, using enhansome.
- "We need to across the board in all" — every CLI-parsing package migrates, not just zai.
- Env-var support parallel to flags (zai's pattern) is part of what the library must cover.

## Current state

- No code changed; no library chosen. Problems captured here, indexed from TODO.md.
- The external-library investigation ran in-session (enhansome search, plus verification of
  each candidate's env-var support against its official docs). Findings were delivered in
  conversation only — deliberately not persisted here.

## Next step

Choose the external library and scope the migration package by package.

---

## Log (append-only)

- **2026-09-02** — Reproduced both zai failures live: `=`-form rejection (usage + exit 1), and
  the quoted-token case (HTTP 200 auth-failure envelope → all-zero report). Direct curl with
  the raw (unquoted) token returns full quota/usage data, confirming the token value as the
  variable.
- **2026-09-02** — enhansome + official-docs investigation of external CLI libraries
  completed; candidates and their env-var support verified. Decision pending.
- **2026-09-02** — **Decision: commander.** Verified `.env()` per-option fallback
  (flag beats env, applied only when the flag is absent — zai's exact precedence) and
  native `--flag=value` against the official docs; yargs' `.env(prefix)` also qualifies
  but drags a heavier dep stack into five `npx`-invoked hook CLIs. cac/clipanion carry no
  env support; Caporal is dormant. The gated `ANTHROPIC_*` inheritance stays zai code —
  no library expresses conditional env inheritance. Migration scope: zai (parser swap +
  ZAI_* env folded into options), readability-mcp (`extract` subcommand, choices,
  int-parsed `--max-chars`), md/rm/tokens (positional + `--hook`), plus the auth-failure
  envelope fix in zai and deduping the hook-or-print skeleton into `agentic-core`.
- **2026-09-02** — Migration implemented. `agentic-core` gains `parseQuietly` (silent
  exitOverride parse, `Command | undefined`), `printUsageAndExit`, and `hookOrPrint`
  (the four-times-pasted hook-or-print skeleton); every CLI builds a commander program
  and parses through core. Both zai defects verified live against the real API:
  `--auth-token="…"` parses, and a mis-keyed token now exits 1 with
  `[Model usage] token expired or incorrect (code 401)` instead of an all-zero report.
  Behavior notes: a flag-like value (`--base-url --hook`) is consumed as the value by
  commander and rejected at resolve as `invalid base URL` (was a parse-level reject);
  usage output is now commander's generated help, which also names the env vars.
  md/rm/tokens additionally reject unknown flags (previously silently ignored).
  Full gates green: 7 packages build, all tests pass (zai 37, core 31, readability 497,
  md 5, rm 14, tokens 27+4 skipped), lint and typecheck clean. Pending: commit.
- **2026-09-03** — Landed as `fix(zai)` + `feat(cli)`; comments stripped on review.
