# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill              | Args               | What it does                                                                                                                                          |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/todo:rules`      | —                  | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.                                      |
| `/todo:init`       | —                  | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.                                      |
| `/todo:new`        | `[title]`          | Start a thread the moment it is picked up. Title given: used. Skipped: derived from the session. Index entry always; a file when the entry needs one. |
| `/todo:run`        | `<thread> [units]` | Execute a thread file group by group — one commit per unit, one review per group. The run never adds units; the final unit closes the thread.         |
| `/todo:review`     | `<pr>`             | Two reviewers over a PR's whole diff — regressions and simplification; money, seams and migrations — then fix what the owner picks on the PR branch.  |
| `/todo:postmortem` | `[session-id]`     | Autopsy a finished run's transcripts: the time tree, the token ledger and cost per agent and model, plus run-rule violation candidates.               |
| `/todo:status`     | `[thread]`         | Read-only projection: the board (no arg), or one thread's state · next step.                                                                          |
| `/todo:handoff`    | —                  | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists.                          |

The verbs auto-invoke on their triggers — handoff asks, thread-file run asks, what's-next
asks, thread starts, fresh-repo setup. `/todo:review` and `/todo:postmortem` run only when typed; an audit runs when the owner asks — the repo, a thread, a unit — or when the rules' stamp gate fires the auditor, whose script restamps a rules-unchanged lag in place.

`/todo:run` dispatches the builder and the reviewer; `/todo:review` dispatches the reviewer; an audit — the owner's ask or the stamp gate — dispatches the auditor. Each file holds its role's law; the thread file's Steps
table sets the build tier per unit (`model`, or a `model/effort` pair like `opus/high`) and
marks the units that get a review of their own (`review: unit`); reviews and audits carry their own tier.

| Agent           | Default         | Does                                                                                            |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `todo:builder`  | `sonnet/medium` | Builds units in sequence on their scoped gates, fires the workspace gate, fixes routed findings |
| `todo:reviewer` | `opus/high`     | Read-only: group, unit and branch review, design consult, rescue diagnosis                      |
| `todo:auditor`  | `sonnet/low`    | Checks tracking against the rules — repo, thread or unit — fixes mechanical drift, proposes judgment calls; the stamp gate's audit when the rules moved |

Each `progress/<slug>.md` carries a `**Todo:** <version>` stamp: the plugin version that last minted, folded or audited it. A stamp behind the running version, or none, trips the rules' stamp gate on every verb that works or folds a thread: rules unchanged since the stamp, the gate restamps in place; rules changed, the auditor checks the thread against the clauses that moved, then restamps. A stamp ahead of the running version means the install is older: the stamp stays, no audit runs, and work stops until the plugin is updated. `/todo:status` names the lag; `/todo:review` is not gated.

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```
