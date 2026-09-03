import { hookOrPrint, printUsageAndExit } from '@v1nvn/agentic-core';

import { buildProgram, parseArgs, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

await hookOrPrint(parsed.hook, 'query failed', () =>
  fetchReport(resolveConfig(process.env, parsed)),
);
