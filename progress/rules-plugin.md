# Rules plugin — catalogue · config · per-session render

## Goal

One plugin, `rules`: a versioned catalogue of the owner's working rules behind a
one-file config, rendered into every Claude Code session by a SessionStart hook.
Nothing ever writes `~/.claude/CLAUDE.md` — the hand-edited global file is deleted
once the hook is proven, its content living in the catalogue. Repo `AGENTS.md`
files stay hand-written; the plugin never touches them.

Done means: catalogue + config ship in `packages/rules/`; the hook renders in
fresh, resumed and compacted sessions; `/rules-add` captures a stated rule the
same session; promotion lands it in the catalogue and a later session renders it;
the two enforcement hooks block a planted violation on the real path; the
hand-edited global file is gone; README and AGENTS.md count eleven plugins.

## Current state

Nothing is built. The corpus is settled (under Design): 68 rules in 9 groups,
texts from the mined 120-line draft verbatim and the live global file's uncovered
lines adapted in, regrouped so every owner-style rule sits in
`control` — one boolean drops them all from any render that wants them off.
Architecture ruled through a full-scale config iteration: one global
system, not repo-based; no tiers, presets, per-repo manifests or facts; the
config grammar is group booleans (`true | false | "enforce"`) plus a settings
block; delivery is a per-session render, never a written file. `~/.claude/CLAUDE.md`
is still live and would double-load with the hook until X1 deletes it.

## Next step

`/todo:run progress/rules-plugin.md` from C1.

## Steps

| id  | unit                                                                                                                                                                                                                                                                                                                 | model | review | consult | close criteria                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Catalogue + config: `catalogue.json` (9 groups under Design), `config.json` (defaults: all `true`, `git` + `safety` `"enforce"`, settings `call` + `rules_file_ceiling`), empty `pending.json`                                                                                                                       |       |        |         | JSON parses; group-for-group and rule-for-rule match the Design corpus; the three near-duplicate pairs (`one-way`/`name-existing-first`, `one-meaning-per-value`/`one-word-one-meaning`, `test-at-the-door`/`test-earns-place`) kept as-is |
| B1  | Build the plugin: `src/` → `bin/rules.mjs` (add · check · render), `hooks/hooks.json` (SessionStart → render; `commit-gate`; `block-skip-flag`), SKILL.md (body under Design), the `/rules-add` command; README + AGENTS.md to eleven plugins — mods precedent for plugin-local hooks, statusline precedent for a committed exec script |       |        |         | `claude plugin validate` + `claude plugin test` pass; render is a pure function of catalogue × config (snapshot); `check` reports parse, group coverage, render line count vs `rules_file_ceiling`                                         |
| V1  | Live proof on the real path: fresh session renders; resume and compact behavior pinned (re-inject or ruled); `/rules-add` appends; `commit-gate` blocks a planted bad commit; `block-skip-flag` denies the planted flag                                                                                              |       |        |         | Each observed live; gates proven red before trusted green; matcher set ruled and recorded in hooks.json                                                                                                                                    |
| P1  | Pilot in the owner's real sessions: at least one real philosophy captured via `/rules-add`, promoted through the skill, rendered in a later session                                                                                                                                                                  |       |        |         | Capture → promote → render observed end to end; owner gates the promotion commit                                                                                                                                                           |
| X1  | Retire the hand-edited global file: diff `~/.claude/CLAUDE.md` against the render — every line mapped into the catalogue or dropped on record — then delete it                                                                                                                                                       | owner | none   |         | File gone; a fresh session still renders; owner confirms nothing wanted was lost                                                                                                                                                           |

## Plan

- Hooks run via `${CLAUDE_PLUGIN_ROOT}` — `node "${CLAUDE_PLUGIN_ROOT}/bin/rules.mjs" render`. The plugin is local-only: no npm publish, no island (nothing draws).
- Enforcement hooks: `commit-gate` — PreToolUse on `git commit`, deny and show the diff; `block-skip-flag` — PreToolUse on Bash, deny any command carrying `--dangerously-skip-permissions`.
- Capture backstop: `/rules-add <text>` is a registered command exec'ing the CLI — deterministic, no trigger involved. The skill's trigger description is the supplement, not the mechanism.
- Out of this thread, still owed in their own repos' sessions: testril (Commands → README), ormi-admin (TSX out), enhansome/webapp (dated rulings out).
- Review `none` on X1: owner-executed deletion of a personal file — its close criteria are the owner's own live check.

## Design

**Settled.** One global system, not repo-based — per-repo birth, seeding, sync,
manifests and audits do not exist. One SKILL.md plus the commands — no second
skill. Enforcement is `commit-gate` and `block-skip-flag` only. Repo `AGENTS.md`
files stay philosophy-only — commands live in the README or the owning skill; a
repo earns its `AGENTS.md`, no stubs. graph-node is upstream, not ours.
`CLAUDE.meta.md` stays deleted; its rebuilt content is the corpus.

**Architecture.** Delivery is a hook, maintenance is a skill: no skill loads in a
normal session — `SessionStart` renders `catalogue.json × config.json` into
context; the skill wakes only when rules are being changed. The render is a pure
function; `check` is its self-test.

```
packages/rules/
  catalogue.json     # 9 groups, the prose (68 rules)
  config.json        # group booleans + settings
  pending.json       # the capture queue
  bin/rules.mjs      # add · check · render   (committed build, synced from src/)
  src/               # the CLI's source
  hooks/hooks.json   # SessionStart → render · commit-gate · block-skip-flag
  SKILL.md           # maintenance law (below)
```

**Default config.**

```json
{
  "base": "1.0.0",
  "settings": { "call": "Maalik", "rules_file_ceiling": 110 },
  "groups": {
    "control": true,
    "change": true,
    "verification": true,
    "git": "enforce",
    "economy": true,
    "communication": true,
    "safety": "enforce",
    "tools": true,
    "docs": true
  }
}
```

**SKILL.md.**

```markdown
---
name: curate
description: Maintain the rules catalogue — promote pending candidates,
  refine or retire rules, route repo-specific rules to their repo. Use
  when a rule or philosophy is being added, questioned, changed, or
  promoted, or when promoting the pending queue.
---

The catalogue and config in this package are the only source; sessions
receive a per-session render via the SessionStart hook. Nothing edits a
render.

- Promote: each entry in pending.json goes to exactly one home — a group
  in catalogue.json, the repo's own AGENTS.md (repo-specific), or rejected
  as a one-off. Admission gate: cross-project, uncovered by an existing
  line, the owner lets it in.
- Refine: rewrite the line in place, bump the version. Git is history.
- After any edit: run `rules check`. The owner gates the commit — show
  the diff and stop.
```

**The corpus — 68 rules, 9 groups.** C1's input, verbatim.

### control — who runs the session (11)

- I am Vineet. Call me `Maalik` 🙏 (or `Lord`).
- Investigate and report first; change nothing until the go-ahead. Approval is per-action, not per-session.
- "Hold on" means stop immediately.
- Do only the named problem: no adjacent fixes, no resurrecting reverted work, no crossing repos.
- A decision I must make arrives as lettered options with gains, costs and a recommendation, argued on real examples. Never self-rule a big deviation; stop and ask.
- On return or pause: recap done / state / next / what's on me, and re-ask pending rulings.
- I gate commits: show the diff and stop.
- Merge main into a stale PR branch, never rebase. Merge commits default, squash exceptional.
- No spend: free tiers and local evals; design as someone with money would, then scale back.
- No tool or agent attribution in commits, PRs, issues or reviews.
- My screenshots and screen captures never leave this machine.

### change — how code changes (11)

- Minimal diff: reduce to the actual fix; reject machinery the fix doesn't need.
- Clean fixes only — no band-aids, hacks or special cases; park it if it can't be done cleanly.
- One way to do a thing: wire the existing abstraction, delete the old path in the same change, never expand vocabulary while an existing term works.
- Before proposing a new type, field, mechanism, name or term, name the existing one that already does the job — wire it, don't invent a second one.
- One meaning per value; fix the surface, never overload a value or add a compensating flag.
- One word per meaning and one meaning per word, across code, docs and conversation; when a meaning shifts, rescope it everywhere in the same change.
- Never format code by hand — run the repo's one format command when done changing code.
- Nothing shipped means breaking changes are free: delete, don't deprecate; no v2, no compat shims, one version number.
- A redesign is planned from the new system, not fitted to the old one: its tests, surfaces and mechanisms derive from the new doors; an old test, mechanism or name survives only when shown to do a job the new design has.
- A port keeps behavior and meaning, not shape: where the code being moved can say the same thing more cleanly in its new home, write it that way.
- Keep the built thing simple, lean, and as close to the system's own surface as it can be; anything on top of that is a new todo thread, never machinery inside the current one.

### verification — how work is proven (12)

- Numbers are proven, never eyeballed: measured, reproducible, on real data. Extrapolation is a failure.
- Diagnose from real source, logs and DB before proposing a fix; never answer from memory; re-read every file:line anchor before relying on it.
- Test at the door a caller, a peer or the money would notice — scenarios by default; a unit test only where a scenario cannot catch the break.
- A test earns its place only by catching a break a caller, a peer or the money would notice; write it first, failing, when the fix changes such a value and no existing test moves with it.
- Deleting a test or re-blessing a snapshot is licensed only by breaking the code it protects and re-catching every break in the retained tests.
- Fake the peer, never your own client: local fakes behind the real client, every snapshot reviewed one by one, never in bulk; the default suite touches no network, live services opt in explicitly, a test double earns nothing.
- Slow checks become cheap mechanisms, never tolerances — a fake clock, not a sleep; structure rules are lints, not tests; the test that would pin a defect is a TODO line.
- Money paths get stricter, not looser: a mistake moves real money — rule, test and guard change together.
- Prove a gate red before trusting it green: plant a violation, watch it fail, remove it; green alone proves nothing — exercise a runtime change through the real path.
- A change to a visible surface is verified by looking at the surface — a screenshot, a probe, a live run — before it is called done; green tests alone are not completion.
- Iterate on a cheap proxy in minutes; the one real pass runs at the end, owner-gated and checkpointed.
- At every seam, confirm both ends agree on unit and semantics, and cross it with a non-degenerate value.

### git — commit and PR mechanics (5)

- A commit message is one line, conventional — no body, no bullet list.
- Reply one line per resolved review thread, saying what was done.
- PR descriptions describe the surface, never internals: one sentence of what was wrong as a user saw it, at most six bullets grouped by surface.
- Never ship a major (breaking) version bump without asking first.
- CI green before merge; no build artifacts in git; automate release mechanics.

### economy — tokens and spend (4)

- Delegate token-heavy, mechanical, low-stakes work to cheaper subagents; orchestrate only. Scripts extract checkable facts; the model judges.
- Poll and rescue background agents (~10 min); respawn through rate limits; never idle-wait on a schedule — dispatch now or on my call.
- Build once: never re-run a pass whose artifact exists; resume from checkpoints.
- Never hand-write standard artifacts — fetch the canonical copy.

### communication — how replies read (6)

- Simple, direct English, no jargon. Explanations ride real examples with a before/after — the middle ground between a wall of text and bare one-liners.
- A word I haven't used yet — one I coined, an identifier, a label — gets one plain line the first time it appears.
- An argued bug, cost or design carries one real case through its states, with real values. Status and list replies skip that.
- Any HTML page is pictures first: flowcharts, sequence and state diagrams, each with a one-line caption; no walls of text on the page.
- Visual work: samples first, no talk. Consistency and simplicity over decoration; use the space you free; mockups trace real pixels.
- One thread, one fresh session: close with a self-contained handoff that carries findings and facts, not decisions.

### safety (5)

- Never `--dangerously-skip-permissions`; design around it.
- Secrets never enter the transcript; mask sensitive values in any output.
- Auth, login-gated or captcha steps are mine: stop and hand me a checklist.
- Scheduled and background tasks only when asked; delete unrequested ones.
- Glob deletion is dangerous — use explicit paths.

### tools (1)

- `gh` for anything GitHub; `gh api` accepts `{owner}`/`{repo}`/`{branch}` placeholders.

### docs — how repo files are written (13)

- `AGENTS.md` — philosophy and rules only: DOs and DON'Ts, each with its consequence or mechanism. No code, no examples, no commands, no history — a command lives in the README or the skill that owns it.
- `README.md` — setup, commands, architecture facts.
- `.claude/skills/<name>/` — the mechanism for one concern: its commands, flags, references.
- `progress/<slug>.md` — work state, self-contained for a fresh session.
- One `AGENTS.md` per repo; sub-repos carry their own; no `CLAUDE.md` beside it. When a rules file is renamed, sweep every pointer to it; compat copies and symlinks get deleted, not kept.
- A line in any of these files earns its place only when a session would otherwise get it wrong and the repo can't answer it.
- When a rule changes, rewrite it in place. Git is the history; no doc carries it.
- A rules file holds working principles, not what the code does or will do; a specific design goes in the plan — once built, the code says it.
- Present tense, imperative, addressed to the agent doing the work. Every constraint names its mechanism or consequence, never an adjective.
- Never appears in a rules file: progress/migration checklists, the same table twice, self-voided sections, generated matrices, `--help` duplication, restated tool defaults, dead references, package inventories, doc-maintenance meta, contact boilerplate.
- A repo's rules file: ceiling ~110 lines, target 30–80.
- Comments in code are a defect until the code is proven unable to carry the meaning: rename, then extract, then name the literal; a touched file comes out with fewer comment lines.
- Keep md files lean and operational: current rules and instructions only — no historical narrative, dated decision stories, run logs or what-changed sections. Git is the history; a live doc never points at an old commit or a removed document.
