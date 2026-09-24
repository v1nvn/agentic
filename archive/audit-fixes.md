> Rules: ../references/tracking.md · Index: ../TODO.md

# Audit fixes — 2026-09-24 full-sweep rulings (closed)

**Goal:** Land every ruled fix from the 2026-09-24 five-sweep audit.

**Grain was:** one unit = one commit on `main`; no PRs.

## Landed (14 commits, 44fc4b8 → d7d697e)

| Unit | Commit |
|---|---|
| U1 Docker/Makefile/.dockerignore deleted; READMEs say which commands are repo-root | 44fc4b8 |
| U2 tokens transcript root via core `claudeProjectsDir()` — `CLAUDE_DIR` honored, red-first test | 42069a4 |
| U3 duplicate `ChatCompletionRequest` deleted | 4bd8d32 |
| U4 mangled pins repaired; `set-version --check` validates pin names against real packages + flags unpinned registry mentions (quoted or npx/npm-install context; `yarn workspace`/headings/prose exempt) | f79cbdd |
| U5 author `{name, email}` in all 8 npm manifests | 3e3df5f |
| U6 browser invariant scoped in CLAUDE.md; md's open named as the intended exception | 8255982 |
| U7 tarball exec-bit measured (mode 644; installers chmod bins) → statusline build chmod dropped | 0b1233f |
| U8 vitest declared at root | db78f5a |
| U9a core owns RULE_WIDTH/rule/pad2/ymd | 5520ea1 |
| U9b core owns readStdin/readMarkdownFile/isFile | 2d11195 |
| U9c parseQuietly recovers classified errors; statusline rebuild dropped | d847c96 |
| U9d describeError routed at 27 sites (subagent sweep) | a52e45d |
| U9e sibling-scan `groupChildrenByShape` + `describeSelector(maxClasses)`; chunk via `estimateTokens`; dead output-schema exports, `Block`/`Unit`, `@types/mdast` gone; math/footnotes no-throw catches deleted | 2642dd0 |
| U9f statusline one settings-surgery path (renderMembers/repointRootMembers/isObject) | 1142f77 |
| U9g logger/shutdown/hot-reload harness folded into core (structural vite types); omlx-mcp takes the core dep; dev boots verified | b0e82a5 |
| U9h section-marker comments deleted | 70a6dce |
| U10 READMEs synced to the real surface (cleanChrome, --base-url, REMARKABLE_DIR, wizard `s`, --home/--layout/restore flags, md stdin, tokens --hook) | c97fe7a |
| U11 plugin READMEs folded into package READMEs; MD_SURFACES pruned | d7d697e |

## Dispositions

- **Exit idioms (audit C12/C16): no change.** readability's usage-error exit 2
  is a test-pinned POSIX convention (cli.test.ts:137); statusline's deferred
  `exitCode` vs core's `process.exit` are internal mechanisms with identical
  observable contracts, and converging them would break `never` types for zero
  observable gain.
- **Swallowed catches (D7):** kept the two with a real threat model
  (normalize `canonicalizeCodeBlocks`, footnotes ref-collection — adversarial
  markup, skip-item-continue); deleted math's and footnotes' second
  (no realistic throw path; math's catch skipped the conversion it exists to
  perform).
- **smithery.yaml kept** — stdio manifest, no Dockerfile dependency.

Close criteria met: full gate green (typecheck, lint, 967 tests, set-version
--check) at d7d697e.
