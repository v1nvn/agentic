#!/usr/bin/env node
// The repo version lives in .claude-plugin/marketplace.json and every package
// manifest, plugin manifest, and npx pin mirrors it (lockstep release train —
// release.yml publishes every package on it). One command bumps all of them;
// CI runs --check so a missed mirror or stale pin fails the build.
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = '.claude-plugin/marketplace.json';
const MIRRORS = [
  'packages/readability-mcp/package.json',
  'packages/omlx-mcp/package.json',
  'packages/core/package.json',
  'packages/zai/package.json',
  'packages/tokens/package.json',
  'packages/rm/package.json',
  'packages/md/package.json',
  'plugins/readability/.claude-plugin/plugin.json',
  'plugins/omlx/.claude-plugin/plugin.json',
  'plugins/rm/.claude-plugin/plugin.json',
  'plugins/md/.claude-plugin/plugin.json',
  'plugins/zai/.claude-plugin/plugin.json',
  'plugins/tokens/.claude-plugin/plugin.json',
];

// Plugin configs invoke the published bins via npx; every @v1nvn/<pkg>@<version>
// pin must ride the train with everything else.
const PINNED_CONFIGS = [
  'plugins/readability/.mcp.json',
  'plugins/omlx/.mcp.json',
  'plugins/rm/hooks/hooks.json',
  'plugins/md/hooks/hooks.json',
  'plugins/zai/hooks/hooks.json',
  'plugins/tokens/hooks/hooks.json',
];

// Replace the single "version" key without reflowing the rest of the file —
// these manifests are hand-formatted (literal em-dashes, one-line objects),
// and a JSON round-trip would churn every line.
const VERSION_KEY = /"version"\s*:\s*"[^"]*"/;
const PIN = /(@v1nvn\/[a-z0-9-]+)@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g;
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

function pinDrift(path, version) {
  const contents = readFileSync(path, 'utf8');
  const pins = contents.match(PIN) ?? [];
  if (pins.length === 0) {
    return `${path}: no @v1nvn/<pkg>@<version> pin found`;
  }
  const stale = pins.filter(pin => !pin.endsWith(`@${version}`));
  if (stale.length > 0) {
    return `${path}: pin ${stale[0]} != repo version ${version}`;
  }
  return null;
}

function rewritePins(path, version) {
  const updated = readFileSync(path, 'utf8').replace(PIN, `$1@${version}`);
  JSON.parse(updated); // the edit must leave valid JSON
  writeFileSync(path, updated);
}

const check = process.argv[2] === '--check';
if (check) {
  const repo = readVersion(SOURCE);
  const messages = MIRRORS.filter(path => readVersion(path) !== repo).map(
    path => `${path}: ${readVersion(path)} != repo version ${repo}`,
  );
  for (const path of PINNED_CONFIGS) {
    messages.push(pinDrift(path, repo));
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
for (const path of PINNED_CONFIGS) {
  rewritePins(path, version);
}
console.log(
  `${[SOURCE, ...MIRRORS].length} manifests and ${PINNED_CONFIGS.length} config pins now at ${version}`,
);
