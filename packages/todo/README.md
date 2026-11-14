# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill              | Args               | What it does                                                                                                                                                                        |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/todo:rules`      | —                  | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.                                                                    |
| `/todo:init`       | —                  | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.                                                                    |
| `/todo:brainstorm` | `[topic]`          | Think work through before it is a thread. The talk is noted as it happens — the owner's words quoted, proposals, menus and picks, open questions — in `progress/.scratch/`.         |
| `/todo:new`        | `[title]`          | Start a thread the moment it is picked up, or when the owner types it to close a brainstorm. Title given: used. Skipped: derived. A thread file is folded from the sitting's notes. |
| `/todo:run`        | `<thread> [group]` | Build one group of a thread — the units of one PR — in this session: consults first, one commit per unit, gates, then the PR with green CI. Stops ask the owner directly.           |
| `/todo:review`     | `<pr \| thread>`   | Blind review of one PR, or of every PR a thread landed against its Goal: reads the thread as it stood at the base, verifies each finding, prints them and stops.                    |
| `/todo:postmortem` | `[session-id]`     | Autopsy a finished build or review session: the time tree, the token ledger and cost per agent and model, plus run-rule violation candidates.                                       |
| `/todo:status`     | `[thread]`         | Read-only projection: the board (no arg), or one thread's state · next step.                                                                                                        |
| `/todo:handoff`    | —                  | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists.                                                        |

The verbs auto-invoke on their triggers — handoff asks, thread-file run asks, what's-next
asks, thread starts, fresh-repo setup, design talk before a thread. `/todo:review` and `/todo:postmortem` run only when typed; an audit runs when the owner asks — the repo, a thread, a unit — or when the rules' stamp gate fires the auditor, whose script restamps a rules-unchanged lag in place.

The owner opens each session. A thread is built one group at a time: `/todo:run <thread> <group>` in a fresh session per group, `/todo:review <pr>` in a fresh session per PR, `/todo:review <thread>` once every group has merged, then the close. The owner routes review findings — fixing them in the review session or pasting them into the group's run session.

An audit — the owner's ask or the stamp gate — dispatches the one agent:

| Agent          | Default      | Does                                                                                                                                                    |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `todo:auditor` | `sonnet/low` | Checks tracking against the rules — repo, thread or unit — fixes mechanical drift, proposes judgment calls; the stamp gate's audit when the rules moved |

Each `progress/<slug>.md` carries a `**Todo:** <version>` stamp: the plugin version that last minted, folded or audited it. A stamp behind the running version, or none, trips the rules' stamp gate on every verb that works or folds a thread: rules unchanged since the stamp, the gate restamps in place; rules changed, the auditor checks the thread against the clauses that moved, then restamps. A stamp ahead of the running version means the install is older: the stamp stays, no audit runs, and work stops until the plugin is updated. `/todo:status` names the lag; `/todo:review` is not gated.

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```
