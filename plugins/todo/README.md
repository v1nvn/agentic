# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill           | Args              | What it does                                                                                                                                          |
| --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/todo:rules`   | —                 | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.                                      |
| `/todo:init`    | —                 | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.                                      |
| `/todo:new`     | `[title]`         | Start a thread the moment it is picked up. Title given: used. Skipped: derived from the session. Index entry always; a file when the entry needs one. |
| `/todo:run`     | `<plan> [units]`  | Execute a plan file unit by unit — fresh subagents per unit, a gate per unit, one commit per unit. The final unit closes the thread.                  |
| `/todo:status`  | `[thread]`        | Read-only projection: the board (no arg), or one thread's state · next step.                                                                          |
| `/todo:audit`   | `[thread] [unit]` | Check the repo, one thread, or one unit against the rules; fix drift in place, propose judgment calls.                                                |
| `/todo:handoff` | —                 | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists.                          |

The verbs auto-invoke on their triggers — handoff asks, plan-file run asks, what's-next
asks, thread starts, fresh-repo setup. `/todo:audit` runs only when typed.
`/todo:rules` loads contextually on any touch of the four surfaces.

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```
