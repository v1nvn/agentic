# Mods — how this repo writes them

A mod is a plugin whose hooks module runs inside the Claude Code engine:
functions it registers draw panes, bands, status lines and toasts, and watch or
rewrite events — none of it model-read, so every mod surface is zero-token.
This file holds what the engine guarantees and this repo's conventions; the
full API reference is the vendored `types/claude-code.d.ts` (repo root, first
line names the Claude Code version that wrote it).

## What a mod is

| File                            | Required       | Role                                                                                                                |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.claude-plugin/plugin.json`    | yes            | the plugin manifest; `types` names the state contract when `$.state` is used                                        |
| `hooks/hooks.json`              | yes            | `modules`: one path to the hooks module, relative to that file                                                      |
| the hooks module (`.ts`/`.tsx`) | yes            | exports `function register(on, options)`; the engine loads TypeScript directly — no Node, no bundler, no build step |
| `types/index.d.ts`              | with `$.state` | declares the plugin's `PluginState` values                                                                          |
| `*.test.ts` under `tests/`      | no             | run by `claude plugin test` against the engine                                                                      |

Claude Code v2.1.287+; mods are on by default (`--safe-mode`, `--bare`, and
`disableAllHooks` stop them). A marketplace installs a mod like any plugin, by
copying the folder — so the folder must be self-contained.

## The island rule

A hooks module imports **only files inside its own plugin directory, by
relative path**; the one bare import allowed is `claude-code` (types plus the
`atom`/`read`/`update`/`derive` state helpers). No npm package, no `node:`
module — the module environment has no Node. Shared pure code that both the
mod and the packages need lives in the island (`src/`), and the
packages import it from there — the reverse direction is impossible. Imports
use explicit `.js` extensions so the same file type-checks under `nodenext`
(packages) and `bundler` (`tsconfig.mods.json`).

## This repo's shape

- The mod's home is the package root — `packages/<name>/` itself (`tokens` is
  the first; the older plugins keep `plugin/` until they port) — sources
  committed as `.ts`, no artifact, no sync step. The marketplace `source`
  points there. The engine's test runner collects every `*.test.ts` under that
  root, so inside a mod home the name belongs to engine tests — the package's
  vitest suite names its files `*.spec.ts`.
- `tsconfig.mods.json` type-checks every mod package (`hooks/`, `tests/`,
  `types/`) against the vendored
  `types/claude-code.d.ts` (`moduleResolution: bundler`, `jsx: react` with
  factory `h`, `noUncheckedIndexedAccess` — island code must satisfy it).
  `yarn typecheck` runs both tsconfigs; eslint lints mod sources without
  type-aware rules (loading the vendored d.ts into the linter OOMs it).
- The engine writes fresh declarations into `<plugin>/.claude-plugin/types/`
  on every `--plugin-dir` load, plus a `tsconfig.json` stub — both
  gitignored, both regenerated. After an engine update, re-vendor the root
  `types/claude-code.d.ts` from there: the API is early access and moves
  between releases, and a module a build refuses loads nothing (the debug log
  alone says why, or one dim transcript line under hot reload).
- Gates, in order: `yarn typecheck` (both projects), `yarn lint`,
  `claude plugin validate <plugin dir>` (static, reads the module the way the
  engine will), `claude plugin test <plugin dir>` (fires events through the
  real engine; stubs answer `$.fs`, `$.env`, `$.command.register`, … by
  returning `{ value }`). A live smoke: `claude -p --plugin-dir <plugin dir>`
  — module-load failures print on stderr.

## Static-analysis rules the validator enforces

- `register` is a function declaration (`export function register(...)`); a
  bundled `export { register }` of a `const` arrow is refused.
- Every `on('<event>', ...)` name is a string literal; every call is spelled
  `$.noun.method(...)` in full. `$` may be passed only to functions declared
  at the top level of the same file (the state helpers are the allowed
  import exception).
- `import()` is refused; `import` declarations only, at the top of the file.
- A command name that collides with a built-in (`usage`, …) is refused at
  `$.command.register` — at runtime, and the hook is skipped and named in the
  transcript. Pick names that don't collide.

## Surfaces this repo uses

| Surface     | How                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status line | `$.ui.status(text)` — one line per plugin under the prompt; `undefined` clears it. Never model-read.                                                                                                                     |
| pane        | `$.ui.open({ id, title })` from something the person did (a command); `on('ui.render', { component: 'Pane', requestId: id })` draws it with elements from `$.ui.resolve(e)`; Esc/dismiss closes; zero space until opened |
| command     | `$.command.register` in `session.start` + `on('command.run', { command })`; return `{}` to print nothing (a pane's command answers nothing — `text` would be model-read)                                                 |
| timers      | `$.clock.every(ms, fn)` from `session.start`; the handle lives until the module reloads                                                                                                                                  |

A pane report draws through one `<Markdown text={...} />` carrying the same
plain-text body the CLI prints — `Markdown` takes `text` as a prop (children
do not type-check), in a fenced block for monospace alignment. Size to
`e.props.bodyColumns`; a fixed-width report keeps its own width. State a
drawing reads belongs in `$.state` (module
variables die on reload): `atom(...)` at module top, `read($, atom)` in the
render hook (subscribes the instance), `update($, atom, fn)` from events.

## Docs and source

- Docs: `code.claude.com/docs/en/plugins/mods/` (overview, create, interface,
  events, api, test, troubleshoot, reference).
- Official mods with tests: `anthropics/claude-code` under `mods/`
  (`agents-md`, `diff`, `sec-default`, `telemetry`) — the shape this repo
  follows, including the vendored `types/claude-code.d.ts` and its tsconfig.
