/**
 * The md mod: /md-edit and /md-view send the last reply to the
 * Markdown-Viewer — one exec of the shipped CLI (bin/send.mjs) through the
 * session's Bash tool, its single line shown as a dim transcript row the
 * model never reads. /md-view adds the CLI's --view flag (read-only share).
 */

import type {
  CommandRunResult,
  EngineInterface,
  On,
  ToolCallResult,
} from 'claude-code';

/** The line a run shows: the refusal's reason, the CLI's stdout, else its stderr or the share's failure label. */
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

async function share(
  $: EngineInterface,
  view: boolean,
): Promise<CommandRunResult> {
  const flag = view ? ' --view' : '';
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/bin/send.mjs${flag}`,
  });
  $.ui.log(lineOf(call));
  return {};
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'md-edit',
      description: 'Send the last reply to the Markdown-Viewer, editable',
    });
    await $.command.register({
      name: 'md-view',
      description: 'Send the last reply to the Markdown-Viewer, read-only',
    });
    return next(e);
  });

  on('command.run', { command: 'md-edit' }, ($: EngineInterface) =>
    share($, false),
  );

  on('command.run', { command: 'md-view' }, ($: EngineInterface) =>
    share($, true),
  );
}
