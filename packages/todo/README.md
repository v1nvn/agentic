# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill              | Args              | What it does                                                                                                                                                 |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/todo:rules`      | —                 | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.                                             |
| `/todo:init`       | —                 | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.                                             |
| `/todo:new`        | `[title]`         | Start a thread the moment it is picked up. Title given: used. Skipped: derived from the session. Index entry always; a file when the entry needs one.        |
| `/todo:run`        | `<plan> [units]`  | Execute a plan file unit by unit — the next unit builds while the last is reviewed, the workspace gate before each commit. The final unit closes the thread. |
| `/todo:review`     | `<pr>`            | Two reviewers over a PR's whole diff — regressions and simplification; money, seams and migrations — then fix what the owner picks on the PR branch.         |
| `/todo:postmortem` | `[session-id]`    | Autopsy a finished run's transcripts: the time tree, the token ledger and cost per agent and model, plus run-rule violation candidates.                      |
| `/todo:status`     | `[thread]`        | Read-only projection: the board (no arg), or one thread's state · next step.                                                                                 |
| `/todo:audit`      | `[thread] [unit]` | Check the repo, one thread, or one unit against the rules; fix drift in place, propose judgment calls.                                                       |
| `/todo:handoff`    | —                 | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists.                                 |

The verbs auto-invoke on their triggers — handoff asks, plan-file run asks, what's-next
asks, thread starts, fresh-repo setup. `/todo:audit` and `/todo:review` run only when typed.
`/todo:rules` loads contextually on any touch of the four surfaces.

`/todo:run` dispatches two role agents. Each file holds its role's law; the plan's Steps
table sets the tier per dispatch (`model`, or a `model/effort` pair like `sonnet/low`).

| Agent           | Default       | Does                                                                                             |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `todo:builder`  | `opus/medium` | Builds one unit tests-first on its scoped gates, fires the workspace gate, fixes routed findings |
| `todo:reviewer` | `opus/high`   | Read-only: blind unit review, whole-branch review, slice review, consult, rescue diagnosis       |

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```
