import { lastReply } from '@v1nvn/agentic-core';
import { readFileSync, statSync } from 'node:fs';

import { mdSend } from './share.js';

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', reject);
  });
}

const arg = process.argv[2] as string | undefined;

function readMarkdown(): Promise<string> | string {
  if (arg === '-') {
    return readStdin();
  }
  if (arg === undefined) {
    return lastReply();
  }
  const stats = statSync(arg, { throwIfNoEntry: false });
  if (!stats?.isFile()) {
    throw new Error(`no such file: ${arg}`);
  }
  return readFileSync(arg, 'utf8');
}

try {
  console.log(mdSend(await readMarkdown()));
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
