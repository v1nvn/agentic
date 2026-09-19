# npm publishing — the release train

> Verified against live sessions 2026-09-01 → 2026-09-19 (bootstrap story in
> archive/monorepo-npx.md).

## The train

The version lives in `.claude-plugin/marketplace.json`; every package
manifest, plugin manifest, and npx pin mirrors it.
`node .github/scripts/set-version.mjs <version>` bumps all mirrors in one
command; CI runs `--check` and fails any missed mirror. On push to `main`,
`release.yml` publishes every package at the train version to npm (trusted
publishing, `--provenance`) and creates the GitHub release `v<version>`.

## Keyless publishing

Yarn ≥ 4.10 exchanges the Actions OIDC token itself (repo pins ≥ 4.17.1).
Auth order is npmAuthToken before OIDC — **no npm token may ever sit in
`.yarnrc.yml` or CI env on the publish path.** Trusted publishers are added
with npm ≥ 11.15.0:

```sh
npm trust github @v1nvn/<name> --file release.yml --repo v1nvn/agentic --allow-publish --yes
```

Exactly one trust config exists per package — a second create errors. Verify
with `npm trust list @v1nvn/<name>`; a typo'd or never-published name 404s
exactly like a missing entry.

## A never-published package name

npm has no pre-registration for new names — `npm trust` and the docs both
require the package to exist (npm/cli#8544). One-time manual pass, then every
later release is keyless:

1. Current checkout, `yarn install && yarn build`. Publish packs `dist/`, not
   git — the branch is irrelevant, a stale `dist/` is the risk.
2. Publish from a **real terminal** — in a non-TTY shell yarn prints the login
   URL and dies ("unexpected empty event loop"):
   `(cd packages/<name> && yarn npm publish)` — browser 2FA **per publish**.
   `--otp <code>` works for exactly one publish; reusing a code trips a 429
   OTP rate limit.
3. Add the trusted publisher (command above). The first call browser-2FAs —
   take the 5-minute skip it offers.
4. Re-run the release workflow.

A laptop publish carries no provenance, permanently — cosmetic, same as the
seven at bootstrap.

## Partial release failures

- The known keyless failure is Rekor/tlog `409 — equivalent entry already
  exists` while creating a provenance entry. Recover with
  `gh run rerun <id> --failed`.
- Reruns are per-package idempotent — versions already on npm are skipped and
  the remainder publishes. A version that landed before a failure keeps its
  state: provenance cannot be retro-fitted.
- The skip guard runs `npm view`. Right after a manual publish it can still
  404, and the rerun then dies on `403 — cannot publish over the previously
  published versions`. Harmless — nothing is overwritten; wait for
  `npm view <name>@<version>` to resolve, then rerun again.
- Any push to `main` while a package is unpublished or untrusted re-fails
  `release.yml`. Finish the bootstrap before pushing again.

## Registry lag

`npm view` can 404 a published version for minutes after publish (agentic-core
and md are recurring laggards). Re-query with `--prefer-online`, or curl
`registry.npmjs.org/<escaped-name>/<version>` directly, before concluding
failure; `npm view pkg@version --json` returns an array. Query by the name in
`package.json`, never the directory — `packages/core` publishes as
`@v1nvn/agentic-core`.
