---
name: init
description: Set up work tracking in a fresh repo — creates TODO.md, progress/, archive/, archive/completed.md. Use when the user asks to initialize tracking in a repo that has none; fresh setup only, never a migration of an existing system.
argument-hint: (no args)
---

Load `/todo:rules` first — the surfaces this verb creates are defined there.

Fresh setup only, in the repo the session sits in, where no tracking exists yet: if
`TODO.md`, `progress/`, or `archive/` is already present, stop and say so — folding an
existing system in is hand work, never this verb. Create:

- `TODO.md` — the heading `# TODO — open-work index`, then the header line
  `> Rules: /todo:rules`, then nothing else: no seeded lines.
- `progress/` — empty.
- `archive/` — holding `completed.md`, seeded with its heading
  `# Completed — trivial one-shots` and nothing else.
