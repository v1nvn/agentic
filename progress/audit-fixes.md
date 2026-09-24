> Rules: ../references/tracking.md · Index: ../TODO.md

# Audit fixes — 2026-09-24 full-sweep rulings

**Goal:** Land every ruled fix from the 2026-09-24 five-sweep audit (manifests,
docs-vs-surface, code quality, invariants, scripts-vs-deps). Rulings are settled;
this file tracks execution only.

**Run:** `run-plan progress/audit-fixes.md` — units are independent; run any
subset. Grain: one unit = one commit on `main`; no PRs. All steps default model;
none are owner-gated.

**Current state:** U1 in flight.

**Next step:** U1 delete + README cleanup, then upward.

## Steps

| Unit | What | Verification |
|---|---|---|
| U1 | Delete `packages/readability-mcp/{Dockerfile,Makefile,.dockerignore}`; README: drop docker section (keep Smithery), mark root-run dev commands, pin the two bare `npx @v1nvn/readability-mcp` mentions | `yarn typecheck && yarn lint && yarn test` green; `set-version.mjs --check` green; no repo reference to the deleted files |
| U2 | `tokens/scan.ts` transcript root via core (honor `CLAUDE_DIR`) — move root resolution beside `lastReply` | new test: `CLAUDE_DIR` set → tokens scans that tree (non-degenerate: two trees, assert the right one read) |
| U3 | Delete duplicate `ChatCompletionRequest` in `omlx-mcp/src/tools/chat.ts` | typecheck green |
| U4 | Repair mangled pins (`token@…s@<version>`, `za@…i@<version>`); harden `set-version.mjs`: every `@v1nvn/<name>` token in MD surfaces must be a real package name AND carry the repo version (catches fragments, bare mentions, JSONC layouts) | `set-version.mjs --check` green on repaired tree; red-first: check fails on a planted fragment |
| U5 | `author: {name: v1nvn, email: v1n@outlook.com}` in all 8 package.json | `npm pack` one package, inspect |
| U6 | Scope the browser invariant in root CLAUDE.md to statusline/terminal surfaces; md's documented open stays | read-back |
| U7 | Determine tarball exec-bit fact (build + `npm pack` + `tar -tvf`); converge — expectation: npm chmods bins at install → delete statusline's `chmod +x` | pack output recorded here; `yarn test` green |
| U8 | Add `vitest` to root devDependencies (root-run tsc reads `vitest/globals` types) | `yarn typecheck` green after `yarn install` |
| U9 | Dedup batch: `describeError` routing (29 sites), core `isFile`/`readStdin`/`readMarkdown`, `core/text-format` `W`/`rule()`/`p()`/`yyyymmdd`, `parseQuietly` extension + statusline drop of local rebuild, MCP twins (logger/shutdown/dev harness) into core, sibling-scan `groupChildrenByShape` + `describeSelector` convergence, chunk estimator → `policy/text.ts`, output-schema dead exports, `Block`/`Unit` merge, swallowed catches → handler-or-delete, statusline micro-cluster, exit-code idiom convergence (1 everywhere; statusline `status` 0/1 verdict contract unchanged), section-marker comments delete, `@types/mdast` drop | full gate per commit |
| U10 | Doc drift: `cleanChrome`/`metadataMode` rows, zai `--base-url`/`ZAI_BASE_URL`, `REMARKABLE_DIR`, statusline `s` key + `--home` + `--layout` + restore `--dry-run`, md stdin `-` + `MD_NO_OPEN` any-value wording, tokens "No flags" fix | read-back against schemas.ts/cli.ts |
| U11 | Fold `plugins/{zai,tokens}/README.md` into the package READMEs, delete the plugin copies, drop them from `set-version.mjs` MD_SURFACES | `set-version.mjs --check` green; no dangling references |

## Log

- 2026-09-24 rulings: Dockerfile+Makefile deleted (user: "just delete them"); md browser opening is intended — invariant scoped, not the code; author = name+email everywhere; extend core for parseQuietly; fold MCP twins into core (omlx-mcp gains the core dep); every `@v1nvn/*` mention rides the version train; D3/D7/D9 delegated to the session (exec-bit → empirical check; swallowed catches → handler-or-delete; plugin READMEs → fold).
