import {
  hookOrPrint,
  lastReply,
  parseQuietly,
  printUsageAndExit,
  readMarkdownFile,
  replyTarget,
} from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { sendToRemarkable } from './send.js';

const program = new Command()
  .name('rm-send')
  .description('Beam a Markdown reply to the reMarkable as EPUB')
  .argument('[file]', 'Markdown file; the last reply when omitted')
  .option('--hook', 'emit a UserPromptExpansion block instead of printing');

const parsed =
  parseQuietly(program, process.argv.slice(2)) ?? printUsageAndExit(program);
const file = parsed.args.at(0);
const { hook } = parsed.opts<{ hook: boolean | undefined }>();

function readMarkdown(): string {
  return file === undefined ? lastReply() : readMarkdownFile(file);
}

await hookOrPrint(hook ?? false, 'send failed', event =>
  sendToRemarkable(
    event === undefined ? readMarkdown() : lastReply(replyTarget(event)),
  ),
);
