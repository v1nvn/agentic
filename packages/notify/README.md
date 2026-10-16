# notify

The home of the notify plugin — and its plugin root: the mod's hooks module at
`hooks/register.ts` (`.ts` the engine loads directly, no build), engine tests
at `tests/`. It posts one native macOS banner when Claude needs permission and
one when a turn truly finishes: repo and session named, the engine's own
message or the reply's closing line carried, a sound per class.

User-facing docs: [root README](../../README.md).

## Quickstart

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install notify@agentic
```

Needs macOS — the posting door is `osascript`. Nothing else: no command to
run, the banners fire on the two events.

## The banner

| Event | Title | Subtitle | Body | Sound |
| --- | --- | --- | --- | --- |
| permission prompt | `<repo> · permission` | the session's title | the engine's message ("Claude needs your permission to use Bash") | Funk |
| turn done | `<repo> · done` | the session's title | the reply's first non-empty line, capped at 120 chars | Glass |

The subtitle is the title the engine itself shows — read live from its session
registry (`~/.claude/sessions/`, freshest entry for the session). No entry or
no name yet: `session <first 6 of the id>`. The registry is the engine's own
layout, not a published door — it moves, the subtitle falls back.

A stop with background work or a scheduled wakeup in flight is a pause, not a
finish — nothing posts.

## The platform's ceiling

`osascript`'s `display notification` is the posting door, and a bare process
gets no icon and no click on macOS: the banner belongs to the signed bundle
that posts it, so `tell application` targeting shows no icon and clicks into a
scripts folder (verified on macOS 27). Title, subtitle, body and sound are the
whole surface, and nothing here fights for the rest.

## Develop

```sh
claude plugin validate packages/notify  # the mod, as the engine reads it
claude plugin test packages/notify      # the mod, through the engine
yarn lint && yarn typecheck             # from the repo root (typecheck
                                       #   covers tsconfig.mods.json too)
```

The mod API is early access and moves between Claude Code releases — a build
that refuses the module loads nothing, so validate after every engine update
and re-vendor `types/claude-code.d.ts` (repo root) from the engine-laid
`.claude-plugin/types/` when it changes. Read `references/mods.md` first.
