import { parseQuietly, printUsageAndExit } from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { render } from '../plugin/hooks/format.js';
import { scan } from './scan.js';

const program = new Command()
  .name('tokens-report')
  .description(
    'Per-model token usage and cache hit rate from local transcripts',
  );

if (parseQuietly(program, process.argv.slice(2)) === undefined) {
  printUsageAndExit(program);
}

try {
  console.log(render(scan()));
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
