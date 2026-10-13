#!/usr/bin/env node
import { runCli } from '@v1nvn/agentic-core';

import { render, reportLines } from './format.ts';
import { cliSpec, resolveConfig } from './resolve.ts';
import { fetchReport } from './usage.ts';

process.exitCode = await runCli(
  cliSpec(async options => {
    const input = await fetchReport(
      resolveConfig(process.env, {
        authToken: (options.authToken as string) || undefined,
        baseUrl: (options.baseUrl as string) || undefined,
        command: 'usage',
        json: options.json === true,
      }),
    );
    console.log(
      options.json === true
        ? JSON.stringify({ lines: reportLines(input) })
        : render(input),
    );
  }),
  process.argv.slice(2),
);
