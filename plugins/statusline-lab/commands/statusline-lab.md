---
description: Run the statusline-lab CLI — show the catalog, tour the variants, configure both surfaces; the terminal wizard is the only preview surface
---

Two jobs, one command: show and set. The agent runs the CLI and writes plain
text; the terminal wizard is the only preview surface. Never add a second
command. Never open anything — no browser, no HTML page, no `open`. Never
render previews into the chat: Bash-tool ANSI collapses to a ~3-line preview,
and the bar designs emit 24-bit color that can arrive as literal text.

**Show.** `catalog` prints one line per item — `item: alt | alt*`, `*` marks
the live variant, zero ANSI — so its output can go into the chat as-is. Run it
and show the owner the catalog as a plain table:

    npx -y @v1nvn/statusline-lab catalog

Boolean flags cut the listing: `catalog --model --bar`.

**Tour + set.** Ask which of the catalog's items the owner cares about and
walk them one at a time — the alternatives from the table, what each one
shows in plain words, one variant per item. Describe, never render. Then
configure with one variant flag per item — never hand-write the generated
scripts or the settings keys:

    npx -y @v1nvn/statusline-lab configure --model block --bar gauge --fallback=default

`configure` is strict: every item in the layout needs a variant flag, and a
missing one fails naming what is unresolved. `--fallback=default` fills the
unflagged layout items with the defaults; `--fallback=existing` keeps what
the current script already holds. Flags always win over the fallback. Check
first without writing:

    npx -y @v1nvn/statusline-lab configure --model block --bar gauge --fallback=default --dry-run

The layout — brace clusters of item ids, one cluster per rendered group — is
the only way to put an item on the surface; `style` sits outside the default
layout, so it takes a `--layout` that names it, and a variant for an item the
layout does not name is an error:

    npx -y @v1nvn/statusline-lab configure --layout '{model effort} {cwd branch} {bar tokens cache} {style}' --style dots --fallback=default

A foreign `statusLine` or `subagentStatusLine` key in `~/.claude/settings.json`
is refused, never silently overwritten; take it over only on the owner's word,
with `--force` added to the configuration flags:

    npx -y @v1nvn/statusline-lab configure --model block --bar gauge --fallback=default --force

On success both surfaces are live on the next paint: the two generated
scripts under `~/.claude/plugins/data/statusline-lab-agentic/` and the two
settings keys are written in one step. Without a TTY and without flags,
`configure` prints the effective config and writes nothing.

**Visual browsing.** Seeing designs rendered is the wizard's job — both
surfaces, live previews at 80/120/200 columns (`j/k` move, `h/l` variant,
`w` width, enter saves, `q` cancels). Previews prefer the captures the
runtime itself files (`captures/main.json`, `captures/tick.json` — real
session data), fixtures otherwise; no payload choosing anywhere. The wizard
offers exactly the layout's items — to browse one more, put it in the
layout first. It is the owner's to run, not the agent's; hand it off exactly
once with this line:

    ! npx -y @v1nvn/statusline-lab configure
