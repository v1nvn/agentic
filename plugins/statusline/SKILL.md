---
name: lab
description: Show, preview, and set the Claude Code status line and agent panel from a library of pickable designs — or revert to the previous setup
when_to_use: Use when the user wants to browse, change, check, or revert their status line or agent panel — e.g. "statusline", "agent panel", "make the status line show the git branch", or a bare /lab
---

Four jobs, one skill: set, show, revert, check. The agent runs every command
itself — the owner never types one. Plain renders (`--plain`, zero color
escapes, glyphs intact) go into the chat; colored renders never do — Bash-tool
ANSI collapses, and the designs emit 24-bit color that can arrive as literal
text. The live bar is the color-true preview. Never open anything — no
browser, no HTML page, no `open`.

**Set — offer the picker directly.** Do not ask the owner to name a theme
first. Sketch the four curated themes, then show the in-chat picker in the
same reply. One plain render per theme, run by the agent:

    npx -y @v1nvn/statusline@0.28.0 preview --theme quiet --plain
    npx -y @v1nvn/statusline@0.28.0 preview --theme lean --plain
    npx -y @v1nvn/statusline@0.28.0 preview --theme classic --plain
    npx -y @v1nvn/statusline@0.28.0 preview --theme rich --plain

Each render prints a header line, the bar, and the panel row; paste the bar
and panel row into that option's preview pane. Four options, single-select,
each description carrying its summary:

- `quiet` — model and directory, nothing else
- `lean` — text only, no graphics
- `classic` — the shipped defaults, named
- `rich` — every gauge and counter

Say in the reply that naming `custom` in the picker's Other free text starts
the bar bare, every item decided from scratch.

On the pick, write — cheap, reversible, backed up (the first takeover saves
the pre-lab key values; `restore` puts them back):

    npx -y @v1nvn/statusline@0.28.0 configure --theme lean

The write prints `configured — live on the next paint`; the live bar is the
look, so try-on replaces preview-before-write — another look is one write
away. A named tweak rides the same write, item flags overriding the theme:

    npx -y @v1nvn/statusline@0.28.0 configure --theme lean --bar gauge

A foreign `statusLine` or `subagentStatusLine` key in `~/.claude/settings.json`
is refused, never silently overwritten; take it over only on the owner's word,
with `--force` added.

**Set — custom, from bare.** Walk the items in words — one variant per item,
what each shows, describe, never render — then one write naming the picks:
`configure --theme custom --model zen --cwd tail …`. `catalog` output is
plain text and may go into the chat as reference; selection never routes
through a catalog table. The layout — brace clusters of item ids, one cluster
per rendered group — is the only way to put an item on the surface;
`--layout` overrides the theme's, and a layout item no flag or theme picks is
an error naming what is unresolved.

**Show.** `catalog` prints the themes block (`*` marks the live theme) then
one line per item — `item: alt | alt*`, `*` marking the live variant — zero
color escapes, chat-safe:

    npx -y @v1nvn/statusline@0.28.0 catalog

`catalog --themes` cuts to the themes block; boolean flags cut the listing:
`catalog --model --bar`.

**Revert.** `restore` puts both keys back to their pre-lab values — saved
text spliced back byte-exact, keys absent before the lab removed — then
deletes the lab data (`captures/`, `backup.json`). Plain text,
agent-runnable; a foreign key changed since the takeover is refused unless
`--force` rides along:

    npx -y @v1nvn/statusline@0.28.0 restore

Before the owner uninstalls the plugin, run `restore` first: a plain
uninstall deletes the data dir with the backup, and the keys keep globbing a
cache dir that dies only ~14 days later — a blank line, delayed.

**Check.** `status` prints one row per fact, then a verdict — plain text,
zero ANSI, agent-runnable:

    npx -y @v1nvn/statusline@0.28.0 status

A healthy install prints:

    runtime: 0.27.3 — 16 items
    statusLine: ours — layout='{model effort}' model=block effort=dim
    subagentStatusLine: ours
    config: no drift
    backup: present — saved statusLine, subagentStatusLine
    captures: main 2h ago, tick absent
    healthy

When the live key equals a theme exactly, a `theme: <name>` row sits right
after the config row; one swapped item drops it. Exit 0 on `healthy`, 1 on
`unhealthy` — branch on it: 0 ends the check; 1 means read the rows, each
naming a fix that runs exactly as printed: a foreign key takes
`rerun configure --force --theme classic`; an absent key or a drifted variant
takes `rerun configure --theme classic`; a missing runtime takes
`claude plugin install statusline@agentic`. Run it right after configuring,
and after a version bump — the config row names any item or variant the
resolved runtime no longer offers.
