import { printUsageAndExit, runMain } from '@v1nvn/agentic-core';

import { buildProgram, parseArgs } from './cli.js';
import { render } from './format.js';
import { scan } from './scan.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

if (parsed.command !== 'usage') {
  printUsageAndExit(buildProgram());
}

await runMain(() => {
  const scanResult = scan();
  console.log(parsed.json ? JSON.stringify(scanResult) : render(scanResult));
});
