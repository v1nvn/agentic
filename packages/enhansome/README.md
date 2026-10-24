# enhansome

The home of the enhansome plugin — and its plugin root: a thin `.mcp.json`
pointing the `enhansome` server at the hosted registry
(`https://enhansome.xyz/mcp`). No package, no CLI — the hosted server does the
work; the plugin only wires Claude Code to it.

User-facing docs: [root README](../../README.md).

## Quickstart

In Claude Code:

```sh
claude plugin marketplace add v1nvn/agentic
claude plugin install enhansome@agentic
```

The agent routes on its own, or on an ask like "search the registry" —
`search` finds curated registries and the repos they carry, `pick` narrows a
result set to the best matches, `get_details` pulls one item's full record.

## Usage

Ask in plain words: "search the registry forest for a CLI that converts
EPUB", then "pick the top three". Zero config — the server hosts the data,
nothing runs locally.
