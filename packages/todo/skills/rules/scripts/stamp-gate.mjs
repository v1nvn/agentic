#!/usr/bin/env node
// The stamp gate's check: is this rules file the one at <stamp>, apart from the
// **Todo:** line? Prints "rules unchanged", the lines that moved, or "unresolved"
// (exit 3) when neither the plugin cache nor tag v<stamp> on GitHub has a copy.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = 'https://raw.githubusercontent.com/v1nvn/agentic';

const stamp = process.argv[2];
if (!stamp) {
  console.error('usage: stamp-gate.mjs <stamp-version>');
  process.exit(2);
}

const rulesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'SKILL.md',
);
const body = text => text.replace(/^\*\*Todo:\*\*.*$/m, '');
const running = body(readFileSync(rulesPath, 'utf8'));

let stampRules;
const cache = join(
  homedir(),
  '.claude',
  'plugins',
  'cache',
  'agentic',
  'todo',
  stamp,
  'skills',
  'rules',
  'SKILL.md',
);
try {
  stampRules = readFileSync(cache, 'utf8');
} catch {
  try {
    const res = await fetch(
      `${RAW}/v${stamp}/packages/todo/skills/rules/SKILL.md`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) throw new Error(String(res.status));
    stampRules = await res.text();
  } catch {
    console.log(
      `unresolved: no cache entry for ${stamp} and no tag v${stamp} on GitHub`,
    );
    process.exit(3);
  }
}

const stamped = body(stampRules);
if (stamped === running) {
  console.log('rules unchanged');
  process.exit(0);
}

const a = stamped.split('\n');
const b = running.split('\n');
const dp = Array.from(
  { length: a.length + 1 },
  () => new Uint32Array(b.length + 1),
);
for (let i = a.length - 1; i >= 0; i--)
  for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] =
      a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
let i = 0;
let j = 0;
while (i < a.length && j < b.length) {
  if (a[i] === b[j]) {
    i++;
    j++;
  } else if (dp[i + 1][j] >= dp[i][j + 1]) console.log(`- ${a[i++]}`);
  else console.log(`+ ${b[j++]}`);
}
while (i < a.length) console.log(`- ${a[i++]}`);
while (j < b.length) console.log(`+ ${b[j++]}`);
