import { runCli } from '@v1nvn/agentic-core';

import { render } from './format.js';
import { cliSpec, resolveConfig } from './resolve.js';
import { fetchReport } from './usage.js';

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
    console.log(options.json === true ? JSON.stringify(input) : render(input));
  }),
  process.argv.slice(2),
);
