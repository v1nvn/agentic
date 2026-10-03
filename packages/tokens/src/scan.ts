/**
 * Transcript walk for the CLI: node-fs listing over the transcripts dir
 * (see aggregate.ts for what a transcript line contributes). Claude Code
 * persists every assistant message's `usage` block to session transcripts at
 * $CLAUDE_DIR/projects/<project-dir>/<session>.jsonl (default ~/.claude) — for
 * every profile (default claude, claudez, …), interactive and headless alike.
 */

import { claudeProjectsDir } from '@v1nvn/agentic-core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { ScanResult } from '../plugin/hooks/aggregate.js';

import { createAggregator } from '../plugin/hooks/aggregate.js';

export function scan({
  projectsDir,
  now = new Date(),
}: { now?: Date; projectsDir?: string } = {}): ScanResult {
  const dir = projectsDir ?? claudeProjectsDir();
  if (!existsSync(dir)) {
    throw new Error(`no transcripts directory at ${dir}`);
  }

  const agg = createAggregator(now);
  const projectDirs = readdirSync(dir)
    .map(d => join(dir, d))
    .filter(d => statSync(d).isDirectory());

  for (const pdir of projectDirs) {
    for (const f of readdirSync(pdir)) {
      if (!f.endsWith('.jsonl')) {
        continue;
      }
      const fp = join(pdir, f);
      if (statSync(fp).mtimeMs < agg.windowStart) {
        continue;
      }

      for (const line of readFileSync(fp, 'utf8').split('\n')) {
        agg.addLine(line);
      }
    }
  }

  return agg.result();
}
