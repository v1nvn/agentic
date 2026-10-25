# statusline after ccstatusline — archived

## u1 (the whole thread)

# statusline after ccstatusline

**Todo:** 0.54.0

## Goal
The five comparison findings the owner ruled into fixes are closed: injected text sanitized at the parse seam, git read only when a shown item needs it, the vim indicator written once not twice, the settings key carries `refreshInterval: 10`, and the paint cost measured and recorded. Every golden no unit's change must move still renders byte-identical.

## Current state
All four units landed on PR #34 (v1nvn/agentic), one commit each plus the review fix round: u1 sanitize `b2305a2`, u2 lazy git `7c9514d`, u3 key fields `28e5987`, u4 bench `dc33559`, fix round `29143b4`. Bench: 200 renders × 4 payloads — median 6.05ms per paint (band 6.05–6.24ms across four passes); the fixtures' absent `current_dir` puts one failing git probe in every paint, so the spawn floor dominates — the measured answer retires the git disk cache question: nothing to cache. Goldens: only `p1-scrub.ans`, minted at u1 and regenerated in the fix round when the ST terminator went live. Parked stay parked (fast_mode pill, api/wall split, VS Code scars, `pr.kind`); the sparkline rides its own entry. Open owner line: whether `hideVimModeIndicator` also requires the layout to hold the state item (review nit 5, unruled — a custom layout dropping state still suppresses the host indicator on rich).

## Next step
Closed — the open owner line above, if ruled, is a trivial follow-up; nothing else is owed.

## Steps
| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| u1 | sanitize payload and git text | sonnet | | | A payload whose model name, output style, worktree and pr fields carry ESC/OSC/control sequences, and a git branch carrying them, render with every sequence stripped — one corpus test on the degenerate values;  — b2305a2 |
| u2 | lazy git reads | sonnet | | | `readGit` runs only when the layout holds branch, status or ahead — a quiet-theme paint performs zero git spawns, asserted; untracked counts come from the one porcelain call (`-uall`) and match `ls-files --others` counts on a dirty demo repo; the `stash list` spawn is gone if no segment renders stashes — verify and note either way;  — 7c9514d |
| u3 | the key write's official fields | sonnet | | | `configure` writes `refreshInterval: 10` on the statusLine key always, and `hideVimModeIndicator: true` exactly when the resolved `state` renders vim pills (rich: yes; quiet, lean: no; a swap recomputes on every write); `restore` stays byte-exact; key-spelling tests move with the new shape;  — 28e5987 |
| u4 | paint bench | sonnet/low | | | A repeatable bench (`yarn workspace @v1nvn/statusline bench`) times entry renders over `assets/payloads/*.json` and  — dc33559 |

## Plan
Tactical map:

- u1 — `src/render/payload.ts` (`parseRow` and its `fieldText`/`scalar` reads: strip at the field seam) and `src/render/git.ts` (the porcelain branch line): one named helper, one home; the engine-corpus test gains the degenerate payload.
- u2 — `src/render/engine.ts` (the `readGit` call moves behind a layout-holds-branch/status/ahead check; the parsed clusters already carry the answer) and `src/render/git.ts` (`-uall` on the porcelain call replaces the `ls-files` spawn; grep the segments for a `stashes` consumer before dropping that spawn); `test/git-locks.test.ts` and the demo repo carry the parity assert.
- u3 — `src/configure.ts` (the key object write) with the resolved state pick from `resolvePaint`; tests `configure.test.ts`, `restore.test.ts`, `key-e2e.test.ts`; the README's key-contract line.
- u4 — a `bench` package script over a plain-node script that imports the in-process barrel and renders `assets/payloads/*.json` N times.

Folded picks: `splice.test.ts` joined u3's file set (it pins statusLine members too); the degenerate-branch repo assert is a standalone `it` beside the corpus case, not a CorpusCase hook; the fix round deliberately regenerated `p1-scrub.ans` — the one golden this thread moved.

Run mechanics: the scoped gate line is `yarn workspace @v1nvn/statusline test`; the workspace gate line is `yarn workspace @v1nvn/statusline test && yarn lint && yarn typecheck`, ceiling 1 minute (pre-flight 48s, green) — the builder fires it per unit in the foreground.

Enforcement inventory:

- Goldens are byte-for-byte for every unit here — no unit may move one; if `-uall` parity fails a golden, u2 stops and consults rather than regenerating.
- Key spellings are pinned byte-exact by tests; only u3 moves them, deliberately.
- Untouched invariants: no shade glyphs, no npx on the paint path, `configure` the sole writer, decisions on argv — the new fields are settings siblings of `command`, never argv.

## Design
- Sanitizing happens at the parse seam, not in the draw kit: draw serves every island and stays a pure printer; the statusline renderer owns its input trust. Stripped: C0 controls, C1 bytes, and ESC-initiated sequences — an OSC terminates at BEL or ST, or eats to end-of-text when unterminated. The bar emits no OSC of its own today, so clean input renders identically.
- Official key fields are host siblings of `command`: `refreshInterval` (owner, G7b — 10s), `hideVimModeIndicator` (written only when the resolved state variant renders vim pills, so a surface not showing the mode keeps the built-in indicator), `padding` left at its default. `configure` recomputes them on every write, so a later swap cannot strand a stale flag.
- Rejected this session (owner, rulings page): the shell item, the usage API, links, the session-name item, cache-depth enrichment, spend dollars, the agentType chip. The width-probe and rate-countdown "gaps" were checked false — `COLUMNS` is the official contract and the strip already counts down.
