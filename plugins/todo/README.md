# todo

Work tracking: `TODO.md` → `progress/` → `references/` → `archive/`. The plugin carries
the rules and the verbs; every repo carries data only.

| Skill           | Args             | What it does                                                                                                                |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/todo:rules`   | —                | The tracking rules, the single copy. Loads on any touch of `TODO.md`, `progress/`, `references/`, or `archive/`.             |
| `/todo:init`    | —                | Fresh setup only: creates `TODO.md`, `progress/`, `archive/`, `archive/completed.md`. No repo arg, no migration.             |
| `/todo:new`     | `[title]`        | Start a thread at session end. Title given: used. Skipped: derived from what the session discussed. Index line always.       |
| `/todo:run`     | `<plan> [units]` | Execute a plan file unit by unit — one subagent per unit, a gate per unit, one commit per unit. The final unit closes the thread. |
| `/todo:status`  | `[plan]`         | Read-only projection: the board (no arg), or one thread's state · next step · live log.                                      |
| `/todo:cleanup` | —                | Optional hygiene, never required: archive sweep, log realign, index/`progress/` divergence repair.                          |
| `/todo:handoff` | —                | Continue this session in a fresh one: update the thread file and emit a pointer, or a self-contained block when none exists. |

The verbs auto-invoke on their triggers — handoff asks, plan-file run asks, what's-next
asks, end-of-session thread starts, hygiene asks, fresh-repo setup. `/todo:rules` loads
contextually on any touch of the four surfaces.

## Install

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install todo@agentic
```

## No sync verb

There is no sync verb, by design: nothing is copied anymore. The rules live once, in
`/todo:rules` — every repo reads the same text, so nothing can drift and nothing needs
stamping.
