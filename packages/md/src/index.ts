import {
  lastReply,
  parseQuietly,
  printUsageAndExit,
  readMarkdownFile,
  readStdin,
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

try {
  console.log(mdSend(await readMarkdown(), view ?? false));
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
