/** The tokens mod: /tokens-usage opens the usage report as a pane — one bin/report.mjs --json exec, drawn as the CLI's own ink-tagged lines from src/format.ts. */

import { atom, read, update } from 'claude-code';

import type { ScanResult } from '../src/aggregate.js';
import type { Line } from '../src/format.js';

import { reportLines } from '../src/format.js';

import type {
  Elements,
  EngineInterface,
  On,
  ToolCallResult,
} from 'claude-code';

const PANE = 'tokens-usage';
const REFRESH_MS = 5 * 60 * 1000;
const ACCENT = 'cyan';
const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | ScanResult,
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

function parsedScan(call: ToolCallResult): null | ScanResult {
  if (call.deny !== undefined || call.isError === true) {
    return null;
  }
  const result = call.result as null | { stdout?: unknown };
  try {
    const parsed = JSON.parse(
      typeof result?.stdout === 'string' ? result.stdout : '',
    ) as ScanResult;
    return Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

/** One CLI exec; a good scan becomes the pane state, a failed one keeps the last. */
async function scanUsage(
  $: EngineInterface,
): Promise<{ call: ToolCallResult; scan: null | ScanResult }> {
  const call = await $.tool.call({
    tool: 'Bash',
    command: `node ${$.plugin.root}/bin/report.mjs --json`,
  });
  const scan = parsedScan(call);
  if (scan !== null) {
    await update($, usage, () => scan);
  }
  return { call, scan };
}

async function refreshIfOpen($: EngineInterface): Promise<void> {
  const open = await $.ui.panes();
  if (open.some(p => p.id === PANE)) {
    await scanUsage($);
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
      name: 'tokens-usage',
      description:
        'Token usage — per-model 24h mix and 7-day dailies, as a pane',
    });
    $.clock.every(REFRESH_MS, () => void refreshIfOpen($));
    return next(e);
  });

  on('command.run', { command: 'tokens-usage' }, async $ => {
    const { call, scan } = await scanUsage($);
    if (scan === null) {
      $.ui.log(lineOf(call));
      return {};
    }
    const lines = reportLines(scan, { now: new Date(scan.now) });
    await $.ui.open({ id: PANE, title: 'Token usage', rows: lines.length + 2 });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, usage);
    if (!s) {
      const { Text } = $.ui.resolve(e);
      return <Text dimColor>(no usage report)</Text>;
    }
    return draw($.ui.resolve(e), reportLines(s, { now: new Date(s.now) }));
  });
}
