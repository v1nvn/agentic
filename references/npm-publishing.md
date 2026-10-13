# npm publishing — the release train

## The train

The version lives in `.claude-plugin/marketplace.json`; every package
manifest, plugin manifest, and npx pin — config files and `.md` surfaces —
mirrors it.
`node .github/scripts/set-version.mjs <version>` bumps all mirrors in one
command; CI runs `--check` and fails any missed mirror.

Cut a release by dispatching the workflow with a bump step:

```sh
gh workflow run release.yml -f bump=<patch|minor|major>
```

The `prepare` job bumps the mirrors (`--no-locks`), publishes core at the new
version, waits for the registry to serve it, regenerates the lockfiles against
it, pushes
`chore(release): vX.Y.Z`, and the release job publishes the remaining packages
at that sha to npm (trusted publishing, `--provenance`) and creates the GitHub
release `v<version>`. Core publishes first because the per-home lockfiles pin
the
train's own version with its registry integrity hash — they cannot resolve
before it exists. A dispatch with
`bump=none`, like any plain push to `main`, skips `prepare` and publishes the
current version. `node .github/scripts/set-version.mjs <version>` remains for
local cuts.

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
bootstrap publishes.

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

## Registry visibility

The registry serves package metadata with `cache-control: max-age=300`, and
npm honors that in its local cache — any fetch made before a publish keeps
answering with the pre-publish state for five minutes after it, however
healthy the registry is. The old "registry lag" notes were this client cache,
not server propagation.

- Query past it with `--prefer-online` (`npm view`, `npm install`), or curl
  `registry.npmjs.org/<escaped-name>/<version>` — the per-version URL is a
  cache key nothing fetched before the publish, so it answers current state.
- The train depends on both: `prepare` polls the per-version URL until the
  just-published core answers, then regenerates the lockfiles — the per-home
  npm locks with `--prefer-online`, the root `yarn.lock` against the
  workspace (the exact pins change its core descriptors every bump, and no
  publish is needed to refresh it). A blind retry shorter than the 300s
  window cannot succeed.
- `npm view pkg@version --json` returns an array. Query by the name in
  `package.json`, never the directory — `packages/core` publishes as
  `@v1nvn/agentic-core`.
