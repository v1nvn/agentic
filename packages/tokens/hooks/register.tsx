/**
 * The tokens mod: /tokens-usage opens the usage report as a pane — the only
 * surface, drawn only while it shows. Islands draw, processes compute — the
 * island never reads transcripts ($.fs.read caps at 4 MiB); every number is
 * one exec of the shipped CLI (bin/report.mjs --json) through the session's
 * Bash tool, the same binary `npx tokens-report` runs.
 *
 * The pane draws the engine-team idiom (their blast-radius mod is the
 * reference): one bordered Box sized to its content at open, foreground
 * accents only — the terminal paints the background.
 */

import { atom, read, update } from 'claude-code';

import type { ModelRow, ScanResult } from '../src/aggregate.js';

import { hitRate, last7, sumRows, totalTokens } from '../src/aggregate.js';
import {
  barField,
  dayLabel,
  fmtNum,
  fmtTokens,
  padL,
  padR,
} from '../src/text.js';

import type { Elements } from 'claude-code';
import type { EngineInterface, On } from 'claude-code';

const PANE = 'tokens-usage';
const REFRESH_MS = 5 * 60 * 1000;
const MODEL_COLUMN = 14;
const BAR = 12;
const ACCENT = 'cyan';
const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | ScanResult,
);

/** One CLI exec, parsed; null when it was refused, failed or answered nothing. */
async function scanUsage($: EngineInterface): Promise<null | ScanResult> {
  try {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/report.mjs --json`,
    });
    if (call.deny !== undefined || typeof call.result !== 'object') {
      return null;
    }
    const { stdout } = call.result as { stdout?: unknown };
    const parsed = JSON.parse(
      typeof stdout === 'string' ? stdout : '',
    ) as ScanResult;
    return Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

async function refresh($: EngineInterface): Promise<null | ScanResult> {
  const s = await scanUsage($);
  await update($, usage, () => s);
  return s;
}

/** The clock's job: exec only while the pane is open; closed, stay silent. */
async function refreshIfOpen($: EngineInterface): Promise<void> {
  const open = await $.ui.panes();
  if (open.some(p => p.id === PANE)) {
    await refresh($);
  }
}

/** The 24h rows that carry tokens; <synthetic> and friends carry none. */
function rows24(s: ScanResult): ModelRow[] {
  return s.last24.filter(r => totalTokens(r) > 0);
}

/** Pane height at open: content plus border, capped like the engine's own. */
function paneRows(s: null | ScanResult): number {
  return s === null
    ? 12
    : Math.min(24, 9 + rows24(s).length + last7(s, new Date(s.now)).length);
}

function draw(
  t: Pick<Elements['terminal'], 'Box' | 'Text'>,
  s: ScanResult,
): ReturnType<Elements['terminal']['Box']> {
  const { Box, Text } = t;
  const now = new Date(s.now);
  const rows = rows24(s);
  const sum = sumRows(rows);
  const days = [...last7(s, now)].reverse();
  const maxDay = Math.max(0, ...days.map(totalTokens));

  const mix = rows.map((r, i) => (
    <Text key={`m${i}`} wrap="truncate-end">
      <Text>{padR(r.model, MODEL_COLUMN)}</Text>
      <Text dimColor>
        {`${padL(fmtTokens(totalTokens(r)), 7)} · ${padL(`${fmtNum(r.calls)}`, 5)} calls`}
      </Text>
      <Text> {barField(Math.round(hitRate(r)), 100, BAR)} </Text>
      <Text bold>{`${padL(`${Math.round(hitRate(r))}%`, 4)}`}</Text>
    </Text>
  ));

  const dailies = days.map((d, i) => (
    <Text key={`d${i}`} wrap="truncate-end">
      <Text dimColor>{padR(dayLabel(d.day), 7)}</Text>
      <Text>{` ${barField(totalTokens(d), maxDay, BAR)} `}</Text>
      <Text dimColor>{padL(fmtTokens(totalTokens(d)), 7)}</Text>
      <Text bold>{`${padL(`${Math.round(hitRate(d))}%`, 4)}`}</Text>
    </Text>
  ));

  return (
    <Box
      borderColor={ACCENT}
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text bold color={ACCENT} key="title">
        Token usage · transcripts
      </Text>
      <Text key="sum">
        <Text bold>{fmtTokens(totalTokens(sum))}</Text>
        <Text
          dimColor
        >{` tokens across ${fmtNum(sum.calls)} model calls — `}</Text>
        <Text bold>{`${Math.round(hitRate(sum))}%`}</Text>
        <Text dimColor> cache hit rate</Text>
      </Text>
      <Box flexDirection="column" key="mix" marginTop={1}>
        <Text dimColor>Model mix · last 24h</Text>
        {rows.length === 0 ? (
          <Text dimColor>no usage recorded in the last 24 hours</Text>
        ) : (
          mix
        )}
      </Box>
      <Box flexDirection="column" key="daily" marginTop={1}>
        <Text dimColor>Daily · last 7 days</Text>
        {days.length === 0 ? (
          <Text dimColor>no usage recorded in the last 7 days</Text>
        ) : (
          dailies
        )}
      </Box>
      <Box key="note" marginTop={1}>
        <Text dimColor italic wrap="wrap">
          Covers every profile writing to ~/.claude/projects — hit rate = read /
          (in + read + created)
        </Text>
      </Box>
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
    const s = await refresh($);
    await $.ui.open({ id: PANE, title: 'Token usage', rows: paneRows(s) });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, usage);
    if (!s) {
      const { Text } = $.ui.resolve(e);
      return <Text>(no usage report)</Text>;
    }
    return draw($.ui.resolve(e), s);
  });
}
