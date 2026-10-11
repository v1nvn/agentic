# todo:run — small runs take hours

## Goal
The ruled redesign is built into the todo plugin and released, every progress file
under `~/git` is on its Steps shape, and one fresh `/todo:run` of
`progress/audit-refactor.md` under the released skill is measured with
`/todo:postmortem`, its per-unit figures recorded in `## Plan` beside the
baseline's — each side's shape named.

## Current state
P1–R3 built and open as PR #18 against `main`; unreleased.

## Next step
REL — the owner merges PR #18 and cuts the release train.

## Steps
| id | unit | model | review | consult | close criteria |
|----|------|-------|--------|---------|----------------|
| P1 | `postmortem` absorbs the kit: token ledger, `cost-state` cost, shared reads, standing-context share, worker type and model in `scripts/analyze.mjs`; streamed chunks deduped by `message.id`; kit, briefs and `references/run-costs*` deleted; the report archived | | blind | | postmortem on `d7ab34d2-a919-4107-a99c-a52f663e5b1e` reproduces the baseline: 516 calls, 36.7M cache read, 356k out, 95.6% hit, 108:1, $45.63, orchestrator 32k → 161k; gate firings match `analyze.py` (93) on the same pattern — `d241a13` |
| R1 | `packages/todo/agents/` — `builder.md`, `reviewer.md`, `clerk.md` | | blind | | validate green; probe session `a5855450` spawned each role, each answered from its body; postmortem lists `todo:builder`/`todo:reviewer` on opus and `todo:clerk` on sonnet — `6a3c8ed` |
| R2 | `run/SKILL.md` rewrite to the ruled architecture | | blind | design | every ruled block in `## Design` has its lines in the skill or a role file; grep finds no orphan (`checklist` tier, fable pricing, whole-gate default, reviewer-tier sentence, model-only column, trivial bundling, clerk per run); postmortem's rule quotes resolve; blind review's seams fixed (plan edits are the orchestrator's, one gate per batch, consult tier defaults to the role) — `b864f9a` |
| R3 | surfaces move with the change: todo README and manifests, AGENTS.md layout and todo-sync rule, `rules` (Steps paragraph, tactical map, `Small rows:`, private scratch), `postmortem` (candidates quote the role files; suites outside the clerk flagged) | sonnet | | | README and AGENTS.md state the role agents; rules states the new Steps shape; `audit` needs no edit (it walks the rules' clauses); no stale claims — `239c552` |
| REL | merge P1–R3, cut the release train (`references/npm-publishing.md`), install the released todo | owner | | | the installed todo version carries R1–R3 |
| S1 | manual sweep of every progress file under `~/git` (two levels deep) to the new Steps shape: agentic 4, firstmenu 5, homelab-gitops 2, stonks 5, streamdeck 1, enhansome/webapp 3, ormi/testril 13; testril's `references/run-rules.md` folds into the four plans that cite it and is deleted | owner | | | `/todo:audit` clean in each of the seven repos; no `run-rules.md` in testril |
| R4 | fresh `/todo:run` of `progress/audit-refactor.md` under the released skill, then `/todo:postmortem` on its full session id | owner | | | `## Plan` carries the after side beside the baseline: shape named, per-unit wall and tokens, each builder's minutes to first edit beside the baseline's; $ per unit only when the run used the baseline's backend |

## Plan

Baseline — `audit-fixes-2`, session `d7ab34d2-a919-4107-a99c-a52f663e5b1e`: 4 small
units, 7 commits, 1 PR, 912+/292− lines; full record `archive/run-costs-d7ab34d2.md`.
It ran on glm (`sonnet` rows on glm-5.3-flash, the rest on glm-5.3), so its dollars
compare only against a glm-backed R4; wall and tokens per unit compare on any backend.

| measure | baseline | per unit |
|---|---|---|
| work wall (excl. rate-limit stall and owner waits) | 3h59m | ~60m |
| model calls | 516 | 129 |
| tokens ingested / out | 38.4M / 356k | 9.6M / 89k |
| cache hit · read : write · standing context | 95.6% · 108:1 · 95.4% | |
| cost (cost-state) | $45.63 | $11.4 |
| orchestrator context | 32k → 161k over 78 calls | |
| spawn entry (first-call context) | ~27.5k every spawn | |
| builder minutes to first edit | cold 23.1 · 20.9 · 11.1 · 3.8; from a state file 3.4 · 1.1 | |
| worker effort | `max` on all 12 spawns (inherited; no per-spawn control) | |
| suites outside a boundary role | 27 builder/reviewer runs, 30.4m | |

Estimate R4 replaces: under the ruled architecture, batching included, about
11–12m and ~3.5M tokens per unit (a desk simulation of the baseline's shape:
~45–50m, ~13–15M tokens). R4's run of audit-refactor has a larger grain, so the
comparison is per unit, never totals.

Enforcement inventory: the todo plugin has no test suite of its own, and
`claude plugin test` has nothing to exercise in a hooks-less plugin. The gates are
`claude plugin validate`, `node .github/scripts/build-skills.mjs`, postmortem's
output on the baseline and probe sessions, and `/todo:audit` (S1).

Reading list for S1: `packages/todo/skills/rules/SKILL.md` (released), each repo's
`progress/`, and for testril `references/run-rules.md` with the four plans citing it.

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
  there; the workspace gate is the boundary's job (the clerk's), never the
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
