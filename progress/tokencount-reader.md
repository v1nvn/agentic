# Panel row — retire the transcript-derived used-context reader

## Goal

`packages/statusline/src/render/usage.ts`, the panel's `usage` input and its tests are deleted, and the row paints `tasks[].tokenCount` alone — done once Claude Code ships a tokenCount that matches its documented meaning: the running token count of the subagent, percentage-able against `contextWindowSize`.

## Current state

On 2.1.296 the engine's tokenCount is an output-flavored figure for background `local_agent` tasks — 19 to 406 observed against real contexts of 16k to 203k — while in-process teammates' tokenCount tracks real usage. The panel reads each task's own transcript (`<project>/<session>/subagents/agent-<id>.jsonl`, last `message.usage`: input + cache read + cache write) and falls back to tokenCount when no transcript is read.

## Next step

Watch each Claude Code changelog for a subagentStatusLine tokenCount entry; none through 2.1.296.

## Plan

Per release that touches it: spawn a probe subagent, compare the captured tick's tokenCount (`~/.claude/plugins/data/statusline-agentic/captures/tick.json`) against the probe transcript's last-usage sum. Agreeing within rounding → delete `usage.ts`, `PanelInput.usage`, the `extractFields` override parameter, the entry wiring and `test/subagent-usage.test.ts`, then redeploy the synced `render.mjs` to the plugin cache install.
