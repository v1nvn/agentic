import { describe, expect, it } from 'vitest';
import { render } from '../src/format.js';
import type { ZaiModelUsage, ZaiQuota, ZaiToolUsage } from '../src/format.js';

// Sample data pasted from a real blocked-hook output.
const x_time = [
  '2026-07-16 09:00', '2026-07-16 10:00', '2026-07-16 11:00', '2026-07-16 12:00',
  '2026-07-16 13:00', '2026-07-16 14:00', '2026-07-16 15:00', '2026-07-16 16:00',
  '2026-07-16 17:00', '2026-07-16 18:00', '2026-07-16 19:00', '2026-07-16 20:00',
  '2026-07-16 21:00', '2026-07-16 22:00', '2026-07-16 23:00', '2026-07-17 00:00',
  '2026-07-17 01:00', '2026-07-17 02:00', '2026-07-17 03:00', '2026-07-17 04:00',
  '2026-07-17 05:00', '2026-07-17 06:00', '2026-07-17 07:00', '2026-07-17 08:00',
  '2026-07-17 09:00', '2026-07-17 10:00', '2026-07-17 11:00',
];

const tokensUsage = [
  6949458, 19845601, 12108819, 21836589, 20567143, 31375419, 22810589, 21402132,
  0, 0, 13162969, 149064442, 6120451, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 215764, 22928094, 3177181,
];
const modelCallCount = [
  60, 270, 168, 179, 299, 417, 261, 231, 0, 0, 184, 1262, 56, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 312, 47,
];

const model: ZaiModelUsage = {
  x_time,
  tokensUsage,
  modelCallCount,
  totalUsage: { totalModelCallCount: 3748, totalTokensUsage: 351564651 },
  modelSummaryList: [
    { modelName: 'GLM-5.2', totalTokens: 333572794, sortOrder: 1 },
    { modelName: 'GLM-4.7', totalTokens: 25808329, sortOrder: 2 },
  ],
};

const tool: ZaiToolUsage = {
  totalUsage: {
    totalNetworkSearchCount: 19,
    totalWebReadMcpCount: 8,
    totalZreadMcpCount: 0,
    totalSearchMcpCount: 27,
  },
};

const quota: ZaiQuota = {
  limits: [
    {
      type: 'MCP usage(1 Month)',
      percentage: 30,
      currentUsage: 308,
      totol: 1000,
      usageDetails: [
        { modelCode: 'search-prime', usage: 223 },
        { modelCode: 'web-reader', usage: 73 },
        { modelCode: 'zread', usage: 12 },
      ],
    },
    { type: 'Token usage(5 Hour)', percentage: 16 },
  ],
  level: 'pro',
};

// Fixed instants so peak-now rendering is deterministic regardless of when the
// test runs. NOW_OFF = Beijing 09:00 Mon (outside peak); NOW_IN = Beijing 15:30
// Mon (inside peak → 90 min elapsed, 150 min left).
const NOW_OFF = new Date(Date.UTC(2026, 6, 13, 1, 0));
const NOW_IN = new Date(Date.UTC(2026, 6, 13, 7, 30));

const render$ = (over: Partial<Parameters<typeof render>[0]> = {}) =>
  render({ platform: 'ZAI', model, tool, quota, apiOffsetMin: 480, localOffsetMin: 480, now: NOW_OFF, ...over });

describe('zai report render', () => {
  const out = render$();

  it('renders the header with the plan level and totals', () => {
    expect(out).toContain('GLM Coding Plan · Pro');
    expect(out).toContain('351.6M tokens');
    expect(out).toContain('3,748');
    expect(out).toContain('42%');
    expect(out).toContain('Jul 16');
    expect(out).toContain('1,262 calls');
  });

  it('renders the model mix', () => {
    expect(out).toContain('92.8%');
    expect(out).toContain('7.2%');
    expect(out).toContain('333.6M');
    expect(out).toContain('25.8M');
  });

  it('renders the quota meters and tool breakdown', () => {
    expect(out).toContain('30%');
    expect(out).toContain('308M / 1,000M');
    expect(out).toContain('16%');
    expect(out).toContain('19 searches');
    expect(out).toContain('8 reads');
    expect(out).toContain('web search 223');
  });

  it('collapses overnight idle and annotates the peak', () => {
    expect(out).toContain('idle');
    expect(out).toContain('◂ peak');
    expect(out).toContain('█');
  });

  it('draws the vertical chart axes', () => {
    expect(out).toContain('┤');
    expect(out).toContain('149.1M ┤');
    expect(out).toContain('└');
    expect(out).toContain('┬');
    expect(out).toMatch(/[▁▂▃▄▅▆▇]/);
  });

  it('summarizes the 3× billing peak window', () => {
    expect(out).toContain('Peak hrs');
    expect(out).toContain('Mon–Fri 14:00–18:00');
    expect(out).toContain('3×');
    expect(out).toContain('3h active');
    expect(out).toContain('75.6M');
    expect(out).toContain('22%');
    expect(out).toContain('↑');
  });

  it('stays plain text', () => {
    expect(out).not.toContain('UTC+8');
    expect(out).not.toContain('**');
  });

  it('shifts buckets to the caller offset (Beijing → IST)', () => {
    const ist = render$({ localOffsetMin: 330 });
    expect(ist).toContain('Jul 16 06:30');
    expect(ist).toContain('Jul 16 17:30');
    expect(ist).toContain('Jul 17 08:30');
    expect(ist).toContain('11:30–15:30');
  });

  it('shows the limits peak row as a window timeline', () => {
    const inPeak = render$({ now: NOW_IN });
    expect(inPeak).toMatch(/^ {3}Peak {12}14:00  █{8}░{14}  18:00$/m);
    expect(inPeak).not.toContain(' left');

    const inPeakIst = render$({ now: NOW_IN, localOffsetMin: 330 });
    expect(inPeakIst).toMatch(/^ {3}Peak {12}11:30  █{8}░{14}  15:30$/m);

    expect(out).toMatch(/^ {3}Peak {12}14:00  ░{22}  18:00$/m); // empty before it opens
    const afterPeak = render$({ now: new Date(Date.UTC(2026, 6, 13, 12, 0)) });
    expect(afterPeak).toMatch(/^ {3}Peak {12}14:00  █{22}  18:00$/m); // full after it closes
    const weekendPeak = render$({ now: new Date(Date.UTC(2026, 6, 18, 7, 30)) });
    expect(weekendPeak).toMatch(/^ {3}Peak {12}14:00  ░{22}  18:00$/m); // no fill on a weekend
  });
});
