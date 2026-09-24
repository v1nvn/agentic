import { shutdownOnSignals } from '@v1nvn/agentic-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { describeError } from './errors.js';
import { createServer } from './server.js';

if (process.argv[2] === 'extract') {
  void import('./cli.js')
    .then(m => m.runCli(process.argv.slice(2)))
    .then(code => {
      // eslint-disable-next-line n/no-process-exit
      process.exit(code);
    })
    .catch((err: unknown) => {
      process.stderr.write(`${describeError(err)}\n`);
      // eslint-disable-next-line n/no-process-exit
      process.exit(1);
    });
} else {
  const server: McpServer = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  shutdownOnSignals([server]);
}
