---
name: lab
description: Show, preview, and set the Claude Code status line and agent panel from a library of pickable designs — or revert to the previous setup
when_to_use: Use when the user wants to browse, change, check, or revert their status line or agent panel — e.g. "statusline", "agent panel", "make the status line show the git branch", or a bare /lab
---

Four jobs, one skill: show, set, revert, check. The agent runs the CLI and
writes plain text; the terminal is the only preview surface. Never open
anything — no browser, no HTML page, no `open`.
Never render previews into the chat: Bash-tool ANSI collapses to a ~3-line
preview, and the bar designs emit 24-bit color that can arrive as literal
text.

**Show.** `catalog` prints one line per item — `item: alt | alt*`, `*` marks
the live variant, zero ANSI — so its output can go into the chat as-is. Run
it and show the owner the catalog as a plain table:

    npx -y @v1nvn/statusline@0.26.0 catalog

Boolean flags cut the listing: `catalog --model --bar`.

**Set — the wizard, the default.** Seeing designs rendered is the wizard's
job — both surfaces, live previews at 80/120/200 columns (`j/k` move, `h/l`
variant, `s` sets the focused item to none, `w` width, enter saves, `q`
cancels). It is the owner's to run, not
the agent's; hand it off exactly once with this line:

    ! npx -y @v1nvn/statusline@0.26.0 configure

Previews prefer the captures the runtime itself files
(`captures/main.json`, `captures/tick.json` — real session data), fixtures
otherwise; no payload choosing anywhere. The wizard offers exactly the
layout's items — on a fresh install that is every item but `style`, which
sits outside the default layout and needs the flags path.

**Set — flags, when the owner names the picks.** Walk the catalog's items in
words — the alternatives from the table, what each one shows in plain words,
one variant per item; describe, never render. Then configure with one
variant flag per item — never hand-write the settings keys; `configure`
composes them whole, config included — and always preview before the write.
First the flags line with `--dry-run`, handed off so the true render lands
in the owner's terminal, nothing written:

    ! npx -y @v1nvn/statusline@0.26.0 configure --model block --bar gauge --fallback=default --dry-run

On the owner's yes, the agent runs the same line without `--dry-run` — the
write prints `configured — live on the next paint`, plain text:

    npx -y @v1nvn/statusline@0.26.0 configure --model block --bar gauge --fallback=default

`configure` is strict: every item in the layout needs a variant flag, and a
missing one fails naming what is unresolved. `--fallback=default` fills the
unflagged layout items with the defaults; `--fallback=existing` keeps what
the current key already holds. Flags always win over the fallback.

The layout — brace clusters of item ids, one cluster per rendered group — is
the only way to put an item on the surface; `style` sits outside the default
layout, so it takes a `--layout` that names it, and a variant for an item the
layout does not name is an error:

    npx -y @v1nvn/statusline@0.26.0 configure --layout '{model effort} {cwd branch} {bar tokens cache} {style}' --style dots --fallback=default

A foreign `statusLine` or `subagentStatusLine` key in `~/.claude/settings.json`
is refused, never silently overwritten; take it over only on the owner's word,
with `--force` added to the configuration flags:

    npx -y @v1nvn/statusline@0.26.0 configure --model block --bar gauge --fallback=default --force

On success both surfaces are live on the next paint: `configure` writes
exactly the two settings keys, config riding in the main key's value as env
assignments, and on the first takeover saves the pre-lab key values to
`backup.json` under `~/.claude/plugins/data/statusline-agentic/`.
Without a TTY and without flags, `configure` prints the effective config and
writes nothing. The agent never runs a preview itself — the wizard and the
`--dry-run` render both belong to the owner's terminal.

**Revert.** `restore` puts both keys back to their pre-lab values — saved
text spliced back byte-exact, keys absent before the lab removed — then
deletes the lab data (`captures/`, `backup.json`). Plain text,
agent-runnable; a foreign key changed since the takeover is refused unless
`--force` rides along:

    npx -y @v1nvn/statusline@0.26.0 restore

Before the owner uninstalls the plugin, run `restore` first: a plain
uninstall deletes the data dir with the backup, and the keys keep globbing a
cache dir that dies only ~14 days later — a blank line, delayed.

**Check.** `status` prints one row per fact, then a verdict — plain text,
zero ANSI, agent-runnable:

    npx -y @v1nvn/statusline@0.26.0 status

A healthy install prints:

    runtime: 0.21.0 — 16 items
    statusLine: ours — layout='{model effort}' model=block effort=dim
    subagentStatusLine: ours
    config: no drift
    backup: present — saved statusLine, subagentStatusLine
    captures: main 2h ago, tick absent
    healthy

Exit 0 on `healthy`, 1 on `unhealthy` — branch on it: 0 ends the check; 1
means read the rows, each naming a fix that runs exactly as printed: a
foreign key takes `rerun configure --force --fallback=default`; an absent
key or a drifted variant takes `rerun configure --fallback=default`; a drift
naming an unknown item adds `--layout '<default layout>'` to that; a missing
runtime takes `claude plugin install statusline@agentic`. Run it right
after configuring, and after a version bump — the config row names any item
or variant the resolved runtime no longer offers.
