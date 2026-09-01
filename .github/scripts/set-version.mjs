#!/usr/bin/env node
// The repo version lives in .claude-plugin/marketplace.json and every package
// and plugin manifest mirrors it (lockstep release train — release.yml
// publishes every package on it). One command bumps all nine; CI runs --check
// so a missed mirror fails the build.
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = '.claude-plugin/marketplace.json';
const MIRRORS = [
  'readability-mcp/package.json',
  'omlx-mcp/package.json',
  'plugins/readability/.claude-plugin/plugin.json',
  'plugins/omlx/.claude-plugin/plugin.json',
  'plugins/rm/.claude-plugin/plugin.json',
  'plugins/md/.claude-plugin/plugin.json',
  'plugins/zai/.claude-plugin/plugin.json',
  'plugins/tokens/.claude-plugin/plugin.json',
];

// Replace the single "version" key without reflowing the rest of the file —
// these manifests are hand-formatted (literal em-dashes, one-line objects),
// and a JSON round-trip would churn every line.
const VERSION_KEY = /"version"\s*:\s*"[^"]*"/;
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

const check = process.argv[2] === '--check';
if (check) {
  const repo = readVersion(SOURCE);
  const drifted = MIRRORS.filter(path => readVersion(path) !== repo);
  if (drifted.length > 0) {
    fail(drifted.map(path => `${path}: ${readVersion(path)} != repo version ${repo}`));
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
console.log(`${[SOURCE, ...MIRRORS].length} manifests now at ${version}`);
