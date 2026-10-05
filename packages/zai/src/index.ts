import { printUsageAndExit } from '@v1nvn/agentic-core';

import { buildProgram, parseArgs, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

try {
  console.log(await fetchReport(resolveConfig(process.env, parsed)));
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
