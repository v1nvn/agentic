#!/usr/bin/env node
// The data-dir launcher the settings keys spawn: `node …/render.mjs`. The
// plugin cache path changes on every update, so this stable file locates the
// current statusline@agentic install from Claude Code's own install record
// and hands off to the plugin's renderer source. Node builtins only — the
// data dir holds this file alone.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RENDERER = join('src', 'render', 'entry.ts');

function fail(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(1);
}

let recordPath;
try {
  recordPath = join(process.env.HOME ?? '', '.claude', 'plugins', 'installed_plugins.json');
  const entries = JSON.parse(readFileSync(recordPath, 'utf8'))?.plugins?.[
    'statusline@agentic'
  ];
  if (!Array.isArray(entries)) {
    fail('no statusline@agentic entry in installed_plugins.json');
  }
  const usable = entries.filter(
    e =>
      e &&
      typeof e.installPath === 'string' &&
      existsSync(join(e.installPath, RENDERER)),
  );
  if (usable.length === 0) {
    fail(`no statusline@agentic install with ${RENDERER}`);
  }
  const stamp = e => {
    const ms = Date.parse(e.lastUpdated ?? '');
    return Number.isNaN(ms) ? 0 : ms;
  };
  const best = usable.reduce((a, b) => (stamp(b) > stamp(a) ? b : a));
  await import(pathToFileURL(join(best.installPath, RENDERER)).href);
} catch (e) {
  fail(e?.message ?? 'launcher failed');
}
