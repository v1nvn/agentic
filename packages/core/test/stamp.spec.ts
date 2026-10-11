import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

interface StampCopy {
  from: string;
  to: string;
}

interface StampManifest {
  copies: StampCopy[];
}

const KIT_FILE_RE = /^packages\/[^/]+\/(hooks|tests)\/kit\/[^/]+\.ts$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.claude-plugin', 'tmp']);

function readTree(): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(path);
        }
      } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        files.set(relative(root, path), readFileSync(path, 'utf8'));
      }
    }
  };
  walk(join(root, 'packages'));
  return files;
}

const FROM_RE = /\bfrom\s+['"]([^'"]+)['"]/g;

function foreignImports(path: string, source: string): string[] {
  const home = /^packages\/([^/]+)\/(hooks|tests)\//.exec(path);
  if (home === null) {
    return [];
  }
  const out: string[] = [];
  for (const match of source.matchAll(FROM_RE)) {
    const spec = match[1];
    if (spec.startsWith('.')) {
      const resolved = relative(root, resolve(root, dirname(path), spec));
      if (!resolved.startsWith(`packages/${home[1]}/`)) {
        out.push(
          `foreign import: ${path} imports '${spec}' outside packages/${home[1]}`,
        );
      }
    }
  }
  return out;
}

function stampViolations(
  files: Map<string, string>,
  manifest: StampManifest,
): string[] {
  const out: string[] = [];
  const stamped = new Set<string>();
  for (const copy of manifest.copies) {
    stamped.add(copy.to);
    const source = files.get(copy.from);
    const dest = files.get(copy.to);
    if (source === undefined) {
      out.push(`missing stamp source: ${copy.from}`);
    } else if (dest === undefined) {
      out.push(`missing stamp: ${copy.to} (run yarn build)`);
    } else if (dest !== source) {
      out.push(
        `stale stamp: ${copy.to} differs from ${copy.from} (run yarn build)`,
      );
    }
    if (!KIT_FILE_RE.test(copy.to)) {
      out.push(`stamp dest outside a kit dir: ${copy.to}`);
    }
  }
  for (const [path, source] of files) {
    if (KIT_FILE_RE.test(path) && !stamped.has(path)) {
      out.push(`orphaned stamp: ${path} — no manifest entry names it`);
    }
    out.push(...foreignImports(path, source));
  }
  return out;
}

const manifest: StampManifest = JSON.parse(
  readFileSync(join(root, 'stamp.manifest.json'), 'utf8'),
);

test('every manifest entry is stamped byte-exact, no stamp drifts', () => {
  expect(manifest.copies.length).toBeGreaterThan(0);
  expect(stampViolations(readTree(), manifest)).toEqual([]);
});

test('a hand-edited stamped copy is a violation', () => {
  const files = readTree();
  for (const copy of manifest.copies) {
    const stamped = files.get(copy.to);
    if (stamped !== undefined) {
      files.set(copy.to, `${stamped}\n// a hand edit\n`);
    }
  }
  const violations = stampViolations(files, manifest);
  for (const copy of manifest.copies) {
    expect(violations).toContain(
      `stale stamp: ${copy.to} differs from ${copy.from} (run yarn build)`,
    );
  }
});

test('an orphaned stamp — the manifest entry gone, the copy still in the tree — is a violation', () => {
  const violations = stampViolations(readTree(), { copies: [] });
  for (const copy of manifest.copies) {
    expect(violations).toContain(
      `orphaned stamp: ${copy.to} — no manifest entry names it`,
    );
  }
});

test("a home importing another home's stamp is a violation", () => {
  const files = readTree();
  const leak = 'packages/zai/hooks/leak.ts';
  files.set(leak, `import { lineOf } from '../../rm/hooks/kit/draw.js';\n`);
  expect(stampViolations(files, manifest)).toContain(
    `foreign import: ${leak} imports '../../rm/hooks/kit/draw.js' outside packages/zai`,
  );
});
