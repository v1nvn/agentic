#!/usr/bin/env node
// The registry-face compiler. Node refuses to type-strip .ts under
// node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), so a package
// whose published entries are .ts cannot run from any real npm install —
// only from the workspace, where @v1nvn/* resolve as symlinks to packages/.
// The git and plugin faces stay .ts source; this compiles the .js face in
// place right before `yarn npm publish`, and --revert takes it back off.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TSCONFIG = 'tsconfig.face.json';
// The emit mirrors node's own strip: no type checking, .ts import
// specifiers rewritten to .js, output co-located with its source.
const OPTIONS = `{
  "compilerOptions": {
    "noCheck": true,
    "module": "nodenext",
    "target": "es2023",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true
  },
  "include": ["src/**/*.ts"]
}
`;

function fail(message) {
  console.error(process.env.CI ? `::error::${message}` : `error: ${message}`);
  process.exit(1);
}

// Entry points live under bin (string or map), main, and exports (condition
// map); every .ts among them becomes .js and nothing else in the manifest is
// touched. Revert runs the same flip backwards.
function flip(node, from, to) {
  if (typeof node === 'string') {
    return node.endsWith(from) ? node.slice(0, -from.length) + to : node;
  }
  if (Array.isArray(node)) {
    return node.map(value => flip(value, from, to));
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, flip(value, from, to)]),
    );
  }
  return node;
}

function flipManifest(manifest, from, to) {
  const flipped = { ...manifest };
  for (const key of ['bin', 'main', 'exports']) {
    if (manifest[key] !== undefined) {
      flipped[key] = flip(manifest[key], from, to);
    }
  }
  return flipped;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function compile(pkg) {
  const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  writeFileSync(join(pkg, TSCONFIG), OPTIONS);
  try {
    const run = spawnSync('yarn', ['run', '-T', 'tsc', '-p', TSCONFIG], {
      cwd: pkg,
      encoding: 'utf8',
    });
    if (run.status !== 0) {
      fail(`${pkg}: face compile failed:\n${run.stderr}`);
    }
  } finally {
    rmSync(join(pkg, TSCONFIG));
  }
  writeFileSync(
    join(pkg, 'package.json'),
    `${JSON.stringify(flipManifest(manifest, '.ts', '.js'), null, 2)}\n`,
  );
  console.log(`${pkg}: registry face compiled — entries now .js`);
}

function revert(pkg) {
  const files = walk(join(pkg, 'src'));
  const sources = new Set(files.filter(path => path.endsWith('.ts')));
  const emitted = files.filter(path => {
    const source = path
      .replace(/\.js(\.map)?$/, '.ts')
      .replace(/\.d\.ts$/, '.ts');
    return source !== path && sources.has(source);
  });
  for (const path of emitted) {
    rmSync(path);
  }
  const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  writeFileSync(
    join(pkg, 'package.json'),
    `${JSON.stringify(flipManifest(manifest, '.js', '.ts'), null, 2)}\n`,
  );
  console.log(
    `${pkg}: registry face reverted — ${emitted.length} files removed`,
  );
}

const argv = process.argv.slice(2);
const reverting = argv[0] === '--revert';
const pkg = reverting ? argv[1] : argv[0];
if (!pkg || argv.length > 2) {
  fail(
    `usage: publish-face.mjs [--revert] <package-dir> — got "${argv.join(' ')}"`,
  );
}
reverting ? revert(pkg) : compile(pkg);
