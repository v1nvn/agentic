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
- **Six verbs, capped:** `init` · `new` · `run` · `status` · `cleanup` · `handoff`. A seventh
  earns its place only by owning a rule the step-0 evidence shows violated — never as
  convenience. **No sync verb, ever:** nothing is copied anymore; the verb is dead by
  design, and the plugin README says so.
- **`new` derives from the session** (owner, 2026-09-24). `[title]` is optional: given, it
  is used; skipped, the title — and how many lines the sitting owes — come from what the
  session discussed.
- **Runs close their threads; FINISH dies as a rule** (owner, 2026-09-24). A run that lands
  a thread's final unit closes it in the same sitting: deferral gate first, index line
  deleted, `git mv` to archive, one commit — successor lines may be born in the same edit.
  Never waits for the PR to merge. Threads ended outside a run close by hand (data is
  data, no ritual); `cleanup` is optional hygiene, never required.
- **`init` is fresh setup only** (owner, 2026-09-24). No repo arg, no migration path: it
  creates `TODO.md` (with the `> Rules: /todo:rules` header), `progress/`, `archive/`,
  `archive/completed.md`. The one-time fold of the 8 existing repos is the orchestrator's
  hand work (U6–U8), after release.
- **Progress files realign; they never accumulate** (owner, 2026-09-24). The log is not
  append-only history and dated sections are not state: at every realignment the file is
  rewritten as current contracts — spent log entries deleted, dated/how-it-ran sections
  folded into undated current state, only live context (pending rulings, blockers, open
  questions) surviving in the log. Git is the history. Measured 2026-09-24: testril
  `native-functions.md` 1027 lines (99-line log + 4 dated section headers),
  `data-liquidity-framework.md` 951, `shape-survey.md` 248 (54-line log + 2 dated
  headers); this repo's own `todo-plugin.md` log hit 29 lines in two days. The shape
  lands with the plugin (U3); pre-adoption strays are `cleanup`'s sweep.
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
  No exception to the CLAUDE.md layout rule. Rides the next minor train: 0.26.0 → 0.27.0
  (0.26.0 shipped as d2e627f; owner-ruled 2026-09-24 when the plan's 0.25.0 anchor went
  stale).

## Design

```
plugins/todo/
  .claude-plugin/plugin.json      ← name todo, author v1nvn / v1n@outlook.com, version 0.0.0 (deliberate — see U2)
  README.md                       ← verb table, install line, the no-sync note
  skills/rules/SKILL.md           ← the generic rules, the single copy
  skills/{init,new,run,status,cleanup,handoff}/SKILL.md
```

| Verb | Args | Replaces / does |
|---|---|---|
| `/todo:init` | — | fresh setup only: `TODO.md` with the `> Rules: /todo:rules` header, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration — the one-time fold of the 8 existing repos is hand work (U6–U8), after release. |
| `/todo:new` | `[title]` | START-A-TASK RULE, end-of-session. Title given: used. Skipped: derived from what the session discussed — including how many lines the sitting owes. Index line always; `progress/<slug>.md` (goal · grain · back-ref) only when the discussion carries enough to fill it. The rules text shrinks to "a thread starts via `/todo:new`". |
| `/todo:run` | `<plan> [units]` | the run-plan loop, pointers renamed, hardened (## Hardening). Close criteria, models, red lines otherwise unchanged; keeps the full §Models ladder. Landing a thread's final unit closes it in the same sitting — deferral gate, index line deleted, `git mv` archive, one commit, and the thread file realigned (log collapsed to live context, dated sections folded); successor lines may be born in the same edit; never waits for merge. |
| `/todo:status` | `[plan]` | read-only projection, arg shape mirroring `/todo:run`. No arg: pinned top + in-flight threads, next step read off each thread file — never the index alone (a stale line produced a wrong answer in the wild). With `[plan]`: that thread's state · next step · live log (may be empty). No new state. |
| `/todo:cleanup` | — | optional hygiene, never required: archive sweep of threads whose runs landed pre-adoption, log-realign sweep of pre-adoption thread files, index/`progress/` divergence repair (the testril incident's six never-archived threads), evaporated-deferral detection (the census's one verified loss). No rule behind it — nothing waits on `cleanup`. |
| `/todo:handoff` | — | handoff's Case 1 / Case 2 as today. |

Port list for `skills/rules/SKILL.md` from `~/.claude/tracking-template.md`:

- strip both `<!-- tracking:generic… -->` marker lines and every mention of
  `sync-tracking` / `tracking-template.md` — nothing may point at `~/.claude`
- START-A-TASK → "a thread starts via `/todo:new` — the skill is the rule"
- FINISH-A-TASK → dies as a rule; the text becomes "a `/todo:run` run closes its thread when
  it lands the final unit — deferral gate first, `git mv`, one commit, no waiting on
  merge"; threads ended outside a run close by hand; `cleanup` is optional hygiene
- the progress-file back-ref spelling becomes `> Rules: /todo:rules · Index: ../TODO.md`
- the shape clause "goal · current state · next step · append-only log" becomes
  "goal · current state · next step · log (live context only)": every close realigns —
  the unit-close duty widens from "rewrite in place anything the unit made false" to
  "…false **or spent**"; spent log entries and dated sections die at realignment, their
  still-true content folded into undated current state
- "what a `run-plan` run needs" → "what a `/todo:run` run needs"
- the pointer spelling stays the arrow form (`→ progress/<slug>.md`) — it is what
  `/todo:new` writes mechanically; hand-typed almost nowhere today. `init` normalizes
  nothing: existing pointer-less lines stand until their thread is picked up
- sections gain one legitimizing sentence: a section groups lines; ordering within a
  section means nothing unless the repo's deltas say otherwise (6 of 8 repos already
  use headings, only testril's deltas formalize them)
- frontmatter `description` triggers on any touch of `TODO.md`, `progress/`,
  `references/`, `archive/` — this is the hook that replaces the CLAUDE.md bullet

## Hardening `/todo:run` — the port is not verbatim

- **Strictly no deviations** *(owner-ruled, 2026-09-24, mid-run)* — the run deviates from
  nothing this plan's text does not already name: any pick, mechanical or not, stops the
  run and is posted to the owner. No accept-and-log.
- **Stop-and-ask on impactful deviations** *(owner-ruled, 2026-09-24)* — the model never
  rules on a big deviation alone. Scope changes, contract/semantic changes, anything the
  plan didn't name → post it and wait. Butterfly effect: a small early deviation compounds
  into places the plan never chose.
- **Chain rule** *(owner-ruled, 2026-09-24)* — the mechanical test for "big": a deviation that forces a
  second deviation to land, touches a file the plan doesn't name, or mints/splits a unit
  is impactful by definition → stop and ask. A single mechanical pick inside named scope
  proceeds and logs.
- **Cold-resume re-verify** *(owner-ruled, 2026-09-24)* — 15/52 runs stopped mid (429 kills, user
  interruptions, checkpoint handoffs; resume is exercised about every other day). On
  resume, re-run the last landed unit's close criteria instead of trusting its log line.
- **Blocked-tooling rule** *(owner-ruled, 2026-09-24)* — a blocked batch operation (permission classifier)
  → split it; still blocked → log the blocker and continue other units. Never leave
  silent divergence (the testril six).
- **No self-verdict** *(owner-ruled, 2026-09-24)* — a unit closes only on its stated close criteria
  (greps/tests), never on the builder's say-so; review stays a blind subagent.

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
   passes; `grep -rin "sync-tracking\|tracking-template\|tracking:generic\|\.claude"
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
3. **Six verb skills** — opens with the 87-start derivation sweep (sonnet batches over
   the C1–C3 hit lists in `/tmp/tracking-survey/`, rubric per the Evidence sample;
   findings amend the `new` body before it is written). Bodies per the verb table;
   `/todo:handoff` carries its source's
   semantics whole, pointers renamed; `/todo:run` carries its source's semantics plus the
   Hardening clauses. Close: each verb skill's first line loads the rules; every
   vocabulary clause greps in exactly one file (rules or the one skill owning it); a
   scratch repo smoke-tests `new` (arg path: index line always, file only when the brief
   carries a goal — the no-arg derivation path is exercised live in U5), `run` (a seeded
   stale log and dated section collapse at the final unit's close), `cleanup`
   (divergence repair on a scratch repo seeded with a stray finished thread), `status`
   (board without arg, single thread with `[plan]`).
4. **Register + bump + docs** — marketplace.json entry (name `todo`, source
   `./plugins/todo`, category `productivity`, one-line description); bump the train
   0.26.0 → 0.27.0 via `set-version.mjs`; rewrite every count and shape sentence:
   `README.md` (opener count, plugin-table row, layout tree), `CLAUDE.md` (header
   enumeration, Layout, "Seven independent plugins" bullet). Close: `set-version.mjs
   --check` passes; `grep -in seven README.md CLAUDE.md .claude-plugin/marketplace.json`
   returns nothing.
5. **Adopt** — add `"todo@agentic": true` to `enabledPlugins` in
   `~/.claude/settings.json`, restart Claude Code. Close: a fresh session lists the seven
   `todo:*` skills (six verbs + rules); touching a `TODO.md` loads the rules skill;
   `/todo:rules` answers.
   (The loose `~/.claude/skills/run-plan`/`handoff` still exist here — they die in U9.)
   **Pause point** — the run edits `settings.json` and stops: the restart is the owner's;
   the fresh-session closes verify at the nudge.
6. **Migrate agentic** (hand fold) — deltas are currently empty, so this is the
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
10. **Ship + close** — merge the agentic PR, confirm release.yml cuts v0.27.0 (`gh release
    view`), close this thread (deferral gate first). Close: release visible; final
    veto report per the run's Close section. **Pause point** — the run opens the PR and
    stops: the merge is the owner's (a run never merges its own PR); U9's fresh-session
    closes verify here too.

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
- **START (C1+C2+C3) — 87 counted / 86 distinct thread creations** (one fork/resume
  pair double-counted — corrected by the 09-24 sweep), all hand-rolled (no command exists): 85
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
- **Start-title derivation sweep (2026-09-24, full corpus).** 86 distinct starts (the
  census's 87 double-counted one fork/resume pair — identical tool-use uuid in two
  transcripts); 83 readable, 3 transcripts already gone (derivation happens at mint
  time, written into the thread file — never transcript-dependent). **80/83
  derivable-prose, 2 owner-named (successor generations at kill/close boundaries), 1
  from repo state (a forward-ledger row), 0 minted-from-nothing.** The judgment is
  segmentation: 38 grouping moments, mostly owner-visible (all of C2's, 11/16 of C3's);
  model-alone calls cluster in three sittings and still produced well-named threads.
  Consequences carried into the `new` body: derivation window spans the sitting's reads
  and tool results, propose the partition ask-once then mint-N, detect merge/supersede,
  check `archive/` for slug collisions, proposal-stage files stay non-threads, the close
  moment births successors. Tables: `/tmp/tracking-survey/sweep-u3/out-C{1,2,3}-derivation.md`.

**Log.**
- 2026-09-24 — owner rulings mid-run: strictly no deviations (Hardening carries it);
  U4 bumps 0.26.0 → 0.27.0 (anchors amended in place); U1's three coherence picks kept.
- 2026-09-24 — owner closed both opens: all four hardening clauses ruled in (markers
  updated); full 87-start sweep ordered before U3 — Open section dissolved, sample
  findings moved to Evidence, sweep made U3's opening step. Plan is execution-ready:
  one run U1→U10, pause points at U5 (restart) and U10 (merge).
- 2026-09-24 — readiness pass: train re-anchored to 0.25.0 → 0.26.0 (0.25.0 shipped
  after the 09-23 verification; Settled/U4/U10 fixed), U2 premise re-verified
  (`set-version.mjs` still a list on main), pause points folded into U5/U10 — restart
  and merge are the owner's, a run stops and asks, fresh-session closes verify at the
  pauses. Remaining before a full run: owner ruling on the four hardening proposals;
  sweep-or-skip on the 87-start audit.
- 2026-09-24 — owner ruled the log defect: progress files realign, never accumulate —
  the log is not append-only history, spent entries and dated sections die at
  realignment (git is the history), the file carries current contracts only. Measured:
  testril native-functions 1027 (99-line log, 4 dated headers), data-liquidity 951,
  shape-survey 248; this file's own log was 29 lines in two days. Amendments: Settled
  (+realign bullet), port list (shape clause + "false or spent"), verb table (run close
  realigns, cleanup sweeps logs, status reads live log), U3 smoke (+run realign). Sample
  audit returned: 13/13 titles derivable from prior prose, segmentation is the owner
  ask — Open item updated; this file's own log collapses at its close (dogfood).
- 2026-09-24 — owner re-ruled four: `new [title]` (derive from session when skipped;
  audit ordered, sample-first), `done` → `cleanup` and demoted to optional hygiene — runs
  close their own threads at final-unit landing and never wait on merge, FINISH dies as a
  rule; `init` fresh-only (no arg, no migration — U6–U8 are hand folds); `/todo:run`
  hardened — the model stops and asks on impactful deviations, never rules alone.
  Amendments: Settled (+3 bullets), verb table, port list, Hardening section added,
  U3/U6/U10 rewritten.
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
