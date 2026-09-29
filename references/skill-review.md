# Skill review

Every `SKILL.md` and `commands/*.md` under `plugins/` is reviewed against Anthropic's
skill-creator guidance plus this repo's own rules. Read the upstream, never install it:

```sh
gh api repos/anthropics/claude-plugins-official/contents/plugins/skill-creator/skills/skill-creator/SKILL.md --jq .content | base64 -d
```

The files that carry review rules: `SKILL.md`, `scripts/quick_validate.py` (frontmatter),
`scripts/improve_description.py` (description prompt), `agents/analyzer.md` (weakness axes).
The rest is eval tooling. When upstream drifts from the checklist below, upstream wins
and this file is rewritten.

`node .github/scripts/build-skills.mjs` lints frontmatter presence; everything else here is
read by eye.

## Frontmatter

| Check           | Rule                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | kebab-case, ≤ 64 chars, matches the invocation name the README and CLAUDE.md use                                                                                          |
| `description`   | ≤ 1024 chars; aim well under 100–200 words                                                                                                                                |
| Keys            | Claude Code keys are valid here: `when_to_use`, `argument-hint`, `disable-model-invocation`. `quick_validate.py` rejects them — it targets claude.ai uploads, not plugins |
| `<` `>`         | Allowed in descriptions here (`<url>`, `<slug>`); `quick_validate.py` bans them for claude.ai uploads only                                                                |
| `argument-hint` | Only when the skill takes arguments; a literal `(no args)` shows up in the menu as noise                                                                                  |

## Description

- It is the trigger: what the skill does and when to use it. All when-to-use content lives
  here or in `when_to_use`, never in the body.
- State the user's intent, not the mechanism. "Fetches with curl, falls back to a browser"
  belongs in the body.
- Lean slightly pushy — skills undertrigger. Name the loose case the user will actually type
  ("even when the user only pastes a bare link").
- Name categories of intent, not an ever-growing list of queries.
- Every clause resolves: an "otherwise" names the condition it is otherwise to.
- A `disable-model-invocation: true` skill needs no trigger text — only the owner invokes it.

## Body

- Under 500 lines. Past that, split by variant into `references/` files the body points at
  with when-to-read guidance; a reference over 300 lines gets a table of contents.
- Imperative. Caps and `NEVER` only for contract facts and routing; every other constraint
  carries its _because_.
- No instruction vague enough to read two ways; every external call has a failure branch.
- Code the model would rewrite on every run is bundled under `scripts/`.
- Speak only to the running model. A note for the maintainer — how a hook intercepts the
  command, why a version is pinned — is deleted from the surface.
- Shell state does not survive between Bash calls: a value one step prints and a later step
  reuses is named explicitly for the model to substitute.
- Temp paths are unique per run (`mktemp -d`), never a fixed `/tmp/<name>` that parallel
  runs overwrite.
- Sample output carries no machine-specific paths or personal data.
- Lack of surprise: the body does nothing the description would not lead a user to expect.

## Promoting findings

A review that turns up a class of defect this file does not name adds it here, in place, in
the section it belongs to.
