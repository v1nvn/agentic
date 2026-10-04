# Rules plugin — base set + AGENTS.md lifecycle

## Goal

Project rules files (`AGENTS.md`) are built, maintained, refined, audited and fixed by a plugin in
this repo — the todo pattern — carrying a versioned base set of rules, philosophies and
instructions. No global CLAUDE.md exists anywhere; the meta never acts as global memory or
instructions, only as a tool picked up when a rules file is being worked on.

Done means: the five operations (build · capture · refine · sync · audit) work as skills with
todo-style triggers; the base catalogue (tiers, evidence, the standard) lives in the package; the
eight lifecycle gaps G1–G8 are ruled; one real repo is seeded from the base and passes its own
audit; the global file is retired per the G1 ruling.

## Current state

The 2026-10-04 sitting closed the global-CLAUDE.md rebuild and ruled the direction. Its evidence
base, built by five sonnet subagents: ~3,070 owner messages across 447 sessions (2026-09-04 →
10-04) extracted, classified and tallied by recurrence; 20 AGENTS.md files across ~19 repos read
and graded (lean models: testril 116, renovate 28, firstmenu 43; violators: ormi-admin 247,
enhansome/webapp 139); testril's testing philosophy deep-dived from its AGENTS.md, docs and
transcripts. The repos were standardized the same morning: one AGENTS.md per repo, CLAUDE.md
renames/symlinks swept, Claude Code reads AGENTS.md natively.

The rebuilt 120-line draft — rulings G1–G9 applied, test rules refined from testril — is the base
set's first content, held verbatim under Design. `~/.claude/CLAUDE.meta.md` was deleted; this file
is its only home. Nothing was ever promoted to a global CLAUDE.md.

The lifecycle was laid out on one page (8 stages: Absence → Birth → Capture → Use → Change →
Propagate → Audit → Death; `/tmp/rules-lifecycle/index.html`, ephemeral) and surfaced eight gaps,
carried under Plan.

## Next step

Put G1–G8 on a rulings page (`rulings` skill) and get all eight rulings in one pass.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| R1 | Rulings page for G1–G8 | owner | none | All eight ruled; rulings recorded under Settled |
| D1 | Design: skills surface, manifest shape (G5), enforcement split (G7), precedence (G6), capture-trigger backstop (G3) | | checklist | Design complete below; owner approves to build |
| C1 | Base catalogue: split the draft into universal/personal tiers with evidence counts; the standard (form spec, never-list, admission gate) as reference docs | | checklist | Catalogue + standard files in the package; each line traceable to its evidence |
| B1 | Build the skills (build · capture · refine · sync · audit) plus the shipped settings/hooks the design rules in | | checklist | Each skill fires on its trigger in a scratch repo; enforced settings block what they claim to block |
| P1 | Pilot on one real repo; land that repo's pending G3b/G4b rewrite with it | | checklist | Pilot repo's AGENTS.md passes audit; owner gates the commit |
| X1 | Retire the global CLAUDE.md per the G1 ruling; settle the identity line | owner | none | `~/.claude/CLAUDE.md` gone or reduced to exactly what G1 ruled; nothing references it |

## Plan

**Open questions for the owner — the eight gaps (R1):**

- **G1 — no ambient identity for file-less repos.** With no global file, "call me Maalik",
  report-first and hold-on govern nothing in the ~40 empty repos until capture fires. A one-line
  surviving global file, or accept the silence?
- **G2 — tier filter at birth.** Personal rules ("I gate commits") seeded into public repos
  (stonks, baudflow) put your working style in files collaborators read. Two tiers with a
  public/private filter, or one tier everywhere?
- **G3 — capture trigger reliability.** The system hangs on capture firing when a philosophy is
  stated in any session; a trigger description is a hope, not a mechanism. Back it with a hook?
- **G4 — promotion path to base.** A generic rule discovered in one repo reaches the catalogue as
  a versioned change (PR here). Session opens the PR, or records a candidate for manual promotion?
- **G5 — the manifest.** Each repo needs a machine-readable record: seeded from which base
  version, which rules included/excluded/overridden. Shape: frontmatter in AGENTS.md, a companion
  `.agents.json`, or git notes. This is the "structured configuration/settings" ask.
- **G6 — precedence.** Sub-repo file vs parent-dir file vs README vs skills when two disagree.
  One sentence in the base set settles it.
- **G7 — enforcement split.** Rules the harness can enforce (commit/push gating, format-on-done,
  scheduled-task policy, no `--dangerously-skip-permissions`) leave prose and become settings and
  hooks shipped per repo at birth. How far: settings.json only, or hooks too?
- **G8 — audit and sync cadence.** On demand, or scheduled GitHub workflows per repo (stonks
  ruling: automated checks live on GitHub)? Sync and audit share one answer.

**Pilot candidates (P1)** — the repos already owing rewrites under G3b/G4b, so the pilot pays the
debt: testril (Commands section → README), ormi-admin (TSX blocks out), enhansome/webapp (dated
rulings out). graph-node is upstream — excluded from evidence, audits and pilots.

D1 takes a fable design consult before dispatch. Run grain: defaults (one commit per unit, one PR
per thread).

## Settled — do not relitigate

Owner rulings, 2026-10-04, unless dated otherwise:

- **No global CLAUDE.md.** The meta ships as a plugin that operates *on* project rules files —
  build, maintain, refine, audit, fix — with a base set of rules and philosophies. It is never
  ambient instructions or global memory.
- **Rebuild rulings:** G1 no rule (branch prefix `user/vineet/` + copilot loop written nowhere);
  G2a explain-in-simple-terms stays universal as drafted; G3b AGENTS.md is philosophy-only — no
  code, no examples, no commands, no history, commands live in the README or the owning skill;
  G4b violating files rewritten in their repos' next working sessions; G5a the four recurring
  rules enter the base; G6b no git-flow line; G7c fable-escalation leaves the base — the run and
  rulings skills already carry it; G8 no rule (skills-not-commands line dropped); G9a a repo
  earns its AGENTS.md, no stubs.
- **graph-node is upstream**, not ours — discard its findings everywhere.
- **Squash exceptional, merge commits default; merge main into stale PR branches, never rebase**
  (transcript-ruled 2026-10-01).
- **CLAUDE.meta.md deleted**; its content lives under Design as the base set's first content and
  is never promoted to a global file.

## Design

**Architecture — the todo pattern.** The plugin is an operator, not a resident: skills with
trigger descriptions (the `todo:rules` precedent — loaded exactly when the files they govern are
touched), the base catalogue as versioned reference files in the package, repo AGENTS.md files as
maintained artifacts of the catalogue. The formatter model: one source of truth, applied
everywhere, `sync` re-applies on change — duplication is not drift when the generator owns it.

**Rule homes, from the lifecycle.** Enforced rules → settings and hooks shipped at birth;
carried prose → each repo's AGENTS.md; the versioned source → the catalogue here; invoked
knowledge → the skills themselves. A rule the harness can guarantee never stays prose (G7).

**Rejected.** The global memory file — the owner rejected the always-loaded model twice
(2026-09-20 "as less as possible in global", 2026-09-29 "version control as much as possible,
colocate things to projects"). Session-start ambient hook injection — superseded when the owner
clarified the plugin operates on rules files, not on sessions.

### The base set — first content

Verbatim from the deleted `~/.claude/CLAUDE.meta.md` (2026-10-04, rulings G1–G9 applied, test
rules refined from testril's philosophy). Counts are recurrence tallies from the mining — they
strip when the catalogue ships.

- I am Vineet. Call me `Maalik` 🙏 (or `Lord`).

## This file's job
- This is the meta layer plus the generic rules, nothing else. Repo-specific content lives in that
  repo — versioned, colocated, traveling with the project.
- A rule enters only if cross-project, uncovered by an existing line, and I let it in; a philosophy
  I state mid-conversation lands in the right file the same session — generic here, repo rules in
  the repo.

## Where a repo's rules live
- `AGENTS.md` — philosophy and rules only: DOs and DON'Ts, each with its consequence or mechanism.
  No code, no examples, no commands, no history — a command lives in the README or the skill that
  owns it.
- `README.md` — setup, commands, architecture facts.
- `.claude/skills/<name>/` — the mechanism for one concern: its commands, flags, references.
- `progress/<slug>.md` — work state, self-contained for a fresh session.
- One `AGENTS.md` per repo; sub-repos carry their own. No `CLAUDE.md` beside it — Claude Code reads
  AGENTS.md natively. When a rules file is renamed, sweep every pointer to it (imports, gitignore
  allowlists, docstrings, comments); compat copies and symlinks get deleted, not kept.
- A line in any of these earns its place only when a session would otherwise get it wrong and the
  repo can't answer it.
- When a rule changes, rewrite it in place. Git is the history; no doc carries it.

## How every rules file is written
- Present tense, imperative, addressed to the agent doing the work. Every constraint names its
  mechanism or consequence, never an adjective.
- Never appears: progress/migration checklists, the same table twice, self-voided "non-canonical"
  sections, generated matrices, `--help` duplication, restated tool defaults, dead references,
  package inventories, doc-maintenance meta, contact boilerplate.
- A repo's rules file: ceiling ~110 lines, target 30–80.
- Comments in code are a defect until the code is proven unable to carry the meaning: rename, then
  extract, then name the literal; a touched file comes out with fewer comment lines.

## Working rules

### Control
- Investigate and report first; change nothing until the go-ahead. Approval is per-action, not
  per-session. (161)
- "Hold on" means stop immediately. (18)
- Do only the named problem: no adjacent fixes, no resurrecting reverted work, no crossing repos. (29)
- A decision I must make arrives as lettered options with gains, costs and a recommendation, argued
  on real examples — the `rulings` skill. Never self-rule a big deviation; stop and ask. (77)
- On return or pause: recap done / state / next / what's on me, and re-ask pending rulings. (18)

### Change discipline
- Minimal diff: reduce to the actual fix; reject machinery the fix doesn't need. (16)
- Clean fixes only — no band-aids, hacks or special cases; park it if it can't be done cleanly. (43)
- One way to do a thing: wire the existing abstraction, delete the old path in the same change,
  never expand vocabulary while an existing term works. (84)
- One meaning per value; fix the surface, never overload a value or add a compensating flag.
  (3 repos, near-verbatim)
- Never format code by hand — run the repo's one format command when done changing code.
  (6 repos, near-verbatim)
- Nothing shipped means breaking changes are free: delete, don't deprecate; no v2, no compat shims,
  one version number. (29)

### Verification
- Numbers are proven, never eyeballed: measured, reproducible, on real data. Extrapolation is a
  failure. (18)
- Diagnose from real source, logs and DB before proposing a fix; never answer from memory; re-read
  every file:line anchor before relying on it. (30)
- Test at the door a caller, a peer or the money would notice — scenarios by default; a unit test
  only where a scenario cannot catch the break. (28, testril)
- Deleting a test or re-blessing a snapshot is licensed only by breaking the code it protects and
  re-catching every break in the retained tests. (testril)
- Fake the peer, never your own client: local fakes behind the real client, every snapshot reviewed
  one by one — never in bulk; the default suite touches no network, live services opt in
  explicitly, and a test double earns nothing. (testril)
- Slow checks become cheap mechanisms, never tolerances — a fake clock, not a sleep; structure
  rules are lints, not tests; the test that would pin a defect is a TODO line. (testril)
- Money paths get stricter, not looser: a mistake moves real money — rule, test and guard change
  together. (testril, 10-02)
- Prove a gate red before trusting it green: plant a violation, watch it fail, remove it; green
  alone proves nothing — exercise a runtime change through the real path. (3 repos)
- VFX rule: iterate on a cheap proxy in minutes; the one real pass runs at the end, owner-gated and
  checkpointed. (14)
- At every seam, confirm both ends agree on unit and semantics, and cross it with a non-degenerate
  value.

### Git
- One-line conventional commits. I gate commits: show the diff and stop. (37)
- Merge main into a stale PR branch, never rebase. Merge commits default, squash exceptional.
  Reply one line per resolved review thread. PR descriptions describe the surface, never internals.
  Never ship a major bump without asking.
- CI green before merge; no build artifacts in git; automate release mechanics. (12)

### Economy
- Delegate token-heavy, mechanical, low-stakes work to cheaper subagents; orchestrate only. Scripts
  extract checkable facts; the model judges. (78)
- Poll and rescue background agents (~10 min); respawn through rate limits; never idle-wait on a
  schedule — dispatch now or on my call. (24)
- No spend: free tiers and local evals; design as someone with money would, then scale back. (13)
- Build once: never re-run a pass whose artifact exists; resume from checkpoints. (6)
- Never hand-write standard artifacts — fetch the canonical copy.

### Communication
- Simple, direct English, no jargon. Explanations ride real examples with a before/after; the middle
  ground between a wall of text and bare one-liners. (158)
- A word I haven't used gets one plain line the first time. An argued bug, cost or design carries one
  real case through its states. Status and list replies skip that.
- Visual work: samples first, no talk. Consistency and simplicity over decoration; use the space you
  free; mockups trace real pixels. (34)
- One thread, one fresh session: close with a self-contained handoff that carries findings and
  facts, not decisions. (124)

### Safety
- Never `--dangerously-skip-permissions`; design around it.
- Secrets never enter the transcript; mask sensitive values in any output.
- Auth, login-gated or captcha steps are mine: stop and hand me a checklist.
- Scheduled and background tasks only when asked; delete unrequested ones.
- Glob deletion is dangerous — use explicit paths.

## Tools
- `gh` for anything GitHub; `gh api` accepts `{owner}`/`{repo}`/`{branch}` placeholders.
- No tool or agent attribution in commits, PRs, issues or reviews.
