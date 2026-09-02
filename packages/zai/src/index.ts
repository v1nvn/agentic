import { emitHookBlock } from '@v1nvn/agentic-core';

import { parseArgs, resolveConfig, USAGE } from './resolve.js';
import { fetchReport } from './usage.js';

const parsed = parseArgs(process.argv.slice(2));

if (parsed === undefined) {
  console.error(USAGE);
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
} else if (parsed.hook) {
  let reason: string;
  try {
    reason = await fetchReport(resolveConfig(process.env, parsed));
  } catch (e) {
    reason = `query failed: ${(e as Error).message}`;
  }
  emitHookBlock(reason);
} else {
  try {
    console.log(await fetchReport(resolveConfig(process.env, parsed)));
  } catch (e) {
    console.error((e as Error).message);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
