# npm publishing — the release train

> Verified live: the 2026-09-01 bootstrap (archive/monorepo-npx.md) and the
> v0.19.0 release run.

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

## A never-published package name

npm has no pre-registration for new names — `npm trust` and the docs both
require the package to exist (npm/cli#8544). One-time manual pass, then every
later release is keyless:

1. `npm login` on a `main` checkout; `yarn install && yarn build`.
2. `(cd packages/<name> && yarn npm publish)` — browser 2FA **per publish**;
   npm rate-limits batched OTP checks, so a one-code loop dies mid-batch.
3. Add the trusted publisher (command above).
4. Re-run or re-push the release workflow.

## Partial release failures

Re-run the failed `release` run. Publishing is per-package idempotent — a
version already on npm is skipped, the unshipped remainder publishes, and the
GitHub release is created once.
