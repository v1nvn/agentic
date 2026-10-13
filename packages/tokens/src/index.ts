#!/usr/bin/env node
import { runCli } from '@v1nvn/agentic-core';

import { usageSpec } from './cli.ts';
import { render, reportLines } from './format.ts';
import { scan } from './scan.ts';

process.exitCode = await runCli(
  usageSpec(options => {
    const scanResult = scan();
    console.log(
      options.json === true
        ? JSON.stringify({
            lines: reportLines(scanResult, { now: new Date(scanResult.now) }),
          })
        : render(scanResult),
    );
  }),
  process.argv.slice(2),
);
