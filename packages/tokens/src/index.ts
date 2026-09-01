import { emitHookBlock } from '@v1nvn/agentic-core';

import { render } from './format.js';
import { scan } from './scan.js';

function report(): string {
  return render(scan());
}

if (process.argv.includes('--hook')) {
  let reason: string;
  try {
    reason = report();
  } catch (e) {
    reason = `query failed: ${(e as Error).message}`;
  }
  emitHookBlock(reason);
} else {
  try {
    console.log(report());
  } catch (e) {
    console.error((e as Error).message);
    // CLIs report failure through the exit code; the rule targets libraries.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
