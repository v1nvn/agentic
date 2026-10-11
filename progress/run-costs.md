# todo:run — small runs take hours

## Goal
The ruled redesign is built into the todo plugin and released, every progress file
under `~/git` is on its Steps shape, and one fresh `/todo:run` of
`progress/audit-refactor.md` under the released skill is measured with
`/todo:postmortem`, its per-unit figures recorded in `## Plan` beside the
baseline's — each side's shape named.

## Current state
Ruled; nothing built. The run-costs kit still lives in `references/run-costs*`,
beside `/todo:postmortem`.

## Next step
Build P1 — postmortem absorbs the run-costs kit.

## Steps
| id | unit | model | review | consult | close criteria |
|----|------|-------|--------|---------|----------------|
| P1 | `postmortem` absorbs the kit: `analyze.py`'s token ledger, `cost-state` reconciliation, root-vs-scoped gates, duplicate commands, cross-agent re-reads and parent idle gaps move into `scripts/analyze.mjs`, which also gains subagent type per worker and $ per unit; the kit README's transcript parsing law becomes a postmortem reference file; briefs 05/06 become postmortem reference files, 01–04 are dropped; `reports/d7ab34d2.md` moves to `archive/run-costs-d7ab34d2.md`; `references/run-costs.md` and `references/run-costs/` are deleted | | blind | | postmortem on the full `d7ab34d2` session id reproduces the baseline anchors in `## Plan` (516 calls, $45.63 / $11.4 per unit, 55 root gate runs, parent 32k → 161k); every worker row shows type and model; output carries $ per unit; no `references/run-costs*` remains; the skill names no consumer repo |
| R1 | `packages/todo/agents/` — `builder.md`, `reviewer.md`, `clerk.md`, each with `name:` set: frontmatter (model/effort defaults, tools) + role-law bodies | | blind | | `claude plugin validate packages/todo` green; one `claude -p --plugin-dir packages/todo` probe session spawns each role once with a one-line ask and each reply shows its role body; postmortem on the probe session lists `todo:builder`, `todo:reviewer`, `todo:clerk` with their frontmatter models; no body restates repo rules |
| R2 | `run/SKILL.md` rewrite to the ruled architecture: dispatch by role type with model/effort params; §Models collapses to the dispatch law with the consult doors recast as read-only reviewer spawns (the `consult` column stays); fresh-per-unit + base-only persistence (tactical map law, fold at close); gates by construction; lean-session law; boundary re-fire rule; the small-work batching law with its hardening bar; superseded sections deleted, not kept beside | | blind | design | every ruled block in `## Design` has its skill lines; grep finds no orphan text (fresh-per-role, whole-gate default, reviewer-tier sentence, model-only column, fable-pricing lines, trivial-bundling as an aside); every `run/SKILL.md` line postmortem quotes still resolves; `references/skill-review.md` checklist passes |
| R3 | surfaces move with the change: todo README (line "a gate per unit"), AGENTS.md layout (todo grows `agents/`, no longer "manifest + skills"), `rules` SKILL.md (tactical map, private-scratch death, Steps paragraph: model/effort pairs, `owner`, review values, `consult` column), `audit` SKILL.md (Steps columns it checks), `postmortem` SKILL.md (violation candidates) | sonnet | | | README and AGENTS.md state the role files and dispatch law; rules states the tactical map, the private-scratch death and the Steps-table shape; audit and postmortem check the new shape and rules; no stale claims |
| REL | merge P1–R3, cut the release train (`references/npm-publishing.md`), install the released todo | owner | | | the installed todo version carries R1–R3 |
| S1 | manual sweep of every progress file under `~/git` to the new Steps shape — agentic 4, firstmenu 5, homelab-gitops 2, stonks 5, streamdeck 1 | owner | | | `/todo:audit` clean in each of the five repos |
| R4 | fresh `/todo:run` of `progress/audit-refactor.md` under the released skill, then `/todo:postmortem` on its full session id | owner | | | `## Plan` carries the after side beside the baseline: shape named, per-unit wall and tokens; $ per unit only when the run used the baseline's backend |

## Plan

Baseline: `references/run-costs.md` and its kit until P1, then this section.
P1 carries the baseline numbers here; the full record is
`archive/run-costs-d7ab34d2.md`. The baseline ran on glm (`sonnet` rows on
glm-5.3-flash, the rest on glm-5.3), so its dollars compare only against a
glm-backed R4; time and tokens per unit compare on any backend.

Estimate R4 replaces: under the ruled architecture, batching included, about
11–12m and ~3.5M tokens per unit (a desk simulation of the audited 4-unit shape:
~45–50m, ~13–15M tokens). R4's run of audit-refactor has a larger grain, so the
comparison is per unit, never totals.

Enforcement inventory: the todo plugin has no test suite of its own, and
`claude plugin test` has nothing to exercise in a hooks-less plugin. The gates are
`claude plugin validate`, postmortem's output on the baseline (P1) and probe (R1)
sessions, the greps named in R2/R3's rows, and `/todo:audit` (S1).

Out of thread, owed elsewhere: testril deletes `references/run-rules.md` in its
own thread; nothing here depends on it. Before this thread closes, testril's
`TODO.md` carries that deletion, or the deferral is lost.

Reading list: `packages/todo/skills/run/SKILL.md` and
`packages/todo/skills/postmortem/` whole; `references/run-costs.md` and
`references/run-costs/` (P1); `references/skill-review.md` and Anthropic's
skill-creator (`anthropics/claude-plugins-official`,
`plugins/skill-creator/skills/skill-creator`, via `gh`) before P1, R2 and R3.

## Design
The architecture, as ruled:

- **Roles are engine objects.** `packages/todo/agents/` ships `builder.md`,
  `reviewer.md`, `clerk.md` — frontmatter `name`, `model`/`effort` defaults and
  `tools`; the body is the role's law and becomes the subagent's whole system
  prompt. The CLAUDE.md/AGENTS.md hierarchy still loads, so a role body carries the
  role's law, never repo rules. Same-type spawns share the prefix, so they enter
  cache-warm (baseline: ~3.9k fresh tokens instead of ~27k).
- **Fresh subagent per unit, inheriting only the common base.** The base is two
  layers: the role file (how the role behaves — identical every spawn) and the plan
  file (what the thread knows — goal, rows, criteria, reading lists, enforcement
  inventory, plus the tactical thread map: files, anchors, scoped gate lines,
  written once by prep or the first unit and folded as units land). Everything
  unit-private lives in per-worker scratch and dies at unit close; the fold law is
  the promotion boundary. No long-lived agents, no raw-thought traces.
- **Tier rides the dispatch.** The Agent call carries `model` and `effort`; the
  Steps table's model column becomes model/effort pairs (e.g. `sonnet/low`), or
  `owner` for a unit the run must not do. No role×effort cross-product, no
  generated files. `checklist` dies as a named review tier — a cheaper reviewer is a
  model/effort pair on the review dispatch.
- **Gates by construction.** A builder owns the unit's package tree and runs only
  there; the workspace gate is the boundary's job (clerk/session), never the
  builder's. The re-fire rule lives at the boundary: a firing whose extracted
  output matches the last is flagged.
- **The session stays lean.** It never builds, reviews or gates; it commits, rules,
  routes review and passes tiers — nothing falls back to "the session will do it".
- **Verification.** Blind review stays the default and is fresh per unit (it never
  sees the builder's report). A row tiers down only when its plan names why the
  unit is low-risk — the same justification shape `review: none` requires.
- **Consult doors survive, recast as spawns.** The three fable doors — the
  before-dispatch design consult, the slice review, the rescue — continue as
  read-only `todo:reviewer` spawns at chosen tiers, and the `consult` column
  stays. No fable-specific pricing law: fable is a model value on the dispatch.
- **Small work is one dispatch.** Rows the plan marks small at hardening batch into
  one worker spawn per thread or group: base + all rows, edits in sequence,
  per-unit commits, scoped gates as it goes, one workspace gate at the batch
  boundary, one report; then one blind review over the whole batch diff and one
  clerk verification. The bar for small is no design freedom — deletions, renames,
  doc fixes, named-target swaps; anything money-touching or design-bearing never
  qualifies. The pipeline count scales with risk, not with unit count.
- **No repo-level run-rules anywhere.** The generic mechanism lives in the skill;
  per-plan specifics live in the plan.
- **One run analyzer.** `/todo:postmortem` is the only door that measures a run;
  a measured session's record is archived, never kept in `references/`.

Standing context is resolved by the architecture: worker contexts are small by
construction and round-trips collapse; the orchestrator's own monotone growth is
the accepted remainder — cache-priced, re-measured rather than argued.

Engine facts, from code.claude.com docs and changelog (engine 2.1.296):

- Agent tool: per-call `model` and `effort` (`effort` since v2.1.292) beat
  frontmatter and persist across resume-by-message. Effort precedence:
  `CLAUDE_CODE_EFFORT_LEVEL` env > per-invocation > frontmatter > session.
- Agent file frontmatter: `name`, `model` (alias, full ID or `inherit`), `effort`
  (`low|medium|high|xhigh|max`), `tools`; plugin agents ignore
  `permissionMode`/`hooks`/`mcpServers`. Identity comes from `name:` (the filename
  only when `name:` is absent) and registers as `todo:<name>`; `name:` cannot
  contain `:`. Edits are picked up live; the first `agents/` directory of a scope
  needs a restart.
- The file body replaces the Claude Code system prompt; the CLAUDE.md/AGENTS.md
  hierarchy still loads for every custom subagent (`omitClaudeMd: true` opts out).
  Built-in Explore/Plan skip CLAUDE.md.

Rejected: repo-level run-rules (per-plan specifics live in plans); long-lived worker
agents (context grows unboundedly, assumptions bleed); a generated role×effort
cross-product (per-call params exist); automatic tier-down for mechanical rows (the
one real catch came from a blind review of a mechanical unit); deleting the consult
doors (kept, recast as spawns); a second analyzer beside postmortem.
