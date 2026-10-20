---
name: audit
description: Check work tracking against the rules and fix what drifted — the whole repo, one thread, or one unit of a thread. Also the stamp gate's audit: invoke with a thread argument before working an existing progress file whose `**Todo:**` stamp is more than one minor behind, any major apart, or no stamp. The no-argument whole-repo sweep is typed only.
argument-hint: [thread] [unit]
---

Load `/todo:rules` first — every check below is one of its clauses, and every fix takes its shapes.

## Scope

- **No arg** — the whole repo: `TODO.md`, every `progress/` file, the `archive/` and `references/` listings. Hand the reading to one subagent per few files and take back findings, never the files.
- **`[thread]`** — a slug, a path, or a title the index's pointers match: that thread's index entry and its progress file, checked against the rules and against each other. An entry with no file checks the entry alone.
- **`[thread] [unit]`** — one unit of that thread: its row, and the fold-in its close owed.

A thread or unit that does not resolve: say so and stop.

## Stamp gate

When the gate (see `/todo:rules`) sends a thread here, diff `~/.claude/plugins/cache/*/todo/<stamp>/skills/rules/SKILL.md` against the loaded rules. Identical apart from the `**Todo:**` line: report "rules unchanged", nothing to check. Otherwise run the thread scope against exactly the clauses that moved. A missing stamp or a swept cache copy means a full re-check against the current rules; the report says so. Every pass, unchanged included, ends by writing the running version into the stamp.

## Checks

1. **Shape.** Walk every clause of `/todo:rules` against each surface in scope — the index's sections and entry shape, entry context against the rules' test, a file for every entry that needs one and none for an entry that doesn't, the progress file's header, sections and Steps columns — a `review` or `consult` cell word outside the rules' vocabulary included —, one entry per file, pointers into `progress/` only, priorities on the ladder, no dates or anchors outside the places the rules allow, no history section (`## Log` and the like) in a progress file.
2. **Truth.** What the shapes cannot show:
   - the file contradicts itself — Current state, Next step or a step row against another part of the file, or against the code;
   - scratch notes (`<slug>.md`, `<slug>-<group>-builder.md`) left unfolded in `progress/.scratch/` — the `<slug>/` ritual-record folder is excepted;
   - a next step waits on a date that has passed;
   - a pointer or reference names a file that moved or never existed;
   - a thread whose goal is met still sits in `progress/`;
   - a landed group's units, or the plan text only they used, still in the live thread file;
   - a thread whose landed work sits in more than one `archive/` file — `archive/<slug>.md` is its one home;
   - a fact lives in two files, or the two copies disagree;
   - a name the tracking no longer uses — a retired skill, rule or file.
3. **Loss.** Work a landed row or an archived thread deferred that no live entry carries; a `progress/` file no entry points at.

## Fixes

- **Mechanical** — the shape is wrong and the content is not in doubt: fix it in place. Context past two sentences moves into a thread file in the rules' shape; triage on an entry for an unstarted thread is dropped, or replaced by where it is recorded; a file whose content its entry could hold folds back into the entry and is deleted.
- **Judgment** — which of two claims is true, whether a thread landed, whether a file is a thread, a report or a record: propose the fix with the evidence for it, and apply it only on the owner's word.

## Report

One list, most severe first: `file:line — rule clause — finding — fix`, each marked `fixed` or `proposed`. Nothing found: say so in one line.
