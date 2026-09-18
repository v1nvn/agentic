---
description: Orchestrate the statusline-lab CLI — adopt the runtime, capture a payload, tour the design catalog, write the owner's picks; the terminal wizard is the only preview surface
---

Four jobs, one command: adopt, capture, catalog, tour. The agent runs the CLI
and writes plain text; the terminal wizard is the only preview surface. Never
add a second command. Never open anything — no browser, no HTML page, no
`open`. Never render previews into the chat: Bash-tool ANSI collapses to a
~3-line preview, and the bar designs emit 24-bit color that can arrive as
literal text.

**Adopt.** `apply` writes the trampoline at `~/.claude/statusline-command.sh`
and adds the `statusLine` + `subagentStatusLine` keys to
`~/.claude/settings.json`; both surfaces go live on the next paint with the
current picks. Idempotent and cancel-safe: a foreign trampoline or settings
key is refused, never overwritten. Run this exactly:

    npx -y @v1nvn/statusline-lab apply

A refusal names the foreign target; take it over only on the owner's word,
with `--force`:

    npx -y @v1nvn/statusline-lab apply --force

**Capture.** Real session data for the wizard preview: JSON the session can
see — a payload the owner pasted, or any stdin they provide — piped through
`capture` is normalized and filed under
`~/.claude/plugins/data/statusline-lab-agentic/` (a main payload at
`payloads/latest.json`, a subagent tick at `ticks/latest.json`); the latest
capture feeds the wizard preview. Invalid input prints one error line and
writes nothing. With the JSON pasted in place of the dots, run this exactly:

    JSON='…' ; printf '%s' "$JSON" | npx -y @v1nvn/statusline-lab capture

**Catalog + guided tour.** `designs` prints one line per component —
`component: alt | alt*`, `*` marks the live pick, zero ANSI — so its output
can go into the chat as-is. Run it and show the owner the catalog as a plain
table:

    npx -y @v1nvn/statusline-lab designs

Then tour: ask which components the owner cares about and walk them one at a
time — the alternatives from the table, what each one shows in plain words,
one pick per component. Describe, never render. At the end write the picks
the owner named to `~/.claude/plugins/data/statusline-lab-agentic/picks` as
`comp=alt` lines (create the directory if needed; keep lines already there
for components the owner did not name). The next paint honors them; unknown
values fall back to defaults.

**Visual browsing.** Seeing designs rendered is the wizard's job — both
surfaces, live previews at 80/120/200 columns. It is the owner's to run, not
the agent's; hand it off exactly once with this line:

    ! npx -y @v1nvn/statusline-lab pick

The wizard reads piped stdin and ships j/k/h/l as arrow-key aliases, so the
line runs even without a raw TTY. It saves picks itself on finish.
