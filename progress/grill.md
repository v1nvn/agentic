# Grill — interview pass on unit authoring

**Todo:** 0.53.0

## Goal

An owner ruling on whether todo gains a grill pass — an agent-run interview that
resolves a unit's ambiguity with its author before anything builds on it — and, on a
yes, the pass landed on the surface the ruling names.

## Current state

Named from the HN thread on shipping AI-written code you don't understand
(news.ycombinator.com/item?id=50151036): iamwil's `/grill-me` and Matt Pocock's
`/grilling` — the agent interviews the author to kill spec ambiguity before code
exists. No todo surface interrogates a unit's author: units are written into the
thread file, and their ambiguity surfaces later as a builder deviation stop or a
review finding, both costlier than an answer at authoring. No run has yet stopped on
an ambiguous unit — the case for the door is borrowed, not lived.

## Next step

Owner ruling on G1.

## Steps

| id | unit | model | review | consult | close criteria |
| --- | --- | --- | --- | --- | --- |
| G1 | Rule whether grill is earned, and on which surface | owner | none | | The ruling is written into Design; a yes adds its build units to this table |

## Plan

Open questions for the ruling:

- Is the door earned — no run has yet stopped on an ambiguous unit.
- The surface: at mint (`/todo:new`), before the builder is dispatched (`/todo:run`),
  or a skill the session invokes on demand.
- Who interviews: the session, or a dispatched role.
- Where answers land: folded into the unit's row and Plan, as a consult's rulings are.

A yes that lands a skill trips the skill-review gate — read skill-creator, review
against references/skill-review.md — before it ships.

## Design

The paths that already carry part of the job, and the gap:

- **Design consult** (reviewer role) rules the open picks a unit leaves, against code
  that exists. Grill asks the author before code does.
- **`ask: all` and the builder's deviation stop** resolve ambiguity mid-run, at build
  cost. Grill front-loads it to authoring, where the owner's answer is cheapest.
- Understanding is paid at writing or at debugging — pay it at writing, now a corpus
  rule in the rules-plugin thread. Grill is a candidate door for paying it at writing.
