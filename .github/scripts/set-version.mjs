#!/usr/bin/env node
// The repo version lives in .claude-plugin/marketplace.json; every package
// manifest, plugin manifest, and npx pin mirrors it (release.yml publishes
// every package on the one train). CI runs --check so a missed mirror, stale
// pin, name fragment, or unpinned registry invocation fails the build.
import { globSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = '.claude-plugin/marketplace.json';

// Discovery by glob, sorted for deterministic output — a manifest or config
// joining the tree rides the train with zero script edits; a pattern that
// matches nothing is not an error.
function discover(patterns) {
  return patterns.flatMap(pattern => globSync(pattern)).sort();
}

const MIRRORS = discover([
  'packages/*/package.json',
  'plugins/*/.claude-plugin/plugin.json',
]);

// Plugin configs invoke the published bins via npx; every @v1nvn/<pkg>@<version>
// pin must ride the train with everything else.
const PINNED_CONFIGS = discover([
  'plugins/*/.mcp.json',
  'plugins/*/hooks/hooks.json',
]);

// Skill bodies, hook-fallback command shells, and READMEs teach
// `npx -y @v1nvn/<pkg>` invocations. An unpinned one resolves "latest"
// through the npx cache and can run a stale CLI against a fresh plugin —
// every registry invocation in an .md surface rides the train too, and a pin
// must name a package that actually exists (a corrupted fragment like
// `token@0.25.0s` parses as a valid pin and hides forever without the
// name check).
const MD_SURFACES = [
  'README.md',
  'plugins/statusline/SKILL.md',
  'plugins/rm/commands/send.md',
  'plugins/md/commands/edit.md',
  'plugins/md/commands/view.md',
  'plugins/zai/commands/usage.md',
  'plugins/tokens/commands/usage.md',
  'packages/zai/README.md',
  'packages/tokens/README.md',
  'packages/rm/README.md',
  'packages/md/README.md',
  'packages/omlx-mcp/README.md',
  'packages/readability-mcp/README.md',
  'packages/statusline/README.md',
];

// Replace the single "version" key without reflowing the rest of the file —
// these manifests are hand-formatted (literal em-dashes, one-line objects),
// and a JSON round-trip would churn every line.
const VERSION_KEY = /"version"\s*:\s*"[^"]*"/;
const PIN = /(@v1nvn\/[a-z0-9-]+)@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g;
// Any @v1nvn/<name> mention not already versioned. The lookahead must exclude
// name characters too — a plain (?!@) lets the engine backtrack into the name
// (@zai@1.0.0 would match as "za"), and it must skip registry paths and the
// @v1nvn/* glob (which `*` fails to match anyway).
const UNPINNED_MENTION = /@v1nvn\/[a-z0-9-]+(?![a-z0-9-@/])/g;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function fail(messages) {
  for (const message of messages) {
    // GitHub renders the annotation form; a plain line reads better locally.
    console.error(process.env.CI ? `::error::${message}` : `error: ${message}`);
  }
  process.exit(1);
}

function readVersion(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed.version !== 'string') {
    fail([`${path} carries no version`]);
  }
  return parsed.version;
}

function writeVersion(path, version) {
  const contents = readFileSync(path, 'utf8');
  const count = contents.match(new RegExp(VERSION_KEY.source, 'g'))?.length ?? 0;
  if (count !== 1) {
    fail([`${path} must carry exactly one "version" key, found ${count}`]);
  }
  const updated = contents.replace(VERSION_KEY, `"version": "${version}"`);
  JSON.parse(updated); // the edit must leave valid JSON
  writeFileSync(path, updated);
}

// A mention must carry a version exactly when a machine resolves it through
// the npm registry: quoted (a JSON config example's args array) or preceded
// on its line by a registry runner. `yarn workspace` names, headings, and
// prose stay bare — versions break workspace resolution.
function resolvesThroughRegistry(contents, index) {
  if (contents[index - 1] === '"') {
    return true;
  }
  const prefix = contents.slice(contents.lastIndexOf('\n', index) + 1, index);
  return /\b(?:npx|npm\s+(?:i|install)|yarn\s+(?:add|dlx))\b/.test(prefix);
}

function pinDrift(path, version, known, requirePin) {
  const contents = readFileSync(path, 'utf8');
  const pins = contents.match(PIN) ?? [];
  if (requirePin && pins.length === 0) {
    return `${path}: no @v1nvn/<pkg>@<version> pin found`;
  }
  for (const pin of pins) {
    const name = pin.slice('@v1nvn/'.length, pin.lastIndexOf('@'));
    if (!known.has(`@v1nvn/${name}`)) {
      return `${path}: "@v1nvn/${name}" is not a package in this repo`;
    }
    if (!pin.endsWith(`@${version}`)) {
      return `${path}: pin ${pin} != repo version ${version}`;
    }
  }
  for (const mention of contents.matchAll(UNPINNED_MENTION)) {
    if (resolvesThroughRegistry(contents, mention.index)) {
      return `${path}: "@v1nvn/${mention[0].slice('@v1nvn/'.length)}" resolves through npm unpinned`;
    }
  }
  return null;
}

function rewritePins(path, version) {
  const updated = readFileSync(path, 'utf8')
    .replace(PIN, `$1@${version}`)
    .replace(UNPINNED_MENTION, (mention, offset, contents) =>
      resolvesThroughRegistry(contents, offset) ? `${mention}@${version}` : mention,
    );
  if (path.endsWith('.json')) {
    JSON.parse(updated); // the edit must leave valid JSON
  }
  writeFileSync(path, updated);
}

// Pins invoke npm packages, so the valid names are the scoped ones — plugin
// manifests carry bare short names that must not leak into the comparison.
const KNOWN = new Set(
  MIRRORS.map(path => JSON.parse(readFileSync(path, 'utf8')).name)
    .filter(name => name.startsWith('@v1nvn/')),
);

const check = process.argv[2] === '--check';
if (check) {
  const repo = readVersion(SOURCE);
  const messages = MIRRORS.filter(path => readVersion(path) !== repo).map(
    path => `${path}: ${readVersion(path)} != repo version ${repo}`,
  );
  for (const path of PINNED_CONFIGS) {
    messages.push(pinDrift(path, repo, KNOWN, true));
  }
  for (const path of MD_SURFACES) {
    messages.push(pinDrift(path, repo, KNOWN, false));
  }
  const errors = messages.filter(Boolean);
  if (errors.length > 0) {
    fail(errors);
  }
  console.log(`all versions consistent at ${repo}`);
  process.exit(0);
}

const version = process.argv[2];
if (!SEMVER.test(version ?? '')) {
  fail([`usage: set-version.mjs --check | set-version.mjs <semver> — got "${version ?? ''}"`]);
}
for (const path of [SOURCE, ...MIRRORS]) {
  writeVersion(path, version);
}
for (const path of [...PINNED_CONFIGS, ...MD_SURFACES]) {
  rewritePins(path, version);
}
console.log(
  `${[SOURCE, ...MIRRORS].length} manifests, ${PINNED_CONFIGS.length} config pins, ${MD_SURFACES.length} md npx surfaces now at ${version}`,
);
