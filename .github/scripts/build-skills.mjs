#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const errors = [];

function parseFrontmatter(md) {
  const lines = md.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;

  const frontmatter = {};
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontmatter, body: lines.slice(end + 1).join('\n') };
}

function lintSkill(skillMdPath) {
  const rel = path.relative(repoRoot, skillMdPath);
  const parsed = parseFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
  if (!parsed) {
    errors.push(`${rel}: missing frontmatter (expected a '---'-delimited block)`);
    return;
  }
  for (const key of ['name', 'description']) {
    if (!parsed.frontmatter[key]) errors.push(`${rel}: frontmatter missing '${key}'`);
  }

  const skillDir = path.dirname(skillMdPath);
  const refs = new Set([...parsed.body.matchAll(/\bnode\s+scripts\/([^\s"'`]+)/g)].map((m) => m[1]));
  for (const scriptRel of refs) {
    if (!/\.(js|mjs)$/.test(scriptRel)) continue;
    const scriptPath = path.join(skillDir, 'scripts', scriptRel);
    const scriptRepoRel = path.relative(repoRoot, scriptPath);
    if (!fs.existsSync(scriptPath)) {
      errors.push(`${rel}: referenced script missing: ${scriptRepoRel}`);
      continue;
    }
    const res = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8', stdio: 'pipe' });
    if (res.status !== 0) {
      errors.push(`${scriptRepoRel}: syntax check failed\n${(res.stderr || res.stdout).trim()}`);
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'SKILL.md') lintSkill(full);
  }
}

const pluginsDir = path.join(repoRoot, 'plugins');
if (!fs.existsSync(pluginsDir)) {
  console.error('Skill lint failed: plugins/ not found');
  process.exit(1);
}

walk(pluginsDir);

if (errors.length) {
  console.error('Skill lint failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Skill lint passed.');
