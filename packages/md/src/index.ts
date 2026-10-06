import {
  lastReply,
  parseQuietly,
  printUsageAndExit,
  readMarkdownFile,
  readStdin,
  runMain,
} from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { mdSend } from './share.js';

const program = new Command()
  .name('md-send')
  .description('Send a Markdown reply to the Markdown-Viewer as a #share= URL')
  .argument('[file]', 'Markdown file, - for stdin; the last reply when omitted')
  .option('--view', 'open the viewer read-only, without the edit pane');

const parsed =
  parseQuietly(program, process.argv.slice(2)) ?? printUsageAndExit(program);
const arg = parsed.args.at(0);
const { view } = parsed.opts<{ view: boolean | undefined }>();

function readMarkdown(): Promise<string> | string {
  if (arg === '-') {
    return readStdin();
  }
  if (arg === undefined) {
    return lastReply();
  }
  return readMarkdownFile(arg);
}

await runMain(async () => {
  console.log(mdSend(await readMarkdown(), view ?? false));
});
