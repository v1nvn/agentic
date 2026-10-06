import { parseQuietly, printUsageAndExit, runMain } from '@v1nvn/agentic-core';
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

await runMain(() => {
  const scanResult = scan();
  console.log(
    program.opts().json ? JSON.stringify(scanResult) : render(scanResult),
  );
});
