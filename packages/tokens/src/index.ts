import { runCli } from '@v1nvn/agentic-core';

import { usageSpec } from './cli.js';
import { render } from './format.js';
import { scan } from './scan.js';

process.exitCode = await runCli(
  usageSpec(options => {
    const scanResult = scan();
    console.log(
      options.json === true ? JSON.stringify(scanResult) : render(scanResult),
    );
  }),
  process.argv.slice(2),
);
