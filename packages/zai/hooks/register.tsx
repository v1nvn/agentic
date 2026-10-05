/** The zai mod: /zai-usage opens the GLM report as a pane — one bin/usage.mjs --json exec, drawn as engine elements. */

import { atom, read, update } from 'claude-code';

import type { Elements, On, ToolCallResult } from 'claude-code';

const PANE = 'zai-usage';
const ACCENT = 'cyan';

// Local structural mirror of the CLI's --json payload: src/format.js's import
// graph is barred from the island.
interface Segment {
  ink?: 'bold' | 'dim';
  text: string;
}

type Line = Segment[];

const usage = atom(
  { plugin: 'zai', key: 'usage' } as const,
  null as Line[] | null,
);

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

function isLine(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      s =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Segment).text === 'string',
    )
  );
}

function parsedLines(call: ToolCallResult): Line[] | null {
  if (call.deny !== undefined || call.isError === true) {
    return null;
  }
  const result = call.result as null | { stdout?: unknown };
  try {
    const parsed = JSON.parse(
      typeof result?.stdout === 'string' ? result.stdout : '',
    ) as { lines?: unknown };
    return Array.isArray(parsed.lines) && parsed.lines.every(isLine)
      ? (parsed.lines as Line[])
      : null;
  } catch {
    return null;
  }
}

function draw(
  t: Pick<Elements['terminal'], 'Box' | 'Text'>,
  lines: readonly Line[],
): ReturnType<Elements['terminal']['Box']> {
  const { Box, Text } = t;
  return (
    <Box
      borderColor={ACCENT}
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
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

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'zai-usage',
      description: 'Query GLM Coding Plan quota and usage',
    });
    return next(e);
  });

  on('command.run', { command: 'zai-usage' }, async $ => {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/usage.mjs --json`,
    });
    const lines = parsedLines(call);
    if (lines === null) {
      $.ui.log(lineOf(call));
      return {};
    }
    await update($, usage, () => lines);
    await $.ui.open({ id: PANE, title: 'GLM usage', rows: lines.length + 2 });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const lines = await read($, usage);
    if (!lines) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>(no usage report)</Text>;
    }
    return draw($.ui.resolve(e), lines);
  });
}
