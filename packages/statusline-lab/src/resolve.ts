import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { installedPluginsFile, statuslineCacheRoot } from './paths.js';

export interface ResolveOptions {
  readonly home: string;
}

export interface ResolveResult {
  readonly pluginDir: null | string;
}

interface InstalledPluginsFile {
  readonly plugins?: Record<
    string,
    readonly { readonly installPath?: unknown }[]
  >;
}

function installPathFrom(file: string): null | string {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const installPath = (parsed as InstalledPluginsFile | null)?.plugins?.[
    'statusline@agentic'
  ]?.[0]?.installPath;
  return typeof installPath === 'string' && installPath !== ''
    ? installPath
    : null;
}

function byVersion(a: string, b: string): number {
  const left = a.split('.');
  const right = b.split('.');
  for (let i = 0; i < left.length || i < right.length; i += 1) {
    const delta =
      (parseInt(left[i] ?? '0', 10) || 0) -
      (parseInt(right[i] ?? '0', 10) || 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

export function resolve({ home }: ResolveOptions): ResolveResult {
  const installPath = installPathFrom(installedPluginsFile(home));
  if (installPath !== null) {
    return { pluginDir: installPath };
  }
  const cacheRoot = statuslineCacheRoot(home);
  let versions: string[];
  try {
    versions = readdirSync(cacheRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return { pluginDir: null };
  }
  if (versions.length === 0) {
    return { pluginDir: null };
  }
  versions.sort(byVersion);
  return { pluginDir: join(cacheRoot, versions[versions.length - 1]) };
}
