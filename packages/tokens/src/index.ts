import { parseQuietly, printUsageAndExit } from '@v1nvn/agentic-core';
import { Command } from 'commander';

import { render } from './format.js';
import { scan } from './scan.js';

const program = new Command()
  .name('tokens-report')
  .description(
    'Per-model token usage and cache hit rate from local transcripts',
  )
  .option('--json', 'print the ScanResult as JSON for the tokens mod');

if (parseQuietly(program, process.argv.slice(2)) === undefined) {
  printUsageAndExit(program);
}

try {
  const scanResult = scan();
  console.log(
    program.opts().json ? JSON.stringify(scanResult) : render(scanResult),
  );
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
