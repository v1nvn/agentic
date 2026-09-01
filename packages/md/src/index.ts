import {
  emitHookBlock,
  lastReply,
  readHookEvent,
  replyTarget,
} from '@v1nvn/agentic-core';
import { readFileSync, statSync } from 'node:fs';

import { mdSend } from './share.js';

const arg = process.argv[2] as string | undefined;

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

if (process.argv.includes('--hook')) {
  const event = await readHookEvent();
  let reason: string;
  try {
    reason = mdSend(lastReply(replyTarget(event)));
  } catch (e) {
    reason = `send failed: ${(e as Error).message}`;
  }
  emitHookBlock(reason);
} else {
  try {
    console.log(mdSend(await readMarkdown()));
  } catch (e) {
    console.error((e as Error).message);
    // CLIs report failure through the exit code; the rule targets libraries.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
