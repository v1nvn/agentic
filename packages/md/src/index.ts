import {
  hookOrPrint,
  lastReply,
  parseQuietly,
  printUsageAndExit,
  replyTarget,
} from '@v1nvn/agentic-core';
import { Command } from 'commander';
import { readFileSync, statSync } from 'node:fs';

import { mdSend } from './share.js';

const program = new Command()
  .name('md-send')
  .description('Send a Markdown reply to the Markdown-Viewer as a #share= URL')
  .argument('[file]', 'Markdown file, - for stdin; the last reply when omitted')
  .option('--hook', 'emit a UserPromptExpansion block instead of printing');

const parsed =
  parseQuietly(program, process.argv.slice(2)) ?? printUsageAndExit(program);
const arg = parsed.args.at(0);
const { hook } = parsed.opts<{ hook: boolean | undefined }>();

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

await hookOrPrint(hook ?? false, 'send failed', async event =>
  mdSend(
    event === undefined ? await readMarkdown() : lastReply(replyTarget(event)),
  ),
);
