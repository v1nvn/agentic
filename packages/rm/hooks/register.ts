/**
 * The rm mod: /rm-send beams the last reply to the reMarkable — one exec of
 * the shipped CLI (bin/send.mjs) through the session's Bash tool, its single
 * line shown as a dim transcript row the model never reads.
 */

import { lineOf } from './kit/draw.js';
import { type CommandSpec } from './kit/mod.js';

import type { EngineInterface, On } from 'claude-code';

const COMMANDS = [
  {
    description: 'Beam the last reply to the reMarkable as EPUB',
    name: 'rm-send',
  },
] as const satisfies readonly CommandSpec[];

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) {
      await $.command.register(command);
    }
    return next(e);
  });

  on('command.run', { command: 'rm-send' }, async ($: EngineInterface) => {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/send.mjs`,
    });
    $.ui.log(lineOf(call, 'send failed'));
    return {};
  });
}
