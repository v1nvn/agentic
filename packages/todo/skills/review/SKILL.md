---
name: review
description: Review a pull request's whole diff and fix the findings the owner picks on the PR branch. Use when the owner asks for a review of a PR, most often one a /todo:run run opened.
argument-hint: <pr>
disable-model-invocation: true
---

Review one pull request end to end. The argument names a PR in the current repo — a
number, a URL or a branch. One that does not resolve, or a PR already merged or
closed: say so and stop.

## Gather

- `gh pr view <pr> --json number,title,state,baseRefName,headRefName,isCrossRepository`
  names the base and the head; `git fetch origin <base> <head>`, and the diff under
  review is `git diff origin/<base>...origin/<head>`.
- A PR a `/todo:run` run opened has its plan in `progress/<slug>.md` while the
  thread is live and its landed rows in `archive/<slug>.md` — the whole plan once the
  thread closed — matched by the branch name or the plan ids in its commits.
  Its rows are the review's context. Several candidates, or none:
  the diff is the whole context.

The session reads no source and no diff itself; the reviewers do.

## Review

Dispatch two fresh `todo:reviewer`s in one message, so they run in parallel, each on a
branch review — the brief names the diff command above, the plan path when there is
one, and its lens:

- regressions, critical issues and simplification (DRY, YAGNI);
- money, seams, migrations and the doors the units share.

A reviewer whose report comes back empty or malformed is re-dispatched once.

## Report

One list, `blocking` before `nit`, each `file:line — finding — lens`; a finding both
reviewers raised appears once, under both lenses. Then stop: the owner picks what to fix — all, `blocking` only, or named
findings.

## Fix

On the owner's pick, check the tree: it must be the PR's head branch, clean, and equal
to `origin/<head>`; a cross-repository PR cannot be pushed to. Otherwise say so and
stop.

Dispatch one fresh `todo:builder`. Its brief names the PR branch, the picked findings,
its scratch file `progress/.scratch/review-<pr>-builder.md`, and the workspace gate
line with its ceiling — the plan's, else the repo's gate from its CLAUDE.md or package
scripts. The builder fires a gate whose ceiling is four minutes or under; a longer or
unmeasured gate the session fires in the background once the builder stops, and a red
result goes to a successor builder with the failure in its brief. Items the builder
reports as stopped go back to the owner with its options.

Commit only what landed on a green gate — one conventional line, no trailer — push to
the PR branch, never to its base, and delete the scratch file. The fix diff gets no
further review; the closing line names the commit and the findings left unfixed.
