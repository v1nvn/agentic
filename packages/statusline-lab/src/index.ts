import { printUsageAndExit } from '@v1nvn/agentic-core';

import { buildProgram, parseArgs, VERSION } from './cli.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

if (parsed.version) {
  console.log(VERSION);
} else {
  printUsageAndExit(buildProgram());
}
