/** The zai mod: /zai-usage opens the GLM report as a pane, re-scanned on its refresh tick while it stays open. The CLI emits the finished ink-tagged lines; the island accepts and renders them. */

import { atom, read, update } from 'claude-code';

import {
  acceptJson,
  type CommandSpec,
  type Door,
  type Line,
  paneRows,
  type PaneSpec,
  showsPane,
} from './support.ts';

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
  null as null | { lines: Line[] },
);

function isLines(parsed: unknown): null | { lines: Line[] } {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { lines } = parsed as { lines?: unknown };
  if (!Array.isArray(lines)) {
    return null;
  }
  return lines.every(
    l =>
      Array.isArray(l) &&
      l.every(
        s =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as { text?: unknown }).text === 'string',
      ),
  )
    ? { lines: lines as Line[] }
    : null;
}

async function scan($: EngineInterface): Promise<Door<{ lines: Line[] }>> {
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/src/index.ts usage --json`,
  });
  const got = acceptJson(call, 'query failed', isLines);
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
  function isColor(ink: Line[number]['ink']): boolean {
    return ink === 'green' || ink === 'magenta';
  }
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
              color={isColor(seg.ink) ? seg.ink : undefined}
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
      rows: paneRows(got.value.lines.length, PANE),
      title: PANE.title,
    });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE.id }, async ($, e) => {
    const saved = await read($, usage);
    if (!saved) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>{PANE.empty}</Text>;
    }
    return draw($.ui.resolve(e), saved.lines, PANE);
  });
}
