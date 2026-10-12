import {
  HelpRequested,
  printHelpAndExit,
  printUsageAndExit,
  runMain,
} from '@v1nvn/agentic-core';

import { render } from './format.js';
import { buildProgram, parseArgs, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

const asked = parseArgs(process.argv.slice(2));
if (asked instanceof HelpRequested) {
  printHelpAndExit(asked.command);
}
const parsed = asked ?? printUsageAndExit(buildProgram());

if (parsed.command !== 'usage') {
  printUsageAndExit(buildProgram());
}

await runMain(async () => {
  const input = await fetchReport(resolveConfig(process.env, parsed));
  console.log(parsed.json ? JSON.stringify(input) : render(input));
});
