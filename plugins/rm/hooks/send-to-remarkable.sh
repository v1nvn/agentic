#!/bin/sh
# UserPromptExpansion hook for /rm:send. Beams the previous assistant reply to
# the device locally, then BLOCKS the command from reaching the model → zero tokens.
# The "Sent:" line is returned as the block `reason`.
#
# Resolution (all read from the event JSON on stdin):
#   1) transcript_path → exact file (authoritative)
#   2) session_id      → last-reply resolves projects/<cwd-dashed>/<session_id>.jsonl
#   3) neither         → heuristic: newest session for the current project
#
# Claude Code exports CLAUDE_PLUGIN_ROOT to hook processes, so we can locate bin/.
set -u

input="$(cat)"
tp="$(printf '%s' "$input" | jq -r '.transcript_path // empty')"
sid="$(printf '%s' "$input" | jq -r '.session_id // empty')"

# Pass transcript_path (if it's a real file) or session_id to last-reply. Pass
# nothing when neither is usable so last-reply falls back to the heuristic —
# passing an empty "" arg would break last-reply's $# check.
set --
[ -n "$tp" ] && [ -f "$tp" ] && set -- "$tp"
[ $# -eq 0 ] && [ -n "$sid" ] && set -- "$sid"

bin="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/bin"
msg="$("$bin/last-reply" "$@" | "$bin/send-to-remarkable" - 2>&1)" \
    || msg="send failed: $msg"

# Pure JSON on stdout; block so the model never processes the command.
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$msg" | jq -Rs .)"
