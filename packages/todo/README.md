# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill              | Args              | What it does                                                                                                                                                       |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/todo:rules`      | —                 | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.                                                   |
| `/todo:init`       | —                 | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.                                                   |
| `/todo:new`        | `[title]`         | Start a thread the moment it is picked up. Title given: used. Skipped: derived from the session. Index entry always; a file when the entry needs one.              |
| `/todo:run`        | `<plan> [units]`  | Execute a plan file group by group — one builder per group, one commit per unit, one review per group. The run never adds units; the final unit closes the thread. |
| `/todo:review`     | `<pr>`            | Two reviewers over a PR's whole diff — regressions and simplification; money, seams and migrations — then fix what the owner picks on the PR branch.               |
| `/todo:postmortem` | `[session-id]`    | Autopsy a finished run's transcripts: the time tree, the token ledger and cost per agent and model, plus run-rule violation candidates.                            |
| `/todo:status`     | `[thread]`        | Read-only projection: the board (no arg), or one thread's state · next step.                                                                                       |
| `/todo:audit`      | `[thread] [unit]` | Check the repo, one thread, or one unit against the rules; fix drift in place, propose judgment calls.                                                             |
| `/todo:handoff`    | —                 | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists.                                       |

The verbs auto-invoke on their triggers — handoff asks, plan-file run asks, what's-next
asks, thread starts, fresh-repo setup. `/todo:review` runs only when typed; `/todo:audit` also fires on its own, with a thread argument, when the stamp gate trips; the no-argument sweep stays typed.
`/todo:rules` loads contextually on any touch of the four surfaces.

`/todo:run` dispatches two role agents. Each file holds its role's law; the plan's Steps
table sets the tier per dispatch (`model`, or a `model/effort` pair like `opus/high`) and
marks the units that get a review of their own (`review: unit`).

| Agent           | Default         | Does                                                                                                      |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `todo:builder`  | `sonnet/medium` | Builds a group's units in sequence on their scoped gates, fires the workspace gate, fixes routed findings |
| `todo:reviewer` | `opus/high`     | Read-only: group, unit and branch review, thread audit, design consult, rescue diagnosis                  |

Each `progress/<slug>.md` header carries a `**Todo:** <version>` line after the title and
optional `**Run:**`: the plugin version that last minted, folded or audited it. A missing
stamp means the file predates stamping; a stamp ahead of the running version means the
install is older, and the stamp stays. Every verb that works or folds a thread runs the
rules' stamp gate first: a stamp more than one minor behind, a major apart, or missing
trips it, and `/todo:audit` diffs the cached rules at the stamp against current, sends the
moved clauses to one `sonnet/low` reviewer, and restamps. `/todo:status` names the lag.

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```
