#!/usr/bin/env node
import {
  lastReply,
  readMarkdownFile,
  readStdin,
  runCli,
} from '@v1nvn/agentic-core';

import { mdSend } from './share.ts';

import type { CliSpec } from '@v1nvn/agentic-core';

const spec: CliSpec = {
  name: 'md-send',
  description: 'Send a Markdown reply to the Markdown-Viewer as a #share= URL',
  argument: {
    flags: '[file]',
    description: 'Markdown file, - for stdin; the last reply when omitted',
  },
  options: [
    {
      flags: '--view',
      description: 'open the viewer read-only, without the edit pane',
    },
  ],
  run: async (options, args) => {
    const arg = args.at(0);
    const markdown =
      arg === '-'
        ? await readStdin()
        : arg === undefined
          ? lastReply()
          : readMarkdownFile(arg);
    console.log(mdSend(markdown, options.view === true));
  },
};

process.exitCode = await runCli(spec, process.argv.slice(2));
