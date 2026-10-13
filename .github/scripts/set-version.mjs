#!/usr/bin/env node
// The repo version lives in .claude-plugin/marketplace.json; every package
// manifest, plugin manifest, core dependency pin, lockfile, and npx pin
// mirrors it (release.yml publishes every package on the one train). CI runs
// --check so a missed mirror, stale pin, name fragment, or unpinned registry
// invocation fails the build.
import { spawnSync } from 'node:child_process';
import { cpSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = '.claude-plugin/marketplace.json';

// Discovery by glob, sorted for deterministic output — a manifest or config
// joining the tree rides the train with zero script edits; a pattern that
// matches nothing is not an error.
function discover(patterns) {
  return patterns.flatMap(pattern => globSync(pattern)).sort();
}

const MIRRORS = discover([
  'packages/*/package.json',
  'packages/*/.claude-plugin/plugin.json',
]);

// Plugin configs invoke the published bins via npx; every @v1nvn/<pkg>@<version>
// pin must ride the train with everything else. A hosted HTTP config invokes
// nothing from npm and carries no pin.
const PINNED_CONFIGS = discover([
  'packages/*/.mcp.json',
  'packages/*/hooks/hooks.json',
]);

// Skill bodies and READMEs teach
// `npx -y @v1nvn/<pkg>` invocations. An unpinned one resolves "latest"
// through the npx cache and can run a stale CLI against a fresh plugin —
// every registry invocation in an .md surface rides the train too, and a pin
// must name a package that actually exists (a corrupted fragment like
// `token@0.25.0s` parses as a valid pin and hides forever without the
// name check).
const MD_SURFACES = [
  'README.md',
  'packages/statusline/SKILL.md',
  'packages/zai/README.md',
  'packages/tokens/README.md',
  'packages/rm/README.md',
  'packages/md/README.md',
  'packages/omlx/README.md',
  'packages/readability/README.md',
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
  const count =
    contents.match(new RegExp(VERSION_KEY.source, 'g'))?.length ?? 0;
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
      resolvesThroughRegistry(contents, offset)
        ? `${mention}@${version}`
        : mention,
    );
  if (path.endsWith('.json')) {
    JSON.parse(updated); // the edit must leave valid JSON
  }
  writeFileSync(path, updated);
}

// A home's manifest pins core's exact registry version in `dependencies` —
// the pin Claude Code's frozen install resolves. The `"version"` key rewrite
// above must not touch it, so this carries it on the same train.
function rewriteDependencyPins(path, version) {
  const contents = readFileSync(path, 'utf8');
  const updated = contents.replace(
    /("@v1nvn\/[a-z0-9-]+")(\s*:\s*")\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(")/g,
    `$1$2${version}$3`,
  );
  if (updated !== contents) {
    JSON.parse(updated); // the edit must leave valid JSON
    writeFileSync(path, updated);
  }
}

function apply(version) {
  for (const path of [SOURCE, ...MIRRORS]) {
    writeVersion(path, version);
  }
  for (const path of MIRRORS) {
    rewriteDependencyPins(path, version);
  }
  for (const path of [...PINNED_CONFIGS, ...MD_SURFACES]) {
    rewritePins(path, version);
  }
  regenLocks();
  console.log(
    `${[SOURCE, ...MIRRORS].length} manifests, ${PINNED_CONFIGS.length} config pins, ${MD_SURFACES.length} md npx surfaces, ${LOCKS.length} lockfiles now at ${version}`,
  );
}

// Each exec'd home's package-lock.json is what Claude Code's plugin install
// reads — registry packages only, pinned exact. Only a registry round-trip
// knows the new version's integrity hash, so the locks regenerate rather
// than rewrite.
const LOCKS = discover(['packages/*/package-lock.json']);

function regenLocks() {
  for (const lock of LOCKS) {
    const home = lock.replace('/package-lock.json', '');
    const manifest = JSON.parse(readFileSync(join(home, 'package.json'), 'utf8'));
    const scratch = mkdtempSync(join(tmpdir(), 'agentic-lock-'));
    try {
      writeFileSync(
        join(scratch, 'package.json'),
        JSON.stringify({
          name: manifest.name,
          version: manifest.version,
          private: true,
          dependencies: manifest.dependencies,
        }),
      );
      const run = spawnSync(
        'npm',
        [
          'install',
          '--package-lock-only',
          '--omit=dev',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
        ],
        { cwd: scratch, encoding: 'utf8' },
      );
      if (run.status !== 0) {
        fail([`${lock}: npm lock generation failed:\n${run.stderr}`]);
      }
      cpSync(join(scratch, 'package-lock.json'), lock);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}

function lockDrift(path, version) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const core = parsed.packages?.['node_modules/@v1nvn/agentic-core'];
  if (core?.version !== version) {
    return `${path}: core pinned at ${core?.version ?? 'nothing'} != repo version ${version}`;
  }
  return null;
}

// Claude Code installs a cached plugin's deps with a frozen npm ci and skips
// the install outright when the manifest and lock disagree — so a lock home's
// manifest ships runtime dependencies only (workspace toolchain lives at the
// root) and its lock must describe exactly that manifest.
function lockManifestDrift(lock) {
  const home = lock.replace('/package-lock.json', '');
  const manifest = JSON.parse(readFileSync(join(home, 'package.json'), 'utf8'));
  if (manifest.devDependencies !== undefined) {
    return `${home}/package.json: devDependencies on a lock home make the plugin-cache install skip — declare toolchain at the workspace root`;
  }
  const root = JSON.parse(readFileSync(lock, 'utf8')).packages?.[''];
  const declared = manifest.dependencies ?? {};
  const locked = root?.dependencies ?? {};
  const same =
    Object.keys(declared).length === Object.keys(locked).length &&
    Object.entries(declared).every(([name, range]) => locked[name] === range);
  if (!same) {
    return `${lock}: root dependencies ${JSON.stringify(locked)} != ${home}/package.json ${JSON.stringify(declared)}`;
  }
  return null;
}

// Pins invoke npm packages, so the valid names are the scoped ones — plugin
// manifests carry bare short names that must not leak into the comparison.
const KNOWN = new Set(
  MIRRORS.map(path => JSON.parse(readFileSync(path, 'utf8')).name).filter(
    name => name.startsWith('@v1nvn/'),
  ),
);

const [command, argument] = process.argv.slice(2);
if (command === '--check') {
  const repo = readVersion(SOURCE);
  const messages = MIRRORS.filter(path => readVersion(path) !== repo).map(
    path => `${path}: ${readVersion(path)} != repo version ${repo}`,
  );
  for (const path of PINNED_CONFIGS) {
    const invokesNpm = /\b(?:npx|npm|yarn)\b/.test(readFileSync(path, 'utf8'));
    messages.push(pinDrift(path, repo, KNOWN, invokesNpm));
  }
  for (const path of MD_SURFACES) {
    messages.push(pinDrift(path, repo, KNOWN, false));
  }
  for (const path of MIRRORS) {
    const contents = readFileSync(path, 'utf8');
    for (const pin of contents.matchAll(
      /"@v1nvn\/[a-z0-9-]+"\s*:\s*"(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)"/g,
    )) {
      if (pin[1] !== repo) {
        messages.push(
          `${path}: core dependency pin ${pin[1]} != repo version ${repo}`,
        );
      }
    }
  }
  for (const path of LOCKS) {
    messages.push(lockDrift(path, repo), lockManifestDrift(path));
  }
  const errors = messages.filter(Boolean);
  if (errors.length > 0) {
    fail(errors);
  }
  console.log(`all versions consistent at ${repo}`);
  process.exit(0);
}

if (command === '--bump') {
  const steps = ['major', 'minor', 'patch'];
  const index = steps.indexOf(argument);
  if (index === -1) {
    fail([
      `usage: set-version.mjs --bump <${steps.join('|')}> — got "${argument ?? ''}"`,
    ]);
  }
  const current = readVersion(SOURCE);
  const triple = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!triple) {
    fail([`${SOURCE}: ${current} is not a plain X.Y.Z version`]);
  }
  const parts = triple.slice(1).map(Number);
  parts[index] += 1;
  apply(parts.map((part, i) => (i > index ? 0 : part)).join('.'));
} else if (SEMVER.test(command ?? '')) {
  apply(command);
} else {
  fail([
    `usage: set-version.mjs --check | set-version.mjs --bump <major|minor|patch> | set-version.mjs <semver> — got "${command ?? ''}"`,
  ]);
}
