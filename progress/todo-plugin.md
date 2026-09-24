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
- **The two rules are followed at cost, not violated** (U0 census: 85/87 starts, 29/32 closes
  clean) — every start is 3–4 records of hand ceremony, every close an Edit + mv + commit;
  ~130 hand-rolled ritual acts in a month. The failures that did occur are specific: a
  deferral evaporated at close, a blocked batch `git mv` left index and progress/ diverged,
  worktree sessions never touch the index, a stale index line produced a wrong status
  answer, 9 of 41 closes used plain `mv`/`rm` losing rename tracking. The verbs absorb the
  ceremony and mechanically prevent exactly these.

## Settled — do not relitigate

- **Name `todo`.** Shorter at the keyboard (`/todo:run`), names the artifact every session
  touches. The rules text keeps calling the system *work tracking*.
- **Six verbs, capped:** `init` · `new` · `run` · `status` · `done` · `handoff`. A seventh
  earns its place only by owning a rule the step-0 evidence shows violated — never as
  convenience. **No sync verb, ever:** nothing is copied anymore; the verb is dead by
  design, and the plugin README says so.
- **Every surface is a skill — no commands, no hooks.** Verbs are
  `skills/<verb>/SKILL.md` (frontmatter `name` + `description` + `argument-hint`),
  invocable typed via the namespaced name (`/todo:new`) and auto-invocable when the
  description matches — the census says auto is the majority path (handoff 18/19,
  run-plan 19/52). `skills/rules/SKILL.md` is the knowledge skill: it loads
  contextually (description triggers on touching `TODO.md`, `progress/`, `references/`,
  `archive/`) even when nobody typed anything. Precedent: `plugins/readability/`
  (`skills/read-url/SKILL.md`). The repo's `commands/` shells survive only where a
  UserPromptExpansion hook intercepts (rm, md, zai, tokens) — todo has no hooks, so it
  takes no commands. Canonical invocation spelling is the namespaced form; bare short
  names are not relied on (`run`, `status` sit on built-ins).
- **Verb skills stay thin; every shape clause lives once.** Section shapes, vocabulary,
  priority ladder, archive semantics — once, in `skills/rules/SKILL.md`. Each verb
  skill's first line loads the rules. Six verb skills restating them would rebuild the
  N-copies problem inside the plugin.
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
  `plugins/readability/` (`skills/read-url/SKILL.md`) — the layout precedent for both
  the rules skill and the six verbs.
  No exception to the CLAUDE.md layout rule. Rides the next minor train: 0.24.0 → 0.25.0
  (main moved past the seeded 0.19.0; verified 2026-09-23).

## Design

```
plugins/todo/
  .claude-plugin/plugin.json      ← name todo, author v1nvn / v1n@outlook.com, version 0.0.0 (deliberate — see U2)
  README.md                       ← verb table, install line, the no-sync note
  skills/rules/SKILL.md           ← the generic rules, the single copy
  skills/{init,new,run,status,done,handoff}/SKILL.md
```

| Verb | Args | Replaces / does |
|---|---|---|
| `/todo:init` | `[repo]` | the create path **and** the one-time migration. Fresh repo: creates `TODO.md` with the `> Rules: /todo:rules` header, `progress/`, `archive/`, `archive/completed.md`. Existing repo holding `references/tracking.md`: folds its `## This repo` deltas into a `## Tracking — this repo` section at `TODO.md` top, repoints the header line, rewrites every progress back-ref, deletes `tracking.md`; seeds `archive/completed.md` when absent (6 of 8 repos have one). |
| `/todo:new` | `<title>` | START-A-TASK RULE, end-of-session: writes the index line from what the session discussed; creates `progress/<slug>.md` (goal · grain · back-ref) only when the discussion carries enough to fill it — a pointer-less line is legitimate until pickup. The rules text shrinks to "a thread starts via `/todo:new`". |
| `/todo:run` | `<plan> [units]` | the run-plan loop, body verbatim, pointers renamed. Close criteria, models, red lines unchanged. Keeps the full §Models ladder. |
| `/todo:status` | `[plan]` | read-only projection, arg shape mirroring `/todo:run`. No arg: pinned top + in-flight threads, next step read off each thread file — never the index alone (a stale line produced a wrong answer in the wild). With `[plan]`: that thread's state · next step · latest log. No new state. |
| `/todo:done` | `[slug]` | FINISH-A-TASK RULE. Deferral gate first — every cut item becomes a `TODO.md` line or the close names why none is owed (the census caught one evaporation). Then index line deleted, `git mv progress/<slug>.md archive/` — git mv always, plain mv loses rename tracking — one commit, one thread per invocation. |
| `/todo:handoff` | — | handoff's Case 1 / Case 2 as today. |

Port list for `skills/rules/SKILL.md` from `~/.claude/tracking-template.md`:

- strip both `<!-- tracking:generic… -->` marker lines and every mention of
  `sync-tracking` / `tracking-template.md` — nothing may point at `~/.claude`
- START-A-TASK → "a thread starts via `/todo:new` — the skill is the rule"
- FINISH-A-TASK → "a thread closes via `/todo:done`; deferrals are its first step"
- the progress-file back-ref spelling becomes `> Rules: /todo:rules · Index: ../TODO.md`
- "what a `run-plan` run needs" → "what a `/todo:run` run needs"
- the pointer spelling stays the arrow form (`→ progress/<slug>.md`) — it is what
  `/todo:new` writes mechanically; hand-typed almost nowhere today. `init` normalizes
  nothing: existing pointer-less lines stand until their thread is picked up
- sections gain one legitimizing sentence: a section groups lines; ordering within a
  section means nothing unless the repo's deltas say otherwise (6 of 8 repos already
  use headings, only testril's deltas formalize them)
- frontmatter `description` triggers on any touch of `TODO.md`, `progress/`,
  `references/`, `archive/` — this is the hook that replaces the CLAUDE.md bullet

## Sources — read whole before starting

Verbatim ports:
- `/Users/vineet/.claude/tracking-template.md` — the generic rules base
- `/Users/vineet/.claude/skills/run-plan/SKILL.md`, `…/handoff/SKILL.md` — the movers
- `/Users/vineet/.claude/CLAUDE.md` — the work-tracking bullet that dies

Build references — the skill bodies are written against real repo practice, not the
template alone; every shape the rules must accommodate is read here first:
- `/Users/vineet/git/ormi/testril/references/tracking.md` + `TODO.md` — the biggest fold:
  pinned top, domain-tag sections, kept ids, isolation debt;
  `…/testril/CLAUDE.md` `## Work tracking`
- `/Users/vineet/git/stonks/TODO.md` + deltas — status suffixes (`[PARKED]`, `[PAID]`),
  priority-as-value reading, pointer-without-arrow lines
- `/Users/vineet/git/firstmenu/TODO.md`, `…/enhansome/webapp/TODO.md`,
  `…/streamdeck/TODO.md` + their deltas — free-form section conventions, the
  one-line-per-thread variant
- `/Users/vineet/.claude/settings.json` — `enabledPlugins` (adopt mechanics)
- Repo: `CLAUDE.md`, `README.md`, `.claude-plugin/marketplace.json`,
  `plugins/readability/` (the `skills/<name>/SKILL.md` precedent),
  `.github/workflows/build.yml`, `.github/scripts/set-version.mjs`,
  `.github/scripts/build-skills.mjs`, `archive/workflow-plugin.md` (units 2–3 port from it)

`~/.claude/sync-tracking` is none of these — it is the copy-and-stamp machinery the
plugin kills by making copies unnecessary; it dies in U9 and nothing ports from it.

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
   plugins/todo/skills/` is quiet; the rules skill's description names all four surfaces;
   every verb skill's frontmatter carries `name`, `description`, `argument-hint`.
2. **Train discovery by glob** — ported verbatim from `archive/workflow-plugin.md` unit 2
   (still unlanded: `set-version.mjs` on main is a list — verified 2026-09-22). Rewrite
   `set-version.mjs` to glob `packages/*/package.json`,
   `plugins/*/.claude-plugin/plugin.json`, `plugins/*/.mcp.json`,
   `plugins/*/hooks/hooks.json`; build.yml's validate loop becomes
   `for m in plugins/*/.claude-plugin/plugin.json`. Close: `node
   .github/scripts/set-version.mjs --check` fails **red naming
   `plugins/todo/.claude-plugin/plugin.json`** (the 0.0.0 deliberate mismatch) — U4's bump
   turns it green; `grep "readability omlx" .github/workflows/build.yml` finds nothing.
3. **Six verb skills** — bodies per the verb table; `/todo:run` and `/todo:handoff` carry
   their sources' semantics whole, pointers renamed. Close: each verb skill's first line
   loads the rules; every vocabulary clause greps in exactly one file (rules or the one
   skill owning it); a scratch repo smoke-tests `new` (index line always; file only
   when the brief carries a goal), `done` (deferral gate first, `git mv`, one commit),
   `status` (board without arg, single thread with `[plan]`).
4. **Register + bump + docs** — marketplace.json entry (name `todo`, source
   `./plugins/todo`, category `productivity`, one-line description); bump the train
   0.24.0 → 0.25.0 via `set-version.mjs`; rewrite every count and shape sentence:
   `README.md` (opener count, plugin-table row, layout tree), `CLAUDE.md` (header
   enumeration, Layout, "Seven independent plugins" bullet). Close: `set-version.mjs
   --check` passes; `grep -in seven README.md CLAUDE.md .claude-plugin/marketplace.json`
   returns nothing.
5. **Adopt** — add `"todo@agentic": true` to `enabledPlugins` in
   `~/.claude/settings.json`, restart Claude Code. Close: a fresh session lists the seven
   `todo:*` skills (six verbs + rules); touching a `TODO.md` loads the rules skill;
   `/todo:rules` answers.
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
10. **Ship + close** — merge the agentic PR, confirm release.yml cuts v0.25.0 (`gh release
    view`), FINISH rule on this thread (deferrals first). Close: release visible; final
    veto report per the run's Close section.

**Grain.** One unit = one plugin component, one registration surface, or one repo's
migration. One PR holds the whole agentic side (U1–U6); the other repos land per their own
convention. Nothing partial ships: the plugin PR is atomic.

## Open decisions — resolved by U0 (2026-09-23, owner-ruled)

- `/todo:status` — arg shape mirrors `/todo:run` (DRY across verbs): optional `[plan]`;
  no arg = board. Next steps read off thread files, never the index alone.
- `/todo:new` — bare, end-of-session: index line always; `progress/<slug>.md` only when
  the discussion carries enough to fill it. No flags.
- `/todo:run` — keeps the full §Models ladder (15 plans carry model columns across 3 repos).
- `/todo:init` — seeds `archive/completed.md` (fresh and migrate paths).

## Evidence — U0 census (2026-09-23)

Corpus: 27 project dirs (22 with transcripts — 643 sessions, ~2.3 GB), 2026-08-24 → 09-23.
Method: regex nets → per-hit transcript reads (`/tmp/tracking-survey/probe.py`), sample-first
(3 sessions, owner-approved gate), 7 sonnet batches + 1 mechanical cross-tab. Raw tables:
`/tmp/tracking-survey/out-{A,B,C1,C2,C3,D,E,F}.md`.

- **run-plan (A) — 52 real invocations**, 33 typed / 19 auto: webapp 21, testril+worktrees 16,
  agentic 5, firstmenu 5, streamdeck 1, ormi-app 1. Args: 21 path-only, 31 scoped, in three
  spellings — bare ids/ranges (`2-5`, `R0-R1`, `F1-F6`, `unit V0`), dash-prefixed natural
  scope ("— scope R2d only"), prose riders naming no units. Outcome: 36 completed, 15
  stopped-mid — 3 usage-limit 429 kills, 5 user interruptions, 4 checkpoint-handoffs, 2
  parked, 1 in-flight. Stalls are external; the plan-file-as-resume-record design is
  exercised about every other day.
- **handoff (B) — 19 uses**, 18 auto-invoked from prose, 1 typed. Case-1 (thread-file
  update) 14, Case-2 (self-contained block) 5 — all Case-2 in testril, mostly cross-model
  handoffs. Both cases live. Auto-invocation is native to skills — the verb skills'
  descriptions carry the trigger, no `commands/` detour needed.
- **START (C1+C2+C3) — 87 thread creations, all hand-rolled** (no command exists): 85
  ritual-followed, 2 broken-index — and both were self-declared scratch ("not a thread
  yet"), one parked via `git rm` the next day, one line added same-day by the successor
  session. The rule is followed at cost, not violated: each start is 3–4 records of
  Read+Write+Edit ceremony; sessions mint up to 7 threads in one sitting; one session
  maintained `TODO.md` via a bash `perl -0pi` one-liner, invisible to tool-grep.
- **FINISH (C1+C2+C3) — 41 closes**: 32 `git mv` + 9 plain `mv`/`rm` (archive is a
  reversible gate: one thread archived → unparked → re-archived; one un-archived with a
  full reopen ritual). 29/32 git-mv closes clean (line deleted + rename + one commit
  naming the thread); the 3 archive-only are one testril incident — the permission
  classifier blocked a 7-file batch `git mv` and a second single-file retry, six threads
  never archived, index and progress/ left diverged. Deferrals-first in 9/41. One
  evaporation verified: the "10b adopt handoff" deferral dropped at close, alive today only
  inside `archive/statusline-plugin-modes.md`, no index line. The 3 worktree sessions never
  edit the index at all. Close and successor-open arrive as one gesture — successor thread
  lines are born inside the deletion edit.
- **status asks (D) — 28 real asks** in 26 sessions (32 regex false positives): 13 name a
  specific thread, 10 are "what's next on me" board asks, 2 open-ended. Answers: narrative
  12, single-thread next-step 7, board list 7; 13/28 required file reads. One from-context
  answer was wrong — it trusted a stale `TODO.md` line over the thread file and
  self-corrected; one bare "what's next?" died unanswered as the session's last record.
- **TODO.md patterns (F)** — 213 sessions touch `TODO.md`; 201 of those also touch a thread
  file (index and thread maintained together); only 12 index-only — too few for an
  index-editing verb. 155 sessions touch `progress/` without `TODO.md` (mostly run
  sessions updating plans).
- **Repo state (E)** — deltas to fold: testril L (6 bullets), firstmenu/webapp/stonks/
  streamdeck/action/homelab S (1 bullet each), agentic empty. `archive/completed.md` in
  6 of 8 (absent: streamdeck, testril). `**Run:**` lines in 28 plans, 10 naming an
  orchestrator model (opus 7, fable 2, sonnet ladders in firstmenu prose). Model columns
  in 15 plans (firstmenu 5, webapp 3, testril 7) with cells `sonnet`/`opus`/`fable`/
  `owner`/`tiered`/blank. Section headings in `TODO.md` in 6 of 8 repos — the generic
  rules are silent on sections; only testril's deltas formalize them. The `→ progress/`
  arrow pointer is hand-typed almost nowhere (testril: 29 pointers, 0 arrows;
  stonks/webapp/streamdeck/action: 0) — agentic and firstmenu are the exceptions.
- **Anchor drift in this plan** — main is at 0.24.0 (8 manifests), not 0.19.0: the train
  rides **0.25.0**, not 0.20.0. `set-version.mjs` is still a list on main (U2 premise
  holds). The "27 project dirs" count holds.

**Log.**
- 2026-09-23 — U0 run: 7 sonnet batches + mechanical cross-tab over 643 sessions + 8 repos;
  Evidence section above; four open decisions answered by evidence, owner ruling pending;
  plan amendments proposed (train 0.25.0, problem framing, `status [slug]`, `done` gates).
- 2026-09-23 — owner ruled all four: `status` mirrors `run`'s arg shape (DRY); `new` is
  end-of-session (line always, file when the discussion carries enough); ladder kept;
  `init` seeds completed.md. Amendments applied: problem framing rewritten, verb table
  (init seeds, new end-of-session, run keeps ladder, status [plan], done deferral gate +
  git-mv-only + one-per-invocation), port list (+pointer spelling, +sections sentence),
  train 0.24.0 → 0.25.0 in Settled/U4/U10, U3 smoke-test updated. U0 closed.
- 2026-09-23 — owner re-alignment: (1) verbs are skills, not commands — the repo's
  `commands/` shells are hook-intercepted only (rm/md/zai/tokens), readability is the
  layout precedent, so `skills/<verb>/SKILL.md` × 7; Settled, tree, U1/U3/U5 closes
  rewritten; (2) the repo tracking files (testril's tracking.md + TODO.md, stonks,
  firstmenu, webapp, streamdeck + their CLAUDE.md sections) are build references, not
  mere migration targets — Sources split into verbatim ports vs build references;
  (3) sync-tracking is the dying copy-and-stamp machinery only — nothing ports from it.
- 2026-09-22 — seeded from the centralization session with Vineet. Recon: 8 repos in sync
  under `sync-tracking`; `~/.claude` unversioned; `set-version.mjs` still a list on main;
  0.19.0 shipped with seven plugins, so this rides 0.20.0. Supersedes
  `workflow-plugin.md` (archived today, verbatim): its seventh-slot premise died when
  statusline-lab took 0.19.0, and the three-skill move is subsumed — `handoff` and
  `run-plan` move into `todo`, `explain` settled loose.
