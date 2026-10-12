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
module — the module environment has no Node. Imports use explicit `.js`
extensions so the same file type-checks under `nodenext` (packages) and
`bundler` (`tsconfig.mods.json`).

Shared pure code has one home, `packages/core/src/`; root `yarn build` stamps
committed byte-exact copies into each mod home's `hooks/kit/` and `tests/kit/`
from `stamp.manifest.json`. The guard `packages/core/test/stamp.spec.ts` goes
red on a hand-edited copy, an orphaned stamp and a home importing another
home's stamp. The npm side imports core directly; the island never imports
npm — the stamp is the bridge. Never edit a stamped copy: edit core, extend
the manifest, `yarn build`.

The corollary — islands draw, processes compute: `$.fs.read` rejects over
4 MiB with no range form, so an island never bulk-reads. Real data comes from
one `$.tool.call({ tool: 'Bash', command: ... })` exec of the plugin's shipped
CLI — a standalone `bin/*.mjs` build (every dependency inlined,
`ssr.noExternal: true`), committed in the plugin folder and synced by
`yarn build`, the way `statusline` ships `render.mjs`. The exec rides the
permission path: the plugin's README carries the one `Bash(...)` allow rule a
fresh install needs.

## The mod kit

Every hooks module is thin over the stamped kit (`hooks/kit/mod.ts` beside
`draw.ts`); a hand-rolled copy of anything the kit owns is a defect. The kit
is JSX-free `.ts` — panes stay the home's `.tsx`, event-fed state stays the
engine's own `on()` with the home's reducers feeding pane renders.

| Helper | Owns |
| ------ | ---- |
| `lineOf` (draw.ts) | the one line an exec shows: refusal, stdout, stderr, fallback |
| `acceptJson` | the exec/accept/parse door: stdout parsed and accepted, or the failure line — a refused door keeps the pane's last good value |
| `PaneSpec` | pane chrome as fields: `frame` (sizing via `paneRows`), `empty`, `refreshMs` (the re-scan cadence, gated by `showsPane`) |
| `CommandSpec` | the exec command's descriptor; the home's one `session.start` loops over its declared list |
| `ageAgents`/`cellAt` | per-agent tick bookkeeping in one lifetime: ids leave with the roster |

`$` never crosses a file: the validator refuses `$` (or a noun of it) passed,
bound or read as a value, and a hook must be a function literal or a same-file
function name — so the engine alone passes `$` to hooks, clocks and refresh
re-scans are wired in the home's own `session.start`, and the kit takes
values, hooks and `on` only. Engine tests ride the stamped `tests/kit/`
copies: `stubEngine(on, answer)` answers and records the nouns a mod's hooks
call; a test adds its home's own fixtures beside it.

## This repo's shape

- The mod's home is the package root — `packages/<name>/` itself — sources
  committed as `.ts`; the synced artifacts per home are its exec'd CLI
  (`bin/send.mjs` for rm and md, `bin/usage.mjs` for zai, `bin/report.mjs` for
  tokens) and its stamped `hooks/kit/` and `tests/kit/` copies. The
  marketplace `source` points there. The engine's test runner collects every
  `*.test.ts` under that root, so inside a mod home the name belongs to
  engine tests — the package's vitest suite names its files `*.spec.ts`.
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
  import exception); a noun of `$` is never bound, passed or read as a value.
- An `on(...)` hook must be a function literal or the name of a same-file
  function; a matcher-less event registers once per module.
- `import()` is refused; `import` declarations only, at the top of the file.
- A plugin's `types/*.d.ts` is self-contained — imports are refused, so the
  state shapes it names live inline, however much they mirror src shapes.
- A command name that collides with a built-in (`usage`, …) is refused at
  `$.command.register` — at runtime, and the hook is skipped and named in the
  transcript. Pick names that don't collide.

## Surfaces this repo uses

| Surface     | How                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pane        | `$.ui.open({ id, title })` from something the person did (a command); `on('ui.render', { component: 'Pane', requestId: id })` draws it with elements from `$.ui.resolve(e)`; Esc/dismiss closes; zero space until opened |
| command     | `$.command.register` in `session.start` + `on('command.run', { command })`; return `{}` to print nothing (a pane's command answers nothing — `text` would be model-read)                                                 |
| timers      | `$.clock.every(ms, fn)` from `session.start`; the handle lives until the module reloads                                                                                                                                  |

A pane report draws through one `<Text>{...}</Text>` carrying the same
plain-text body the CLI prints — `Text` draws the string verbatim, so a
fixed-width report keeps its alignment with no markdown chrome (a fenced
`<Markdown>` block renders as a code box and reads as a foreign panel).
Size to `e.props.bodyColumns`; a fixed-width report keeps its own width.
State a drawing reads belongs in `$.state` (module
variables die on reload): `atom(...)` at module top, `read($, atom)` in the
render hook (subscribes the instance), `update($, atom, fn)` from events.

## Docs and source

- Docs: `code.claude.com/docs/en/plugins/mods/` (overview, create, interface,
  events, api, test, troubleshoot, reference).
- Official mods with tests: `anthropics/claude-code` under `mods/`
  (`agents-md`, `diff`, `sec-default`, `telemetry`) — the shape this repo
  follows, including the vendored `types/claude-code.d.ts` and its tsconfig.
