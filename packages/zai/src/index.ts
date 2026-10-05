import { printUsageAndExit } from '@v1nvn/agentic-core';

import { render, reportLines } from './format.js';
import { buildProgram, parseArgs, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

try {
  const input = await fetchReport(resolveConfig(process.env, parsed));
  console.log(
    parsed.json ? JSON.stringify({ lines: reportLines(input) }) : render(input),
  );
} catch (e) {
  console.error((e as Error).message);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
