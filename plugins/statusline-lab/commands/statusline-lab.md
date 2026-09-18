---
description: Adopt the statusline-lab library on both surfaces, browse its designs, and change them
---

One command for the whole product. Do the part the owner asks for; each part
reports what it prints.

**Adopt.** `apply` writes the trampoline at `~/.claude/statusline-command.sh`
and adds the `statusLine` + `subagentStatusLine` keys to
`~/.claude/settings.json`. Both surfaces go live on the next paint with the
current picks. Idempotent and cancel-safe: a foreign script or key is refused,
never overwritten, unless `apply --force`. Run this exactly:

    npx -y @v1nvn/statusline-lab apply

**Browse.** Every design of every component rendered to one HTML page, plus
agent-panel rows at two widths. Renders come from shipped payloads and a demo
repo, so the page is identical on any machine; the suffix `live line uses
this` marks the shipped default. Run this exactly:

    PAGE="${TMPDIR:-/tmp}/statusline-gallery.html"
    npx -y @v1nvn/statusline-lab gallery --out "$PAGE" && open "$PAGE"

**Pick.** The owner names designs by their `component=alternative` labels
(e.g. "bar=gauge, model=pill"); write them to
`~/.claude/plugins/data/statusline-lab-agentic/picks` as `comp=alt` lines —
the next paint honors them, unknown values fall back to defaults. The
terminal wizard with live previews at 80/120/200 columns cannot run through
the Bash tool, so the owner runs it directly:

    ! npx -y @v1nvn/statusline-lab pick

**Capture.** Real session data for the picker preview: JSON the session can
see — a payload the owner pasted, or any stdin they provide — piped through
`capture` is normalized and filed under
`~/.claude/plugins/data/statusline-lab-agentic/` (a main payload at
`payloads/latest.json`, a subagent tick at `ticks/latest.json`); the latest
capture feeds the wizard preview. With the JSON in `$JSON`, run this exactly:

    JSON='…' ; printf '%s' "$JSON" | npx -y @v1nvn/statusline-lab capture

Invalid capture input prints one error line and writes nothing.
