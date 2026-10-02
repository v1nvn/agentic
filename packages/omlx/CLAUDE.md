# Comment hygiene

Comments explain *why*, not *what*. The default is no comment. Write one only when it clears the bar below — author to this standard so redundant commentary never gets added in the first place, not cleaned up later.

- Never write a comment that restates code the reader can already see: module-summary headers, numbered step walkthroughs, `x = null; // reset x`. If a name or type doesn't carry the intent, fix the name or type — don't paper over it with a comment.
- Never reference markdown or docs from a code comment — no `DESIGN §4`, `PLAN.md`, `§9`, `see README`, or phase/ID tags (`Phase A`, `QUAL-1`). Rationale must live in the comment itself or not at all; a pointer dangles the moment its doc changes.
- Add a comment only when its absence would mislead a future reader: a non-obvious invariant, a subtle cross-layer contract, or a "why" that prevents a bug. If you can't point to that, the comment doesn't get written.
- `eslint-disable` / `@ts-*` pragmas are functional, not commentary.

- Mark a task done only when `yarn typecheck && yarn lint:fix` (run from the repo root) is successful.
- Green tests aren't proof of behaviour — exercise a runtime change end-to-end through the connected `omlx-dev` MCP server (hot-reloaded via `yarn dev`, wired in `.mcp.json`), so your edits are already live to call.
- Always do things cleanly — no band-aids or hacks.

# Shape of this server

- Thin HTTP wrapper: curation, defaults, and routing descriptions. No inference logic, no prompt templating, no retry loops, no response post-processing beyond the documented empty-answer fallback. omlx owns semantics.
- The server talks only to `OMLX_URL` (default `http://127.0.0.1:6659`) — loopback, no outbound network beyond it. `/v1/*` and `/health` only; the admin API (`/api/*`, `/admin/*`) mutates server state and carries the auth secret and must never be called from here.
- All tools share one fetch client (`omlx.ts`); error mapping (connection refused → the `omlx serve` hint, non-2xx → server `detail`) lives there once, not per tool.

# MCP documentation

The server documents itself to clients on introspection — never ship a tool, schema field, or identity value that a client would see as blank.

- **Server identity.** `config.ts` exposes `title` and `description` (MCP `Implementation`) and `instructions` (`ServerOptions`), wired through `createMcpServer` in `server.ts`. All three populate `initialize`/`getServerVersion()`/`getInstructions()`.
- **Tool metadata.** Every `registerTool` call carries a human `title` plus a `description` — the routing description is the product; write it so the main agent delegates without being told.
- **Schema descriptions.** Every input zod field carries `.describe()` — including fields inside nested objects. No field a client introspects may be undocumented.
- **Idiom.** Use `.describe(...).default(...)` (describe before default). This survives the SDK's `zod/v4-mini` → JSON-schema conversion and lands in the wire schema.
- **README consistency.** Keep the README in sync with the schemas — tool count, field lists, and never a dangling doc reference to a file that doesn't exist.
