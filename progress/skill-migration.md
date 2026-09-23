# Plugin surfaces — statusline-lab to a root skill, user-facing descriptions

> Rules: ../references/tracking.md · Index: ../TODO.md

**Run:** executed live in-session 2026-09-23 (no run-plan dispatch) · grain: one
commit per surface group + the release bump · owner-gated: the push (it publishes
npm at 0.21.0) — approved in session ("Go").

**Goal.** The 2026-09-23 audit verdict: statusline-lab's one command is the
marketplace's only wrong container — nothing intercepts it, its body is
model-executed teaching, and the docs say "use `skills/` for new plugins". It
becomes a root `SKILL.md` with `name: statusline-lab` (bare `/statusline-lab`
becomes the documented invocation case; the `plugin:` display prefix is
documented-irremovable). The four zero-token plugins keep `commands/`
deliberately — their `UserPromptExpansion` matchers (`^rm:send$`, `^md:edit$`,
`^md:view$`, `^zai:usage$`, `^tokens:usage$`) key on the command string, and
model auto-invocation would bypass the hook. Only their descriptions leaked
hook internals into user-facing text; the mechanism already lives in each body's
fallback note.

## Steps

| # | Step | Verify |
|---|------|--------|
| 1 | `commands/statusline-lab.md` → root `SKILL.md`; frontmatter `name` + user `description` + `when_to_use`; CLAUDE.md layout + one-skill clauses; README tree | `claude plugin validate`; fresh-session listing after release |
| 2 | rm · md ×2 · zai · tokens descriptions + zai/tokens plugin.json — hook internals out | `claude plugin validate` ×4 |
| 3 | `set-version.mjs 0.21.0`, push, release.yml green, reinstall, `/statusline-lab` fires bare | `gh run watch`; `npm view`; local cache holds `SKILL.md` |

Close: steps 1–3 verified → TODO line deleted, this file archived.

## Log

- 2026-09-23 — thread opened from the plugin audit + owner "Go". Docs facts
  verified against code.claude.com by a docs-check subagent: plugin skills are
  always namespaced (`plugin:name`, no manifest escape); bare `/name` invokes
  when unambiguous; one-skill plugins may put `SKILL.md` at the plugin root;
  `name:` frontmatter governs the last segment. The superseded
  statusline-lab-rework thread (PR #2 merged 2026-09-19) archived in this
  thread's opening commit.
