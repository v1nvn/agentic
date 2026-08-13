// Red/green test for the usage formatter, using the sample data pasted from
// a real blocked-hook output. Run: node bin/format.test.mjs

import { render } from './format.mjs';

const x_time = [
  '2026-07-16 09:00','2026-07-16 10:00','2026-07-16 11:00','2026-07-16 12:00',
  '2026-07-16 13:00','2026-07-16 14:00','2026-07-16 15:00','2026-07-16 16:00',
  '2026-07-16 17:00','2026-07-16 18:00','2026-07-16 19:00','2026-07-16 20:00',
  '2026-07-16 21:00','2026-07-16 22:00','2026-07-16 23:00','2026-07-17 00:00',
  '2026-07-17 01:00','2026-07-17 02:00','2026-07-17 03:00','2026-07-17 04:00',
  '2026-07-17 05:00','2026-07-17 06:00','2026-07-17 07:00','2026-07-17 08:00',
  '2026-07-17 09:00','2026-07-17 10:00','2026-07-17 11:00',
];

const tokensUsage = [
  6949458,19845601,12108819,21836589,20567143,31375419,22810589,21402132,
  0,0,13162969,149064442,6120451,0,0,0,0,0,0,0,0,0,0,0,215764,22928094,3177181,
];
const modelCallCount = [
  60,270,168,179,299,417,261,231,0,0,184,1262,56,0,0,0,0,0,0,0,0,0,0,0,2,312,47,
];

const model = {
  x_time,
  tokensUsage,
  modelCallCount,
  totalUsage: { totalModelCallCount: 3748, totalTokensUsage: 351564651 },
  modelSummaryList: [
    { modelName: 'GLM-5.2', totalTokens: 333572794, sortOrder: 1 },
    { modelName: 'GLM-4.7', totalTokens: 25808329, sortOrder: 2 },
  ],
};

const tool = {
  totalUsage: {
    totalNetworkSearchCount: 19,
    totalWebReadMcpCount: 8,
    totalZreadMcpCount: 0,
    totalSearchMcpCount: 27,
  },
};

const quota = {
  limits: [
    { type: 'MCP usage(1 Month)', percentage: 30, currentUsage: 308, totol: 1000,
      usageDetails: [
        { modelCode: 'search-prime', usage: 223 },
        { modelCode: 'web-reader', usage: 73 },
        { modelCode: 'zread', usage: 12 },
      ] },
    { type: 'Token usage(5 Hour)', percentage: 16 },
  ],
  level: 'pro',
};

// Fixed instants so peak-now rendering is deterministic regardless of when the
// test runs. NOW_OFF = Beijing 09:00 Mon (outside peak); NOW_IN = Beijing 15:30
// Mon (inside peak → 90 min elapsed, 150 min left).
const NOW_OFF = new Date(Date.UTC(2026, 6, 13, 1, 0));
const NOW_IN = new Date(Date.UTC(2026, 6, 13, 7, 30));

const out = render({ platform: 'ZAI', model, tool, quota, apiOffsetMin: 480, localOffsetMin: 480, now: NOW_OFF });
console.log(out);
console.log('\n──────── assertions ────────');

let failures = 0;
const assert = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

assert(out.includes('GLM Coding Plan · Pro'), 'header shows plan level');
assert(out.includes('351.6M tokens'), 'total tokens formatted as 351.6M');
assert(out.includes('3,748'), 'total calls with thousands separator');
assert(out.includes('42%'), 'peak share of total rounded to 42%');
assert(out.includes('Jul 16'), 'a date label rendered');
assert(out.includes('1,262 calls'), 'peak call count');
assert(out.includes('92.8%'), 'GLM-5.2 model-mix percentage');
assert(out.includes('7.2%'), 'GLM-4.7 model-mix percentage');
assert(out.includes('333.6M'), 'GLM-5.2 token total');
assert(out.includes('25.8M'), 'GLM-4.7 token total');
assert(out.includes('30%'), 'MCP monthly quota pct');
assert(out.includes('308M / 1,000M'), 'MCP usage counts');
assert(out.includes('16%'), '5h token quota pct');
assert(out.includes('19 searches'), 'tool call breakdown');
assert(out.includes('8 reads'), 'tool call breakdown');
assert(out.includes('web search 223'), 'friendly monthly MCP breakdown');
assert(out.includes('idle'), 'overnight idle collapse present');
assert(out.includes('◂ peak'), 'peak annotation present');
assert(out.includes('█'), 'a bar glyph rendered');
assert(out.includes('┤'), 'vertical chart y-axis tick at the max label');
assert(out.includes('149.1M ┤'), 'max tokens labeled on the y-axis');
assert(out.includes('└'), 'vertical chart baseline corner');
assert(out.includes('┬'), 'x-axis tick under a labeled hour');
assert(/[▁▂▃▄▅▆▇]/.test(out), 'fractional bar glyph for sub-row height');
assert(out.includes('Peak hrs'), 'peak-hours summary line present');
assert(out.includes('Mon–Fri 14:00–18:00'), 'peak billing window stated in local time');
assert(out.includes('3×'), '3× coefficient for GLM-5.2 noted');
assert(out.includes('3h active'), 'counts active hours inside the window');
assert(out.includes('75.6M'), 'tokens burned inside the peak window');
assert(out.includes('22%'), 'peak-window share of total tokens');
assert(out.includes('↑'), 'peak-window buckets marked in the chart');
assert(!out.includes('UTC+8'), 'no foreign timezone displayed');
assert(!out.includes('Peak now'), 'no live peak bar outside the window');
assert(!out.includes('**'), 'no markdown bold leaked into plain text');

// Beijing (UTC+8) → IST (UTC+5:30) conversion, deterministic regardless of host tz.
const ist = render({ platform: 'ZAI', model, tool, quota, apiOffsetMin: 480, localOffsetMin: 330, now: NOW_OFF });
assert(ist.includes('Jul 16 06:30'), 'first bucket Beijing 09:00 → IST 06:30');
assert(ist.includes('Jul 16 17:30'), 'peak Beijing 20:00 → IST 17:30');
assert(ist.includes('Jul 17 08:30'), 'last bucket Beijing 11:00 → IST 08:30');
assert(ist.includes('11:30–15:30'), 'peak window Beijing 14:00–18:00 → IST 11:30–15:30');

// Live peak-window bar in the Limits section — only when inside the window.
const inPeak = render({ platform: 'ZAI', model, tool, quota, apiOffsetMin: 480, localOffsetMin: 480, now: NOW_IN });
assert(inPeak.includes('Peak now'), 'limits shows the live peak bar inside the window');
assert(inPeak.includes('38%'), 'bar fill = elapsed share of the 4h window');
assert(inPeak.includes('2h 30m left'), 'time remaining in the peak window');

console.log('\n' + (failures === 0 ? 'PASS' : `FAIL (${failures})`));
process.exit(failures === 0 ? 0 : 1);
