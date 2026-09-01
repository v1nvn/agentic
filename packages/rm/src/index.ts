import {
  emitHookBlock,
  lastReply,
  readHookEvent,
  replyTarget,
} from '@v1nvn/agentic-core';
import { readFileSync, statSync } from 'node:fs';

import { sendToRemarkable } from './send.js';

const file = process.argv[2] as string | undefined;

function readMarkdown(): string {
  if (file === undefined) {
    return lastReply();
  }
  const stats = statSync(file, { throwIfNoEntry: false });
  if (!stats?.isFile()) {
    throw new Error(`no such file: ${file}`);
  }
  return readFileSync(file, 'utf8');
}

if (process.argv.includes('--hook')) {
  const event = await readHookEvent();
  let reason: string;
  try {
    reason = sendToRemarkable(lastReply(replyTarget(event)));
  } catch (e) {
    reason = `send failed: ${(e as Error).message}`;
  }
  emitHookBlock(reason);
} else {
  try {
    console.log(sendToRemarkable(readMarkdown()));
  } catch (e) {
    console.error((e as Error).message);
    // CLIs report failure through the exit code; the rule targets libraries.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
