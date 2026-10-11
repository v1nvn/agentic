/**
 * The rm mod: /rm-send beams the last reply to the reMarkable — one exec of
 * the shipped CLI (bin/send.mjs) through the session's Bash tool, its single
 * line shown as a dim transcript row the model never reads.
 */

import { lineOf } from './kit/draw.js';

import type { EngineInterface, On } from 'claude-code';

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
    $.ui.log(lineOf(call, 'send failed'));
    return {};
  });
}
