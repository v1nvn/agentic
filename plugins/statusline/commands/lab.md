---
description: Render every statusline design into an HTML gallery and open it
---

Show the whole library: every alternative of every component rendered on its
own across the shipped payloads, plus whole agent-panel rows at two widths.
The suffix `live line uses this` marks the shipped default.

Run this exactly:

    PAGE="${TMPDIR:-/tmp}/statusline-gallery.html"
    npx -y @v1nvn/statusline-lab gallery --out "$PAGE" && open "$PAGE"

Report the output it prints. Renders come from the shipped payloads and demo
repo, so the page is identical on any machine — point at designs by their
`component=alternative` labels and offer the conversational pick from
/statusline:compose.
