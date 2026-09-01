# omlx-mcp

MCP server that delegates work to a local [omlx](https://github.com/jundot/omlx)
inference server — one-shot prompts, schema-constrained extraction, and model
status. Free, private, unlimited; no quota, nothing leaves the machine.

```sh
npx omlx-mcp            # stdio MCP server, talks to 127.0.0.1:6659
omlx serve              # the inference server, if it is not already up
```

Install as a Claude Code plugin: `claude plugin install omlx@agentic`.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `ask` | `prompt` (required), `system`, `images` (local file paths), `model`, `max_tokens` (2048), `reasoning_effort` (`low`), `temperature` | The model's answer. If reasoning consumed the whole budget, the last 2000 chars of `reasoning_content` with `reasoning_fallback: true`. |
| `ask_structured` | same as `ask` plus `schema` (JSON Schema, required), `schema_name` (`response`) | Parsed JSON matching the schema — sent as `response_format: {type: "json_schema"}`. |
| `models` | — | Installed models: loaded state, engine type, context window, output cap, size on disk. |

Every field is documented on the wire; `reasoning_effort` accepts
`low` / `medium` / `xhigh` — the values the model's chat template validates
(`xhigh` is the template default, `low` is the fast path for delegated work).

## Config

| Env | Default | Purpose |
|---|---|---|
| `OMLX_URL` | `http://127.0.0.1:6659` | server base URL |
| `OMLX_MODEL` | `Qwen3.8-27B-oQ4e-mtp` | default model for `ask` / `ask_structured` |
| `OMLX_TIMEOUT_MS` | `600000` | the first call after idle may load a ~17GB model for 30-60s |

## Boundaries

- Loopback only: requests go to `OMLX_URL` and nowhere else.
- `/v1/*` and `/health` only — the admin API (`/api/*`, `/admin/*`) mutates
  server state and carries the auth secret.
- Thin pass-through: no prompt templating, no retries, no response
  post-processing beyond the empty-answer fallback. Errors carry the remedy —
  server down reads `omlx unreachable at <url> — start it with: omlx serve`.
- No `load`/`unload`: the server LRU-manages its model pool; an agent evicting
  a model mid-batch is a footgun.

## Development

```sh
yarn install
yarn test               # unit tests, fetch mocked
yarn test:live          # end-to-end against the real server (RUN_LIVE=1)
yarn dev                # hot-reloading MCP server, wired as omlx-dev
yarn typecheck && yarn lint:fix
```
