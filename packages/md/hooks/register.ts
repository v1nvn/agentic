/**
 * The md mod: /md-edit and /md-view send the last reply to the
 * Markdown-Viewer — one exec of the shipped CLI (bin/send.mjs) through the
 * session's Bash tool, its single line shown as a dim transcript row the
 * model never reads. /md-view adds the CLI's --view flag (read-only share).
 */

import { lineOf } from './kit/draw.js';
import { type CommandSpec } from './kit/mod.js';

import type { CommandRunResult, EngineInterface, On } from 'claude-code';

const COMMANDS = [
  {
    description: 'Send the last reply to the Markdown-Viewer, editable',
    name: 'md-edit',
  },
  {
    description: 'Send the last reply to the Markdown-Viewer, read-only',
    name: 'md-view',
  },
] as const satisfies readonly CommandSpec[];

async function share(
  $: EngineInterface,
  view: boolean,
): Promise<CommandRunResult> {
  const flag = view ? ' --view' : '';
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/bin/send.mjs${flag}`,
  });
  $.ui.log(lineOf(call, 'share failed'));
  return {};
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) {
      await $.command.register(command);
    }
    return next(e);
  });

  on('command.run', { command: 'md-edit' }, ($: EngineInterface) =>
    share($, false),
  );

  on('command.run', { command: 'md-view' }, ($: EngineInterface) =>
    share($, true),
  );
}
