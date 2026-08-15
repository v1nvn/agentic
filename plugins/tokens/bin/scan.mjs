#!/usr/bin/env node

/**
 * Transcript token scanner.
 *
 * Claude Code persists every assistant message's `usage` block to session
 * transcripts at ~/.claude/projects/<project-dir>/<session>.jsonl — for every
 * profile (default claude, claudez, …), interactive and headless alike. This
 * scans those files and aggregates token usage per model and per local day:
 *   input (uncached), output, cacheRead, cacheCreation, call count.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const DAYS = 7;

export function scan({ projectsDir, now = new Date() } = {}) {
  const dir = projectsDir || path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(dir)) {
    throw new Error(`no transcripts directory at ${dir}`);
  }

  const windowStart = now.getTime() - DAYS * 24 * 3600 * 1000;
  const last24Start = now.getTime() - 24 * 3600 * 1000;

  const zero = () => ({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0, calls: 0 });
  const add = (acc, u, n = 1) => {
    acc.input += n * (+u.input_tokens || 0);
    acc.output += n * (+u.output_tokens || 0);
    acc.cacheRead += n * (+u.cache_read_input_tokens || 0);
    acc.cacheCreation += n * (+u.cache_creation_input_tokens || 0);
    acc.calls += n;
  };

  const days = new Map();    // 'YYYY-MM-DD' → acc
  const last24 = new Map();  // model → acc
  const models = new Map();  // model → acc (whole 7d window, for the model mix)

  const projectDirs = fs.readdirSync(dir)
    .map((d) => path.join(dir, d))
    .filter((d) => fs.statSync(d).isDirectory());

  for (const pdir of projectDirs) {
    for (const f of fs.readdirSync(pdir)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(pdir, f);
      if (fs.statSync(fp).mtimeMs < windowStart) continue;

      for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
        if (!line.includes('"usage"')) continue;
        let j;
        try { j = JSON.parse(line); } catch { continue; }
        const u = j.message && j.message.usage;
        const model = j.message && j.message.model;
        if (!u || !model || !j.timestamp) continue;

        const ts = new Date(j.timestamp).getTime();
        if (!(ts >= windowStart)) continue;

        const local = new Date(ts);
        const dayKey = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        if (!days.has(dayKey)) days.set(dayKey, zero());
        add(days.get(dayKey), u);

        if (!models.has(model)) models.set(model, zero());
        add(models.get(model), u);
        if (ts >= last24Start) {
          if (!last24.has(model)) last24.set(model, zero());
          add(last24.get(model), u);
        }
      }
    }
  }

  return {
    now: now.toISOString(),
    days: [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, acc]) => ({ day, ...acc })),
    models: [...models.entries()]
      .map(([model, acc]) => ({ model, ...acc }))
      .sort((a, b) => (b.input + b.output + b.cacheRead + b.cacheCreation) - (a.input + a.output + a.cacheRead + a.cacheCreation)),
    last24: [...last24.entries()]
      .map(([model, acc]) => ({ model, ...acc }))
      .sort((a, b) => (b.input + b.output + b.cacheRead + b.cacheCreation) - (a.input + a.output + a.cacheRead + a.cacheCreation)),
  };
}

// Standalone: print the aggregate JSON (for piping / debugging).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(scan(), null, 2));
}
