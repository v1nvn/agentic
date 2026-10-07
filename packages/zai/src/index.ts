import { printUsageAndExit, runMain } from '@v1nvn/agentic-core';

import { render, reportLines } from './format.js';
import { buildProgram, parseArgs, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

if (parsed.command !== 'usage') {
  printUsageAndExit(buildProgram());
}

await runMain(async () => {
  const input = await fetchReport(resolveConfig(process.env, parsed));
  console.log(
    parsed.json ? JSON.stringify({ lines: reportLines(input) }) : render(input),
  );
});
