# agentic

Eight Claude Code plugins, installed independently from one marketplace. The code lives
in eight npm packages (`@v1nvn/*`); each plugin directory is a thin manifest that runs
its package through version-pinned `npx` — except todo: manifest + skills, no package.

| Plugin          | What it does                                                                                                                           | Invoke                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **readability** | Read a URL to clean Markdown via the readability MCP server. The host shell fetches with `curl`; the server never touches the network. | paste a URL, or "read this"                           |
| **omlx**        | Delegate bulk work — commit messages, docstrings, summarization, extraction, image description — to a local omlx inference server.     | the agent routes on its own, or "ask the local model" |
| **rm**          | Beam the last reply to a reMarkable as EPUB.                                                                                           | `/rm:send`                                            |
| **md**          | Send the last reply to a Markdown-Viewer as a `#share=` URL — editable or read-only.                                                   | `/md:edit`, `/md:view`                                |
| **zai**         | Query GLM Coding Plan quota and usage.                                                                                                 | `/zai:usage`                                          |
| **tokens**      | Per-model token usage and cache hit rate from local transcripts.                                                                       | `/tokens:usage`                                       |
| **statusline**  | Browse the design catalog and configure the status line + agent panel.                                                                | `/lab`                                 |
| **todo**        | Work tracking — the rules plus six verbs over `TODO.md`, `progress/`, `references/`, `archive/`. Every repo carries data only.         | `/todo:run <plan>`, or a what's-next ask |

`rm`, `md`, `zai`, and `tokens` run zero-token: a `UserPromptExpansion` hook intercepts the command before it reaches the model.

## Prerequisites

- Claude Code
- Node.js — every plugin runs its package through `npx`
- A running [omlx](https://github.com/jundot/omlx) server on `127.0.0.1:6659`, for `omlx` (`omlx serve`)

## Install

Add the marketplace, then install any subset. Each plugin stands alone.

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install rm@agentic        # or: readability, omlx, md, zai, tokens, statusline, todo
```

Start Claude Code and run the command shown above for the plugin you installed.

## In a plain shell

The four tool CLIs run outside Claude Code too, same bins the hooks use:

```sh
npx -y @v1nvn/zai@0.27.0        # GLM Coding Plan usage report
npx -y @v1nvn/tokens@0.27.0     # token usage + cache hit rate from local transcripts
npx -y @v1nvn/rm@0.27.0         # last reply → reMarkable (or a file: npx -y @v1nvn/rm@0.27.0 reply.md)
npx -y @v1nvn/md@0.27.0         # last reply → Markdown-Viewer (--view for read-only; or a file: npx -y @v1nvn/md@0.27.0 reply.md)
```

`rm` needs `pandoc` plus `ssh`/`scp` access to the device (`REMARKABLE_HOST`, default
`remarkable`, device dir `REMARKABLE_DIR`, default `/home/root/books`); `md` honors
`MD_VIEWER_URL` (default `https://md.v1n.space`) and `MD_NO_OPEN=1` to skip opening
the browser.

## statusline

Four commands drive both surfaces — the wizard is the default way in:

```sh
npx -y @v1nvn/statusline@0.27.0 configure                                     # the wizard — bare, on a TTY
npx -y @v1nvn/statusline@0.27.0 configure --model block --bar gauge --fallback=default --dry-run   # known picks — preview first
npx -y @v1nvn/statusline@0.27.0 configure --model block --bar gauge --fallback=default             # then the write
npx -y @v1nvn/statusline@0.27.0 catalog                                       # one line per item, * marks the live variant
npx -y @v1nvn/statusline@0.27.0 restore                                       # both keys back to their pre-lab values
npx -y @v1nvn/statusline@0.27.0 status                                        # rows + verdict — exit 0 healthy, 1 needs action
```

`configure` touches exactly the `statusLine` and `subagentStatusLine` keys of
`~/.claude/settings.json` — the whole write footprint. Each value is one
inline shell command: a resolver that picks the newest cached runtime, then
the config as env assignments hugging `bash` (the subagent key carries none —
the panel has no variants). Raw:

```sh
d=$(printf '%s\n' ~/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1); STATUSLINE_LAB_LAYOUT='{model effort}' STATUSLINE_LAB_MODEL=block STATUSLINE_LAB_EFFORT=dim bash "${d}runtime/statusline.sh" 2>/dev/null || true
d=$(printf '%s\n' ~/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1); bash "${d}runtime/subagent.sh" 2>/dev/null || true
```

The layout — brace clusters of item ids — and one variant per item ride in
that value: `--layout '{model effort} {cwd branch} {bar tokens cache}'`. With
flags, `configure` is strict — every layout item needs a variant or a
`--fallback=default|existing`; a flags run previews first (`--dry-run`
renders both surfaces, writing nothing — the preview still refreshes
`captures/`) and writes only on confirmation; a foreign settings key is
refused unless `--force`. The first takeover saves the pre-lab key values to
`backup.json`; `restore` splices them back byte-exact — keys absent before
the lab are removed — then deletes the lab data. `status` checks the
install: runtime, both keys, config drift against the resolved runtime,
backup, captures — one row per fact plus a verdict, every action row naming
its fix. `/lab` inside a session runs the same commands.

Repo and machine:

```
repo
  packages/statusline/                the CLI — pure TS, zero bash
    src/  test/  dist/
    assets/payloads/  p1–p4.json          preview fixtures, main surface
    assets/ticks/     multi.json          preview fixtures, agent panel
  plugins/statusline/
    SKILL.md                              the /lab skill — model-taught entry point
    runtime/                              the bash runtime — statusline.sh, subagent.sh, lib.sh, components/*.sh

machine, after `claude plugin install statusline@agentic`
  ~/.claude/plugins/cache/agentic/statusline/<version>/runtime/   the installed runtime
  ~/.claude/plugins/data/statusline-agentic/
    backup.json                           pre-lab key values — first takeover wins
    captures/main.json  captures/tick.json  every paint's stdin, teed by the runtime; feeds previews
  ~/.claude/settings.json                 statusLine + subagentStatusLine → the inline commands
```

Install: `claude plugin marketplace add v1nvn/agentic`, then
`claude plugin install statusline@agentic`, then
`npx -y @v1nvn/statusline@0.27.0 configure` — the wizard previews both surfaces at
80/120/200 columns and saves.

Uninstall runs `npx -y @v1nvn/statusline@0.27.0 restore` first, then uninstalls
the plugin: a plain uninstall deletes the data dir with `backup.json`, and
keys left behind keep globbing a cache dir that dies only ~14 days later — a
blank line, delayed.

## Layout

```
.claude-plugin/marketplace.json     Claude marketplace manifest; sources point into plugins/
packages/                           the eight npm packages — one yarn workspace
  readability-mcp/  omlx-mcp/       the two MCP servers (@v1nvn/readability-mcp, @v1nvn/omlx-mcp)
  core/                             @v1nvn/agentic-core — last-reply + text formatting, shared by the tools
  zai/  tokens/  rm/  md/           the tool CLIs (zai-usage, tokens-report, rm-send, md-send)
  statusline/                    the catalog + configure CLI — pure TS (@v1nvn/statusline)
plugins/                            the eight plugins — manifests, skills, config wrappers; code only in statusline's runtime payload
  readability/  omlx/               .mcp.json (pinned npx) + plugin.json
  zai/  tokens/  rm/  md/           hooks.json (pinned npx) + plugin.json + commands/
  statusline/                   root SKILL.md + the bash runtime (see statusline above)
  todo/                         plugin.json + skills/ — the rules and six verbs, no package
```

Versions ride one lockstep train: `.claude-plugin/marketplace.json` is the source, and
`set-version.mjs` mirrors it into every package, plugin manifest, and npx pin.
