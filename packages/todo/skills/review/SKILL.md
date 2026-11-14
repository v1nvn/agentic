---
name: review
description: Blind review of one pull request, or of every PR a thread landed, read against the thread's plan — prints verified findings and stops.
argument-hint: <pr | thread>
disable-model-invocation: true
---

Load `/todo:rules` first — the thread shapes this review reads live there.

Review blind, print the findings, and stop. Never edit a tracked file, commit, push or post:
the owner routes each finding — fixing it in this session, or pasting it into the group's
`/todo:run` session.

## Gather

- **A PR** — a number, a URL or a branch: `gh pr view <pr> --json number,state,baseRefName,headRefName`,
  then `git fetch origin <base> <head>`; the diff is `git diff origin/<base>...origin/<head>`
  and the base commit is `git merge-base origin/<base> origin/<head>`.
- **A thread** — a `progress/<slug>.md` path or its slug, live or in `archive/`: every group's
  PR, found by the unit ids in commit subjects and the branch names
  (`gh pr list --state all --search <unit id>`). The diff runs from the first group's base
  commit to the last group's head, or to the default branch once all have merged.
- Anything that does not resolve: say so and stop.

The review is blind. Its plan is the thread file as it stood at the base commit
(`git show <base sha>:progress/<slug>.md`), because the builder writes into the thread while
it builds; never the thread at the head, the PR's description, or a builder's session or
report. Gate logs at `progress/.scratch/<slug>/gate-<unit id>.log` are read when present: a
criterion a test proves is proven by its log. A PR no thread built has the diff as its whole
context.

## Review

- Run every unit's close criteria — its greps and counts — with raw output.
- Check the core:
  - an unasked deviation from the thread's plan;
  - a test that could not fail: green with the behavior it names reverted, or crossing a seam
    only with a value where two readings coincide;
  - money and seams: both ends agree on unit and meaning;
  - the one-way rule: the old path deleted in the same change;
  - a new type, field or name where an existing one does the job;
  - a migration, registry entry, route or config key nothing reaches;
  - a test weakened to pass;
  - comments that restate the code; tracking references (unit ids, thread names) in code;
  - files the thread does not name;
  - each checklist line of the enforcement inventory;
  - what the units do together that no single unit shows.
- Weigh the group's **Review lens**.
- A thread review adds what one PR does to another's code, re-runs the Goal's measure the
  thread's Plan names on the final head against its bar, and runs the Plan's end checks.

Every finding is verified against the code before it is printed. Where reading cannot settle
it — memory held, a race, a retry, a byte budget — reproduce it: a test or the group's
**Rig**, every command under a `timeout`, a probe still running at ten minutes stopped and
reported as unsettled. A reproduction runs on the head in its own worktree
(`git worktree add <dir from mktemp -d> origin/<head>`), removed before the report, so the
tree this session started in ends as it began.

## Report

Findings only, most severe first, each
`file:line — finding — evidence (the read or the reproduction's output) — blocking | nit`.
`blocking` is every core check above, a missed close criterion, and a Goal measure past its
bar — except a comment that restates the code. `nit` is that comment, and what the thread's or
the repo's standing rules flag in simplification, naming or docs — never taste. A finding outside every unit says so. No praise, no summary of
what is fine. Then stop.
