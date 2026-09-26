# Statusline — themes

## Goal

Five themes — `quiet`, `lean`, `classic`, `rich`, `custom` — drive every guided
path into the lab, and no path asks the owner to type a command inside Claude
Code. Done when:

- `configure --theme <name>` resolves a theme to the same settings-key shape a
  flags-only configure writes; item flags override the theme; a theme-less,
  flag-less configure opens the wizard on a TTY and errors with guidance
  without one.
- `--fallback` is gone — `--fallback=default` and `=existing` both error as
  unknown options; every string in the repo that named them is rewritten.
- A `preview` command renders candidate configs — `--theme`, `--layout`, item
  flags, the same resolution configure uses — without touching settings; plain
  (zero ESC bytes, glyphs intact) for chat, colored on a terminal. `configure`
  never previews; `--dry-run` is an unknown option.
- `catalog` leads with the themes block (one plain-words summary per theme,
  `*` on the theme the live key matches exactly) and `--themes` cuts to it.
- The wizard's first pass renders the five theme bars stacked and seeds its
  refinement pass from the picked theme; `custom` seeds bare.
- `/lab`'s skill flow asks the in-chat picker directly — descriptions carry the
  words, preview panes carry plain-rendered sketches — then the agent writes
  and the owner reads the live bar; zero `!` handoffs, no catalog table step
  for selection.

## Current state

u0 landed: five themes defined in Design and registry-verified by independent
re-grep. Enforcement gate live (scratch `gate.sh`: fifteen protected-suite
hashes, scoped greps, rebaseline subcommand). No product code yet. Baseline
gate green (typecheck, lint, 190 tests).

## Next step

Unit 1: test writer cuts the registry-pin test red from the Design
definitions, then the builder lands `src/themes.ts`.

## Steps

| id | unit | model | review | close criteria |
| --- | --- | --- | --- | --- |
| u0 | theme design pass (frontend-design) | | checklist | every theme's layout + per-item variant + plain-words summary is written into Design; every item and variant named there exists in the runtime registry, re-grepped by the verifier, not taken from the designer |
| u1 | themes table + registry pin | | | `src/themes.ts` holds the five themes; a test pins every theme's layout items and variants to the resolved runtime registry, and custom's seeding to each item's most-absent variant |
| u2 | `--theme` in configure/cli, `--fallback` out | | | `configure --theme lean` writes lean's assignments; `--theme lean --bar gauge` swaps one; a theme-gap (`--theme quiet --layout '{model effort} {cwd}'`) errors naming `effort`; `--fallback` and `--dry-run` are unknown options; bare non-TTY configure errors pointing at the two guides; the fallback branches, `printedConfig`, and their tests are deleted |
| u3 | catalog themes block | | | `catalog` prints the themes block first with summaries, `*` marks the live-matching theme, `--themes` cuts to the block; the live-theme matcher lands as its own function; a test pins the output |
| u4 | `preview` command | | | `preview --theme lean` renders both surfaces without touching settings, accepting the same resolution inputs configure does; `--plain` (and `NO_COLOR` honored by the runtime) strips every ESC byte; the agent uses it to fill picker panes |
| u5 | wizard theme pass | | | pass one stacks the five theme bars (`j/k` focus, `w` width, enter picks), pass two is seeded from the picked theme — `custom` bare — and `t` returns to pass one; a wizard test with fake deps drives a theme pick to a saved key |
| u6 | skill + docs rewrite | | | `plugins/statusline/SKILL.md` asks the picker directly (sketches from `preview --plain`), zero `!` handoffs, four-shown-plus-Other note; `packages/statusline/README.md` and the root README keep the wizard as the terminal guide; `status` names the live theme and its fix strings say `--theme classic`; repo grep finds no `--fallback`, no configure `--dry-run`, no `! npx` in the skill |

## Plan

Per-unit reading:

- u1–u3, u5: `packages/statusline/src/{themes,catalog,configure,cli,wizard,wizard-tui}.ts`
  and their tests under `packages/statusline/test/`.
- u2 anchors: `configure.ts` — the fallback ladder and `printedConfig` (both
  deleted), layout resolution, the flags overwrite (the override mechanism —
  themes only change where the base comes from), the assignments write.
- u4: `plugins/statusline/runtime/statusline.sh` (the `vlen` strip, `NO_COLOR`
  honor), plus `packages/statusline/src/payloads.ts` — the dry-run render
  becomes the preview command's renderer.
- u5 anchors: `wizard.ts` draft seeding and draw; `wizard-tui.ts` raw keys;
  `index.ts` gates the wizard on `process.stdin.isTTY`.
- u6: `plugins/statusline/SKILL.md`, `packages/statusline/README.md`, root
  `README.md`, `packages/statusline/src/status.ts`.

Enforcement inventory:

- The suites that pin the flag surface to the runtime's `COMPS` registry stay
  green; the new theme pin joins them. Everything else survives on merit only:
  settings splice surgery, restore/backup mechanics, and the layout grammar
  keep their pins; wizard, fallback, and dry-run tests are rewritten from the
  new doors, not adapted.
- A theme write and a flags write of the same values produce identical
  settings text — pinned by test, so a theme is never a second config format.
- After u6: no `--fallback` string in the repo outside `archive/` and
  `progress/` (records kept verbatim; the live plan names what it deletes); no
  `dry-run` in `configure.ts` (restore's `--dry-run` is another surface and
  stays); no `! npx` handoff in the skill; the wizard is documented as the
  terminal flow only. The scratch gate script (`progress/.scratch/gate.sh`)
  enforces the greps plus sha256 pins on fifteen protected suites;
  `cli`/`configure`/`status` tests are mixed (fallback/dry-run blocks inside
  protected pins) and re-baseline only on orchestrator instruction at the unit
  whose commit names the surface change.

Pre-flight picks (posted before the first dispatch):

- Custom seeding — confirmed as the lean: default layout, every item at its
  most-absent variant, so the bar starts bare and decisions add things.
- In-chat picker — four curated themes, `custom` via the picker's built-in
  Other free text.
- `lean`/`rich` drafts — frozen by the u0 frontend-design pass, not by an
  owner try-on (owner's launch instruction); the u1 pin test holds them from
  there. u0 is orchestrator-designed over a sonnet registry extraction;
  verification is a sonnet checklist re-grep of the registry.

PR grouping: one PR for the thread.

## Design

A theme is a named bundle — a layout plus one variant per layout item — and it
is configure-time only. The runtime never learns themes exist; the written
settings key is byte-shape identical to a flags-only configure of the same
values. One resolution engine under every guide: resolution is
`--layout` / item flags > theme > error naming the gap.

Rulings from the launching sitting:

- Redesign, not retrofit (owner's word): surfaces are derived from the new
  system, and an old mechanism survives only where the new design has its job.
  Backward compatibility is worthless here — no users exist, not even the
  owner. Consequences landed above: `preview` replaces `--dry-run` (rendering
  is a command's job, not a flag on the writer); bare non-TTY `configure`
  stops printing the effective config, which duplicated `status`; the skill's
  selection step drops the catalog table — the picker is the menu; the runtime
  honors `NO_COLOR` rather than growing a bespoke plain flag; `status` names
  the live theme through the same matcher `catalog` uses.

- Theme set: `quiet` (model and directory, nothing else), `lean` (text only, no
  graphics), `classic` (the shipped defaults, named — absorbs
  `--fallback=default`), `rich` (every gauge and counter), `custom` (bare;
  you decide everything).
- `--fallback` dies entirely; `=existing` has no successor — tweaking a live
  config means naming the theme plus the swap.
- The wizard stays in the CLI as the guide for terminals outside Claude Code
  and gains the theme pass; the skill stops handing off to it. Full wizard
  deletion was proposed and overruled: outside, the skill cannot guide, and
  the CLI is a standalone surface.
- Chat-native flow: the skill never asks the owner to type a command. Catalog
  words in chat; the in-chat picker shows plain-rendered bar sketches
  (markdown monospace preview panes render unicode glyphs, not ANSI; 2–4
  options, single-select); the agent writes; the live status bar is the
  color-true preview; try-on replaces preview-before-write — one cheap,
  reversible, backed-up write per look.
- Plain render rides the existing `vlen` SGR strip applied to output, honored
  behind `NO_COLOR`.
- Rejected: an MCP elicitation server (a form the in-chat picker already
  gives), ANSI through a MessageDisplay hook (undocumented passthrough, a
  band-aid), width simulation (the real bar at the real width is one write
  away), a theme name stored in the settings key (the ledger is resolved
  assignments; a live theme is re-derived by matching, which `catalog` and
  `status` both do). Precedent: Claude Code's own status line setup is an
  agent editing `settings.json`, not a TUI.

Theme definitions (u0 frontend-design pass — the spec u1 builds; every pair
verified against the registry by an independent re-grep):

- `quiet` — layout `{model cwd}`, style=`bare`, model=`zen`, cwd=`tail`. One
  cluster, no separator glyphs, dim lowercased model, short path. The move is
  near-silence.
- `classic` — DEFAULT_LAYOUT verbatim, every item at its `default_pick`,
  style=`plain`. No choices; it names the shipped bar.
- `lean` — DEFAULT_LAYOUT, style=`dots`. One rule: no bars, blocks, pills, or
  nerd glyphs — single symbols (↑ ⚡ ✓) count as text. model=`plain`,
  effort=`dim`, state=`none`, cwd=`init`, branch=`initials`, status=`counts`,
  ahead=`arrows`, pr=`badge`, bar=`percent`, tokens=`full`, cache=`hit`,
  cost=`plain`, duration=`clock`, lines=`diffstat`, rate=`none`. Reads as one
  dot-joined sentence of plain words and numbers.
- `rich` — DEFAULT_LAYOUT, style=`plain`. Every gauge and counter at its most
  instrumented: model=`pill`, effort=`plain`, state=`pills`, cwd=`icon`,
  branch=`icon`, status=`icons`, ahead=`arrows`, pr=`badge`, bar=`gauge`,
  tokens=`full`, cache=`fuse`, cost=`burn`, duration=`clock`,
  lines=`diffstat`, rate=`strip`. Boldness spent once, on the truecolor
  gauge; the rest is coherent density.
- `custom` — DEFAULT_LAYOUT, every item at its most-absent variant: `none`
  for the twelve items that offer it, model=`zen`, cwd=`base`, branch=`last`,
  style=`bare`. The bar starts near-empty; decisions add things.

Design notes: `style` rides in every theme bundle though it is not a layout
item — it is a COMPS item on the same flag surface. Catalog summaries are the
five plan phrases above (one job each). State and rate have no text-only
variant, so lean goes without them; cache's least-graphic variant is `hit`.
`branch` has a runtime-only `none` (env-selectable) that the TS alternatives
header omits — off the flag surface, so custom seeds `last`. Pill and block
caps are nerd-font rounded (U+F0B6/U+F0B4). An independent re-grep confirmed
every theme's pairs against the registry (u0 verifier).

Anchors (re-read in the launching sitting, expect drift): `configure.ts`
bare-printed gate, layout resolution, fallback ladder, flags overwrite,
assignments write; `cli.ts` ITEM_IDS mirror and the `--fallback` option;
`catalog.ts` item lines; `wizard.ts` seeding and draw; `index.ts` TTY gate;
`statusline.sh` color definitions and the `vlen` strip; `lib.sh`
`DEFAULT_LAYOUT`.
