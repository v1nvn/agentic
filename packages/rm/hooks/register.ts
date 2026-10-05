/**
 * The rm mod: /rm-send beams the last reply to the reMarkable — one exec of
 * the shipped CLI (bin/send.mjs) through the session's Bash tool, its single
 * line shown as a dim transcript row the model never reads.
 */

import type { ToolCallResult } from 'claude-code';
import type { EngineInterface, On } from 'claude-code';

/** The line a run shows: the refusal's reason, the CLI's stdout, else its stderr or the old door's failure label. */
function lineOf(call: ToolCallResult): string {
  if (call.deny !== undefined) {
    return call.deny;
  }
  if (call.isError === true) {
    return call.text ?? 'send failed';
  }
  const result = call.result as null | { stderr?: unknown; stdout?: unknown };
  const stdout = typeof result?.stdout === 'string' ? result.stdout.trim() : '';
  if (stdout !== '') {
    return stdout;
  }
  const stderr = typeof result?.stderr === 'string' ? result.stderr.trim() : '';
  return stderr !== '' ? stderr : 'send failed';
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'rm-send',
      description: 'Beam the last reply to the reMarkable as EPUB',
    });
    return next(e);
  });

  on('command.run', { command: 'rm-send' }, async ($: EngineInterface) => {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/send.mjs`,
    });
    $.ui.log(lineOf(call));
    return {};
  });
}
