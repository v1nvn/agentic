import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export type InstallRecord =
  | {
      readonly installPath: string;
      readonly kind: 'resolved';
      readonly version: string;
    }
  | { readonly kind: 'unresolved'; readonly reason: string };

interface Entry {
  readonly installedAt?: unknown;
  readonly installPath: string;
  readonly lastUpdated?: unknown;
  readonly version?: unknown;
}

const RECORD_FILE = join('.claude', 'plugins', 'installed_plugins.json');
const UNREADABLE = 'installed_plugins.json unreadable';
const NONE_USABLE = 'no statusline@agentic install with a render.mjs';

// Stays node-built-ins-only: the render pass bundles this module into the
// standalone resolver while the CLI imports it in-process.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Claude Code's own install record (v2 shape): the plugin-update path
// rewrites it, so the entries name the renderers updates have landed.
function ourEntries(home: string): null | readonly unknown[] {
  let raw: string;
  try {
    raw = readFileSync(join(home, RECORD_FILE), 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const plugins = isObject(parsed) ? parsed.plugins : undefined;
  const ours = isObject(plugins) ? plugins['statusline@agentic'] : null;
  return Array.isArray(ours) ? ours : ours === undefined ? [] : null;
}

function stamp(value: unknown): number {
  const ms = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

function isNewer(candidate: Entry, incumbent: Entry): boolean {
  const updated = stamp(candidate.lastUpdated) - stamp(incumbent.lastUpdated);
  return (
    updated > 0 ||
    (updated === 0 &&
      stamp(candidate.installedAt) > stamp(incumbent.installedAt))
  );
}

function usable(value: unknown): value is Entry {
  return (
    isObject(value) &&
    typeof value.installPath === 'string' &&
    existsSync(join(value.installPath, 'render.mjs'))
  );
}

export function resolveInstall(home: string): InstallRecord {
  const entries = ourEntries(home);
  if (entries === null) {
    return { kind: 'unresolved', reason: UNREADABLE };
  }
  const installed = entries.filter(usable);
  if (installed.length === 0) {
    return { kind: 'unresolved', reason: NONE_USABLE };
  }
  const best = installed.reduce((incumbent, candidate) =>
    isNewer(candidate, incumbent) ? candidate : incumbent,
  );
  return {
    installPath: best.installPath,
    kind: 'resolved',
    version:
      typeof best.version === 'string'
        ? best.version
        : basename(best.installPath),
  };
}
