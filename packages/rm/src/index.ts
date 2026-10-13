#!/usr/bin/env node
import { lastReply, readMarkdownFile, runCli } from '@v1nvn/agentic-core';

import { sendToRemarkable } from './send.ts';

import type { CliSpec } from '@v1nvn/agentic-core';

const spec: CliSpec = {
  name: 'rm-send',
  description: 'Beam a Markdown reply to the reMarkable as EPUB',
  argument: {
    flags: '[file]',
    description: 'Markdown file; the last reply when omitted',
  },
  run: (_options, args) => {
    const file = args.at(0);
    const markdown = file === undefined ? lastReply() : readMarkdownFile(file);
    console.log(sendToRemarkable(markdown));
  },
};

process.exitCode = await runCli(spec, process.argv.slice(2));
