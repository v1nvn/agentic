#!/bin/sh
# UserPromptExpansion hook for /zai:usage. Runs the usage
# query script directly, then BLOCKS the command from reaching the model →
# zero tokens. The script output is returned as the block `reason`.
#
# Claude Code exports CLAUDE_PLUGIN_ROOT to hook processes, so we can locate bin/.
set -u

bin="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/bin"
msg="$(node "$bin/usage.mjs" 2>&1)" || msg="query failed: $msg"

# Pure JSON on stdout; block so the model never processes the command.
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$msg" | jq -Rs .)"
