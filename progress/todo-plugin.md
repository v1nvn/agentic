# Todo plugin — all of work tracking in one place

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** opus

**Goal.** One plugin — `plugins/todo/` — owns the entire work-tracking surface: the generic
rules (today `~/.claude/tracking-template.md`), the procedures those rules state as prose
(thread start, thread finish, plan execution, session handoff), and the migration off every
per-repo copy. After it lands: repos carry data (`TODO.md`, `progress/`, `archive/`) and no
rules; no CLAUDE.md anywhere states a tracking rule; nothing is copied anywhere, so nothing
can drift. Supersedes `archive/workflow-plugin.md` (2026-09-22): of its three skills only
`handoff` and `run-plan` move — into this plugin, `run-plan` renamed; `explain` stays loose.

## The problem, measured (2026-09-22 recon)

- **The source of truth is unversioned.** `~/.claude/tracking-template.md` and
  `~/.claude/sync-tracking` live in `~/.claude`, which is not a git repo. No history, no
  diff, no undo for the rules that govern work in every repo under `~/git`.
- **Four artifacts overlap by hand.** The template's `progress/` bullet documents
  run-plan's own interface (`**Run:**` line, `model` column, grain) — when the skill
  changed, the template had to be edited from memory and re-synced. `handoff` Case 1 *is*
  the progress-file shape. The global `~/.claude/CLAUDE.md` work-tracking bullet and
  testril's `## Work tracking` section restate the same system a third and fourth time.
- **N verbatim copies + stamping machinery.** `sync-tracking` stamps the generic block
  (between `tracking:generic` markers) into 8 repos: agentic, firstmenu, homelab-gitops,
  stonks, streamdeck, enhansome/action, enhansome/webapp, ormi/testril. All 8 verified in
  sync on 2026-09-22 (the one diff hit, `ormi/testril-native-rpc-budget`, is a worktree —
  outside scope). Every rules edit today is one identical commit × 8 repos.
- **The two most-violated rules are prose.** START-A-TASK and FINISH-A-TASK are remembered,
  not typed; the recon above found in-flight threads and hand-rolled closes across repos.

## Settled — do not relitigate

- **Name `todo`.** Shorter at the keyboard (`/todo:run`), names the artifact every session
  touches. The rules text keeps calling the system *work tracking*.
- **Six verbs, capped:** `init` · `new` · `run` · `status` · `done` · `handoff`. A seventh
  earns its place only by owning a rule the step-0 evidence shows violated — never as
  convenience. **No sync verb, ever:** nothing is copied anymore; the verb is dead by
  design, and the plugin README says so.
- **Commands are procedures, the rules skill is knowledge.** Verbs are `commands/*.md` —
  they fire exactly when typed and carry argument hints. The rules are
  `skills/rules/SKILL.md` — they load contextually (description triggers on touching
  `TODO.md`, `progress/`, `references/`, `archive/`) even when nobody typed anything.
- **Commands stay thin; every shape clause lives once.** Section shapes, vocabulary,
  priority ladder, archive semantics — once, in `skills/rules/SKILL.md`. Each command's
  first line loads the rules. Six commands restating them would rebuild the N-copies
  problem inside the plugin.
- **Repos carry data, not rules.** Each repo's `references/tracking.md` dies; its
  `## This repo` deltas fold into a `## Tracking — this repo` section at the top of
  `TODO.md` (the deltas govern index lines, so they live beside them — and non-Claude
  readers get the repo's own rules in the same file). `references/` keeps its other
  contents; a `references/` emptied by the fold is removed.
- **No tracking rule in any CLAUDE.md** — not global (`~/.claude/CLAUDE.md` work-tracking
  bullet dies whole, no pointer paragraph), not agentic's (References line + counts), not
  testril's (`## Work tracking` section). The plugin is the carrier; the deterministic
  backstop is one pointer line at each `TODO.md` top: `> Rules: /todo:rules` — a line in a
  data file, not a rule in CLAUDE.md.
- **Skills move, never copy.** `~/.claude/skills/run-plan` and `…/handoff` are deleted only
  after the plugin is installed and the replacements verified live (one-way rule).
- **`explain` stays loose** (owner, 2026-09-22). `hinglish` and `context7-mcp` stay loose
  (2026-09-17, see archived workflow-plugin log).
- **Manifest + markdown only — no code, no runtime payload.** Skills precedent:
  `plugins/readability/`. Commands precedent: `plugins/tokens/` (`commands/usage.md`).
  No exception to the CLAUDE.md layout rule. Rides the next minor train: 0.19.0 → 0.20.0.

## Design

```
plugins/todo/
  .claude-plugin/plugin.json      ← name todo, author v1nvn / v1n@outlook.com, version 0.0.0 (deliberate — see U2)
  README.md                       ← verb table, install line, the no-sync note
  skills/rules/SKILL.md           ← the generic rules, the single copy
  commands/{init,new,run,status,done,handoff}.md
```

| Verb | Args | Replaces / does |
|---|---|---|
| `/todo:init` | `[repo]` | sync-tracking's create path **and** the one-time migration. Fresh repo: creates `TODO.md` with the `> Rules: /todo:rules` header, `progress/`, `archive/`. Existing repo holding `references/tracking.md`: folds its `## This repo` deltas into a `## Tracking — this repo` section at `TODO.md` top, repoints the header line, rewrites every progress back-ref, deletes `tracking.md`. |
| `/todo:new` | `<title>` | START-A-TASK RULE. Index line + `progress/<slug>.md` in one act; prompts for goal and grain; writes the back-ref opener. The rules text shrinks to "a thread starts via `/todo:new`". |
| `/todo:run` | `<plan> [units]` | the run-plan loop, body verbatim, pointers renamed. Close criteria, models, red lines unchanged. |
| `/todo:status` | — | new, read-only: pinned top + in-flight threads + each one's next step, projected off `TODO.md` + progress files. No new state. |
| `/todo:done` | `[slug]` | FINISH-A-TASK RULE. Deferrals get their own `TODO.md` lines **first**, then index line deleted, `git mv progress/<slug>.md archive/`, one commit. |
| `/todo:handoff` | — | handoff's Case 1 / Case 2 as today. |

Port list for `skills/rules/SKILL.md` from `~/.claude/tracking-template.md`:

- strip both `<!-- tracking:generic… -->` marker lines and every mention of
  `sync-tracking` / `tracking-template.md` — nothing may point at `~/.claude`
- START-A-TASK → "a thread starts via `/todo:new` — the command is the rule"
- FINISH-A-TASK → "a thread closes via `/todo:done`; deferrals are its first step"
- the progress-file back-ref spelling becomes `> Rules: /todo:rules · Index: ../TODO.md`
- "what a `run-plan` run needs" → "what a `/todo:run` run needs"
- frontmatter `description` triggers on any touch of `TODO.md`, `progress/`,
  `references/`, `archive/` — this is the hook that replaces the CLAUDE.md bullet

## Sources — read whole before starting

- `/Users/vineet/.claude/tracking-template.md` — the generic rules being ported
- `/Users/vineet/.claude/sync-tracking` — dies; read to know what `init` replaces
- `/Users/vineet/.claude/skills/run-plan/SKILL.md`, `…/handoff/SKILL.md` — the movers
- `/Users/vineet/.claude/CLAUDE.md` — the work-tracking bullet that dies
- `/Users/vineet/.claude/settings.json` — `enabledPlugins` (adopt mechanics)
- `/Users/vineet/git/ormi/testril/references/tracking.md` — the biggest deltas fold (pinned top, domain tag block, crate-kind sections, isolation debt); `…/testril/CLAUDE.md` `## Work tracking`
- Repo: `CLAUDE.md`, `README.md`, `.claude-plugin/marketplace.json`,
  `plugins/readability/` (skills precedent), `plugins/tokens/` (commands precedent),
  `.github/workflows/build.yml`, `.github/scripts/set-version.mjs`,
  `.github/scripts/build-skills.mjs`, `archive/workflow-plugin.md` (units 2–3 port from it)

## Migration scope

The 8 repos above (worktree `ormi/testril-native-rpc-budget` excluded). Per repo: deltas
fold, `references/tracking.md` deleted, back-refs and header repointed. Then the
`~/.claude` deletions: `tracking-template.md`, `sync-tracking`, `skills/run-plan/`,
`skills/handoff/`. **Ordering law: adopt before migrate, migrate before scrub** — no
window exists in which a repo's rules are nowhere. testril migrates via its own handover
rules (a PR); the six push-repos take one direct commit each on their default branch.

## Units

0. **Evidence survey + design freeze** *(sweep: sonnet; refine: orchestrator)* — Sweep
   `~/.claude/projects/*/*.jsonl` (27 project dirs) for: `/run-plan` and `run-plan`
   invocations (count, args, where runs stalled), `/handoff` usage, hand-rolled
   START/FINISH moments (sessions creating progress files or closing threads without the
   ritual), `TODO.md` edit patterns. And the 8 repos: each one's deltas shape (what
   `init` folds), which have `archive/completed.md`. **Sample first**: extract 3 sessions,
   show the evidence-row shape (project, date, what fired, what the session did by hand),
   then sweep via sonnet subagents — never classify from a name; read the transcript tail
   around each hit. Append an `## Evidence` section here plus any design amendment. Close:
   every verb's inclusion, every arg shape, and each Open decision below cites an
   invocation or a repo state — nothing rests on the seeding conversation alone.
1. **Scaffold** — `plugins/todo/` per the tree above. Close: `claude plugin validate
   plugins/todo/.claude-plugin/plugin.json` passes; `node .github/scripts/build-skills.mjs`
   passes; `grep -in "sync-tracking\|tracking-template\|tracking:generic\|.claude"
   plugins/todo/skills/rules/SKILL.md` is quiet; the skill's description names all four
   surfaces.
2. **Train discovery by glob** — ported verbatim from `archive/workflow-plugin.md` unit 2
   (still unlanded: `set-version.mjs` on main is a list — verified 2026-09-22). Rewrite
   `set-version.mjs` to glob `packages/*/package.json`,
   `plugins/*/.claude-plugin/plugin.json`, `plugins/*/.mcp.json`,
   `plugins/*/hooks/hooks.json`; build.yml's validate loop becomes
   `for m in plugins/*/.claude-plugin/plugin.json`. Close: `node
   .github/scripts/set-version.mjs --check` fails **red naming
   `plugins/todo/.claude-plugin/plugin.json`** (the 0.0.0 deliberate mismatch) — U4's bump
   turns it green; `grep "readability omlx" .github/workflows/build.yml` finds nothing.
3. **Six commands** — bodies per the verb table; `/todo:run` and `/todo:handoff` carry
   their sources' semantics whole, pointers renamed. Close: each command's first line
   loads the rules; every vocabulary clause greps in exactly one file (rules or the one
   command owning it); a scratch repo smoke-tests `new` (line + file in one act),
   `done` (deferral line first, `git mv`, one commit), `status` (read-only projection).
4. **Register + bump + docs** — marketplace.json entry (name `todo`, source
   `./plugins/todo`, category `productivity`, one-line description); bump the train
   0.19.0 → 0.20.0 via `set-version.mjs`; rewrite every count and shape sentence:
   `README.md` (opener count, plugin-table row, layout tree), `CLAUDE.md` (header
   enumeration, Layout, "Seven independent plugins" bullet). Close: `set-version.mjs
   --check` passes; `grep -in seven README.md CLAUDE.md .claude-plugin/marketplace.json`
   returns nothing.
5. **Adopt** — add `"todo@agentic": true` to `enabledPlugins` in
   `~/.claude/settings.json`, restart Claude Code. Close: a fresh session lists the six
   `/todo:*` commands; touching a `TODO.md` loads the rules skill; `/todo:rules` answers.
   (The loose `~/.claude/skills/run-plan`/`handoff` still exist here — they die in U9.)
6. **Migrate agentic** (dogfood `/todo:init`) — deltas are currently empty, so this is the
   clean first fold: header repoint, back-refs in `progress/*.md`, delete
   `references/tracking.md`, drop the References line in `CLAUDE.md`. This file's own
   back-ref rewrites in the same commit. Close: `grep -rn "references/tracking" .`
   (excluding `archive/`) is quiet.
7. **Migrate testril** — the pilot with the biggest deltas, via its handover rules (branch
   + PR; the run never merges). Close: `## Tracking — this repo` at `TODO.md` top carrying
   every delta; `references/tracking.md` gone (its other `references/` files untouched);
   back-refs repointed; testril `CLAUDE.md` `## Work tracking` deleted; PR open.
8. **Sweep the six** — firstmenu, homelab-gitops, stonks, streamdeck, enhansome/action,
   enhansome/webapp: one conventional commit each on the default branch, same close as U7
   minus the PR. Works against the local marketplace checkout (the agentic branch holds
   the plugin); after merge nothing changes for migrated repos — the rules text is
   identical.
9. **Scrub `~/.claude`** — delete `tracking-template.md`, `sync-tracking`,
   `skills/run-plan/`, `skills/handoff/`; delete the work-tracking bullet from
   `~/.claude/CLAUDE.md` whole. Close: `ls ~/.claude/skills` shows only `context7-mcp`,
   `explain`, `hinglish`; `grep -rn "run-plan\|handoff\|tracking-template\|sync-tracking"
   ~/.claude/CLAUDE.md ~/.claude/settings.json` is quiet; `/todo:run` still resolves in a
   fresh session; `/run-plan` does not.
10. **Ship + close** — merge the agentic PR, confirm release.yml cuts v0.20.0 (`gh release
    view`), FINISH rule on this thread (deferrals first). Close: release visible; final
    veto report per the run's Close section.

**Grain.** One unit = one plugin component, one registration surface, or one repo's
migration. One PR holds the whole agentic side (U1–U6); the other repos land per their own
convention. Nothing partial ships: the plugin PR is atomic.

## Open decisions — U0 resolves each, or the owner picks

- `/todo:status` output shape — take it from what the owner actually asks sessions for
  ("where am I", "what's next") in the transcripts.
- `/todo:new` arg shape — bare `<title>` with prompted goal/grain, or flags.
- Whether `/todo:run` keeps the full §Models ladder — evidence: which model columns
  actually appear in existing plans across repos.
- Whether `/todo:init` seeds `archive/completed.md` — evidence: which repos have one.

**Log.**
- 2026-09-22 — seeded from the centralization session with Vineet. Recon: 8 repos in sync
  under `sync-tracking`; `~/.claude` unversioned; `set-version.mjs` still a list on main;
  0.19.0 shipped with seven plugins, so this rides 0.20.0. Supersedes
  `workflow-plugin.md` (archived today, verbatim): its seventh-slot premise died when
  statusline-lab took 0.19.0, and the three-skill move is subsumed — `handoff` and
  `run-plan` move into `todo`, `explain` settled loose.
