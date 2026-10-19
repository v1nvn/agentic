# todo — stop over-splitting threads, units and dispatches

## Goal

The todo plugin defines a thread and a unit, states the default grain as a rule, reviews by PR group unless a unit is marked for its own review, and forbids a run from minting or splitting units on its own. Every surviving split rule names the evidence that earns it. Re-planning the firstmenu code-health threads and two landed over-split threads under the new rules shows fewer units and dispatches than before, and `claude plugin validate packages/todo` is green.

## Current state

Landed. The paper re-plans (`~/.claude/handoffs/todo-grain/6-replans.md`, `7-replans.md`) took three passes of the rules; the last cut, with the tier fix applied:

| case | before: threads / units / dispatches | after |
| --- | --- | --- |
| firstmenu codebase audit | 6 / 41 / ~172 | 2 / 17 / ~26 (owner's hand cut: ~3 / — / 12–15) |
| agentic progress-sweep | 1 / 7 / ~7 | 1 / 7 / ~6 |
| enhansome qdrant-hop + -2 | 2 / 10 / 0 | 1 standing thread / 0 / 0 |

firstmenu's remaining gap to the hand cut is 4 unit reviews on real foundations and seams, 3 design consults, and successors guessed from line counts. The first live run under the rules is the measure that sizes the foundation marker (its final report lists late findings).

## Next step

None: released as 0.52.0 (owner, minor).

## Steps

| id | unit | model | review | consult | close criteria |
| -- | ---- | ----- | ------ | ------- | -------------- |
| U1 | the plugin rework | | | | landed: every todo skill, both agent files, README; validate, prettier and skill lint green |
| U2 | re-plan verification | | | | landed: the table in Current state |
| U3 | release | owner | | | owner picked minor; release workflow dispatched with `bump=minor` |

## Plan

- **Reading.** `~/.claude/handoffs/todo-grain/*`, every file under `packages/todo/`, `references/skill-review.md`, the skill-creator skill via `gh` before writing skill text (AGENTS.md).
- **Acceptance case.** firstmenu's codebase audit: 6 threads and 41 units as cut; hand re-derived at about 3 threads and 12–15 dispatches.
- **Re-plans are paper only.** firstmenu's files are not edited.

## Design

The base is `~/.claude/handoffs/todo-grain/5-consult.md` §1–§3 and §6: thread = one goal; unit = one commit and one outcome, never a finding; group = the units of one PR, default the whole thread; one review per group; a run never mints, splits or merges a unit; owed work waits in Current state for the owner.

- One builder per group reports at each unit's green and takes the next unit by message (owner, G1a).
- Builder default `sonnet/medium`; opus by cell on `review: unit` units and units with a design choice (owner, G5b).
- A unit review only on seam carriers and foundations; the final report lists late findings (owner, G2b).
- A fix is re-reviewed once only when its finding is on a `review: unit` unit; then the rescue (owner, G3b).
- Nits ride the fix round when one runs, else the final report; no sweep (owner, G6b).
- A live look's new wants: the owner mints at most one unit per look, built after the planned units in the same run (owner, G4a).
- A bare entry carries one clause per finding when its findings share one check (owner, G7b).
- The resume check is deleted; the version gate's stale-stamp audit gets its own `sonnet/low` reviewer dispatch when it trips (owner, G8a).
- A live builder waiting on the orchestrator gets a `hold` every four minutes, at most ten; then it lapses and a successor continues (owner, keep-alive ask; ten holds at ~0.1× its context each cost less than one ~1.25× re-write).
