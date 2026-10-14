---
name: review
description: Review a pull request's whole diff with two blind reviewers in parallel — one for regressions, critical issues and simplification (DRY, YAGNI), one for money, seams, migrations and shared doors — then fix what the owner picks on the PR branch. Use when the owner asks for a review of a PR, most often one a /todo:run run opened.
argument-hint: <pr>
disable-model-invocation: true
---

Review one pull request end to end. The argument names a PR in the current repo — a
number, a URL or a branch. One that does not resolve: say so and stop.

## Gather

- `gh pr view <pr> --json number,title,baseRefName,headRefName,additions,deletions` names
  the base, the branch and the size.
- A PR a `/todo:run` run opened has its plan in `progress/`, or in `archive/` once the
  thread closed — matched by the branch name or the plan ids in its commits. Its Steps
  rows, its tactical map's gate lines and the `nit` findings its Current state queued
  are the review's context. No plan: the diff is the whole context.

The session reads no source and no diff itself; the reviewers do.

## Review

Dispatch two fresh `todo:reviewer`s in one message, so they run in parallel, each on
a branch review of the PR against its base, each brief naming the PR, the base and the
plan path when there is one:

- one through regressions, critical issues and simplification — DRY, YAGNI;
- one through money, seams, migrations and the doors the diff's parts share — what
  the units do together that no single unit shows.

## Report

One list, `blocking` before `nit`, each `file:line — finding — lens`; a finding both
reviewers raised appears once, and the plan's queued nits join the nit list. Then stop:
the owner picks what to fix — all, `blocking` only, or named findings.

## Fix

On the owner's pick, check the tree first: it must be the PR's branch and clean, or
stop and say so. Dispatch one fresh `todo:builder` whose brief names the PR branch,
the picked findings, and the workspace gate line with its ceiling — the plan's, else
the repo's gate from its CLAUDE.md or package scripts with a ten-minute ceiling. It
fixes, fires the gate, and stops green with the tree uncommitted. The session commits
— one conventional line — and pushes to the PR branch, never to its base. The fix
diff gets no further review; say so in the closing line with the commit and the
findings left unfixed.
