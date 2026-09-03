import {
  hookOrPrint,
  parseQuietly,
  printUsageAndExit,
} from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { render } from './format.js';
import { scan } from './scan.js';

const program = new Command()
  .name('tokens-report')
  .description(
    'Per-model token usage and cache hit rate from local transcripts',
  )
  .option('--hook', 'emit a UserPromptExpansion block instead of printing');

const parsed =
  parseQuietly(program, process.argv.slice(2)) ?? printUsageAndExit(program);
const { hook } = parsed.opts<{ hook: boolean | undefined }>();

function report(): string {
  return render(scan());
}

await hookOrPrint(hook ?? false, 'query failed', report);
