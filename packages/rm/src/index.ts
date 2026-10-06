import {
  lastReply,
  parseQuietly,
  printUsageAndExit,
  readMarkdownFile,
  runMain,
} from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { sendToRemarkable } from './send.js';

const program = new Command()
  .name('rm-send')
  .description('Beam a Markdown reply to the reMarkable as EPUB')
  .argument('[file]', 'Markdown file; the last reply when omitted');

const parsed =
  parseQuietly(program, process.argv.slice(2)) ?? printUsageAndExit(program);
const file = parsed.args.at(0);

await runMain(() => {
  const markdown = file === undefined ? lastReply() : readMarkdownFile(file);
  console.log(sendToRemarkable(markdown));
});
