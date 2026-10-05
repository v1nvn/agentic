/**
 * The zai mod: /zai-usage reports GLM Coding Plan quota and usage — one exec
 * of the shipped CLI (bin/usage.mjs) through the session's Bash tool, its
 * report shown as dim transcript rows the model never reads.
 */

import type { ToolCallResult } from 'claude-code';
import type { EngineInterface, On } from 'claude-code';

/** The line a run shows: the refusal's reason, the CLI's stdout, else its stderr or the query's failure label. */
function lineOf(call: ToolCallResult): string {
  if (call.deny !== undefined) {
    return call.deny;
  }
  if (call.isError === true) {
    return call.text ?? 'query failed';
  }
  const result = call.result as null | { stderr?: unknown; stdout?: unknown };
  const stdout = typeof result?.stdout === 'string' ? result.stdout.trim() : '';
  if (stdout !== '') {
    return stdout;
  }
  const stderr = typeof result?.stderr === 'string' ? result.stderr.trim() : '';
  return stderr !== '' ? stderr : 'query failed';
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'zai-usage',
      description: 'Query GLM Coding Plan quota and usage',
    });
    return next(e);
  });

  on('command.run', { command: 'zai-usage' }, async ($: EngineInterface) => {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/usage.mjs`,
    });
    $.ui.log(lineOf(call));
    return {};
  });
}
