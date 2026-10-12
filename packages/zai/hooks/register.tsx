/** The zai mod: /zai-usage opens the GLM report as a pane, re-scanned on its refresh tick while it stays open. */

import { atom, read, update } from 'claude-code';

import type { RenderInput } from '../src/format.js';
import type { Line } from './kit/draw.js';

import { reportLines } from '../src/format.js';
import {
  acceptJson,
  type CommandSpec,
  type Door,
  paneRows,
  type PaneSpec,
  showsPane,
} from './kit/mod.js';

import type { Elements, EngineInterface, On } from 'claude-code';

const PANE: PaneSpec = {
  empty: '(no usage report)',
  frame: true,
  id: 'zai-usage',
  refreshMs: 5 * 60 * 1000,
  title: 'GLM usage',
};
const ACCENT = 'cyan';

const usage = atom(
  { plugin: 'zai', key: 'usage' } as const,
  null as null | RenderInput,
);

function isInput(parsed: unknown): null | RenderInput {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { platform, model, tool, quota } = parsed as Record<string, unknown>;
  return typeof platform === 'string' &&
    typeof model === 'object' &&
    model !== null &&
    typeof tool === 'object' &&
    tool !== null &&
    typeof quota === 'object' &&
    quota !== null
    ? (parsed as RenderInput)
    : null;
}

async function scan($: EngineInterface): Promise<Door<RenderInput>> {
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/bin/usage.mjs usage --json`,
  });
  const got = acceptJson(call, 'query failed', isInput);
  if (got.ok) {
    await update($, usage, () => got.value);
  }
  return got;
}

async function rescanWhileOpen($: EngineInterface): Promise<void> {
  if (showsPane(await $.ui.panes(), PANE)) {
    await scan($);
  }
}

function draw(
  t: Pick<Elements['terminal'], 'Box' | 'Text'>,
  lines: readonly Line[],
  pane: PaneSpec,
): ReturnType<Elements['terminal']['Box']> {
  const { Box, Text } = t;
  return (
    <Box
      borderColor={pane.frame ? ACCENT : undefined}
      borderStyle={pane.frame ? 'round' : undefined}
      flexDirection="column"
      paddingX={pane.frame ? 1 : 0}
    >
      {lines.map((line, i) => (
        <Text key={`l${i}`} wrap="truncate-end">
          {line.map((seg, j) => (
            <Text
              bold={seg.ink === 'bold'}
              dimColor={seg.ink === 'dim'}
              key={`s${j}`}
            >
              {seg.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

const COMMANDS = [
  { description: 'Query GLM Coding Plan quota and usage', name: PANE.id },
] as const satisfies readonly CommandSpec[];

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) {
      await $.command.register(command);
    }
    const ms = PANE.refreshMs;
    if (ms !== undefined) {
      $.clock.every(ms, () => void rescanWhileOpen($));
    }
    return next(e);
  });

  on('command.run', { command: PANE.id }, async ($: EngineInterface) => {
    const got = await scan($);
    if (!got.ok) {
      $.ui.log(got.line);
      return {};
    }
    await $.ui.open({
      id: PANE.id,
      rows: paneRows(reportLines(got.value).length, PANE),
      title: PANE.title,
    });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE.id }, async ($, e) => {
    const input = await read($, usage);
    if (!input) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>{PANE.empty}</Text>;
    }
    return draw($.ui.resolve(e), reportLines(input as RenderInput), PANE);
  });
}
