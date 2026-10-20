# todo — threads carry the plugin version; entry audits a stale stamp

## Goal

Every progress file minted or folded by the landed todo carries a `**Todo:** <train version>` line; `set-version.mjs` pins the concrete version into the rules skill and `--check` holds; a session entering an existing thread whose stamp lags the running version by more than one minor bump — or has no stamp — audits it before working, with `run`/`review` dispatching one `sonnet/low` reviewer for it; `/todo:audit` remains the owner's whole-repo sweep; the README says all four.

## Current state

Nothing landed. Design settled with the owner across one sitting: the stamp is one metadata line beside `**Run:**`, written by the mint, rewritten by every fold, absent meaning pre-stamp era (never backfilled); the version door is a `set-version.mjs`-pinned literal in the rules skill (owner ruling — Claude Code exposes no plugin version to skills at runtime, verified against the docs, and the literal needs no env and works in every subagent); the gate threshold is more than one minor bump, any major, or a missing stamp (owner ruling — one minor of drift is trusted to the run's blind reviewers); the audit goes internal by dropping `disable-model-invocation` and carrying the trigger in the description, while the verb stays for the Truth/Loss whole-repo sweep (owner call). The cached plugin versions on disk (`~/.claude/plugins/cache/agentic/todo/<version>/`) are the rules history the audit diffs against.

## Next step

V1, straight — the stamp and its door are one change, meaningless apart.

## Steps

| id | unit | model | review | consult | close criteria |
| -- | ---- | ----- | ------ | ------- | -------------- |
| V1 | the stamp and its door | sonnet/low | | | the rules' progress-file shape carries `**Todo:** <version>` beside `**Run:**` with absence meaning pre-stamp era; the fold clause rewrites it to the running version; `/todo:new`'s mint writes it; `set-version.mjs` rewrites a marked version literal inside `packages/todo/skills/rules/SKILL.md` the way it rewrites md pins, and `node .github/scripts/set-version.mjs --check` is green; `claude plugin validate packages/todo` green; the README's tracking-shape documentation moves in the same commit |
| V2 | the gate and the internal audit | | | | one clause in the rules names the comparison — same major and minor is a patch gap and passes, minor distance of one passes, more than one minor, any major, or no stamp audits the thread before work starts; `audit/SKILL.md` drops `disable-model-invocation: true` and its description carries that trigger verbatim; when the gate trips, `run` and `review` dispatch one `todo:reviewer` at `sonnet/low` with the audit brief before their first other dispatch, and a conversational resume runs the thread scope inline; `agents/reviewer.md`'s description adds audit to its list; the audit targets moved clauses by diffing the cached rules at the stamp against current, falling back to a full re-check with a note when the cache copy is swept; `/todo:status` names the lag when projecting one thread; validate green; README moves in the same commit |

## Plan

- **Reading.** `AGENTS.md` (prompt surfaces, layout, the skill-review law), `references/skill-review.md`, skill-creator via `gh` uninstalled (`anthropics/claude-plugins-official`, `plugins/skill-creator/skills/skill-creator`) before writing any skill text, the touched skills (`rules`, `new`, `run`, `review`, `audit`, `status`), `agents/reviewer.md`, `.github/scripts/set-version.mjs`, `packages/todo/README.md`.
- **The stamp.** `**Todo:** <version>` in the header block's existing `**Key:**` idiom — not YAML frontmatter, which is the SKILL.md surface's meaning. Rewritten in place by every fold (the same verb as Current state); a file moving to `archive/` keeps its last stamp verbatim. Never backfilled: absence is the honest pre-stamp signal and self-heals on first maintenance.
- **The door.** One marked literal in the rules skill — the shape's example shows the concrete current version — rewritten by `set-version.mjs` beside the existing md pin rewrites, guarded by `--check`. The loaded rules then carry the installed version into every verb and every builder/reviewer subagent: no runtime read, no env, no spawn. The stamp writes the literal it finds in the loaded rules, so it rides the train without further edits.
- **The gate.** One clause in the rules (every door that works a thread loads them): before working an existing thread, compare its stamp to the running version — same major and minor passes (patch gap), minor distance of one passes (trusted to the blind reviewers the run already dispatches), more than one minor, any major, or a missing stamp audits the thread first. `run` and `review` dispatch one `sonnet/low` reviewer for that audit when the gate trips — `run` has no resume check to carry it (owner, todo-grain G8a); a conversational resume runs `audit`'s thread scope inline.
- **The audit's aim.** When the gate trips, diff the cached rules at the stamp against current (`~/.claude/plugins/cache/agentic/todo/<stamp>/skills/rules/SKILL.md` — one directory per installed version, documented layout) and check the thread against exactly the clauses that moved; a swept cache copy means a full re-check against current rules, said so in the report.
- **Rollout.** Every existing thread has no stamp, so its first entry after landing audits it once; the fold then stamps it current. The gate measures staleness since last maintenance, not age, and resets on every touch.
- **Gates.** Workspace gate: `node .github/scripts/set-version.mjs --check && claude plugin validate packages/todo`, ceiling 1 minute (pre-flight measured under a second); `claude plugin test` has nothing to fire on a skill-only home.

## Design

- **The verb stays.** Version-gating catches stale plans; it does not catch self-contradictions, dead pointers, scratch leftovers or deferral loss — the Truth/Loss sweep remains the owner's manual door. One body of checks, one home, two callers.
- **No hooks.** The gate is semantic — which file is the thread being entered — and a prompt-grep hook cannot know it; todo is manifest, skills and agents by design.
- **No runtime version discovery.** No env var, injection or frontmatter field exposes a plugin's version to a skill (docs-verified); `installed_plugins.json` is internal schema, `claude plugin list` a spawn answering disk state. The train-pinned literal is the clean door and the repo's own mechanism.
- **One stamp, one fact.** Per-unit stamps and a created-by/updated-by pair are history the file does not carry; the operative fact is *last maintained by*, and git holds the commit grain.
