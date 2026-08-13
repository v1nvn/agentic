/**
 * Plain-text usage report renderer.
 *
 * Rendered for a monospace terminal / hook-block `reason`, so it must NOT rely on
 * markdown (bold, tables, fenced code). Alignment comes from fixed-width columns
 * and unicode block glyphs. Input is the parsed `data` of the three ZAI/ZHIPU
 * monitor endpoints (model-usage, tool-usage, quota/limit — the last already
 * passed through processQuotaLimit).
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
// Lower-half block eighths for vertical bars (1/8 .. 7/8); a full cell uses '█'.
const VBLOCKS = '▁▂▃▄▅▆▇';

const W = 68; // overall rule width

// ---- tiny format helpers -------------------------------------------------

export function parseSlot(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s || '');
  if (!m) return null;
  return {
    h: +m[4],
    day: `${MONTHS[+m[2] - 1]} ${m[3]}`,
    time: `${m[4]}:${m[5]}`,
  };
}

/**
 * Re-express a naive "YYYY-MM-DD HH:MM" string from one UTC offset to another.
 * Offsets are minutes east of UTC (Beijing = 480, IST = 330). Pure — does not
 * depend on the runtime timezone, so it is deterministic under test.
 */
export function shiftSlot(s, fromOffsetMin, toOffsetMin) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - fromOffsetMin * 60000;
  const localMs = utcMs + toOffsetMin * 60000;
  const dt = new Date(localMs);
  return {
    h: dt.getUTCHours(),
    day: `${MONTHS[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, '0')}`,
    time: `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export function fmtTokens(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function padR(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padL(s, n) {
  s = String(s);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

/** Fixed-width bar field (width cols): █ blocks + an eighth-fraction + trailing spaces. */
export function barField(v, max, width) {
  if (!v || v <= 0 || max <= 0) return ' '.repeat(width);
  let scaled = (v / max) * width;
  let full = Math.floor(scaled);
  let fi = Math.round((scaled - full) * 8);
  if (fi === 8) { full += 1; fi = 0; }
  if (full === 0 && fi === 0) fi = 1; // keep a sliver for any nonzero value
  let s = '█'.repeat(Math.min(full, width));
  if (full < width && fi > 0) s += EIGHTHS[fi];
  if (s.length < width) s += ' '.repeat(width - s.length);
  return s.slice(0, width);
}

/** Filled/empty meter: █ for used, ░ for remaining. */
export function meter(pct, width) {
  let filled = Math.round(((pct || 0) / 100) * width);
  filled = Math.max(0, Math.min(width, filled));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Minutes → "2h 30m" / "2h" / "30m". */
export function fmtDur(mins) {
  mins = Math.max(0, Math.round(mins));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function friendlyTool(code) {
  switch ((code || '').toLowerCase()) {
    case 'search-prime': return 'web search';
    case 'web-reader': return 'web read';
    default: return code || 'other';
  }
}

// ---- idle-run detection --------------------------------------------------

function idleRuns(tok) {
  const runs = [];
  let i = 0;
  while (i < tok.length) {
    if ((+tok[i] || 0) === 0) {
      let j = i;
      while (j < tok.length && (+tok[j] || 0) === 0) j++;
      runs.push({ i, j: j - 1, len: j - i });
      i = j;
    } else {
      i++;
    }
  }
  return runs;
}

function idleLabel(run, x, slotFn = parseSlot) {
  const a = slotFn(x[run.i]);
  const b = slotFn(x[run.j]);
  if (!a || !b) return `idle (${run.len}h)`;
  const start = `${a.day} ${a.time}`;
  const end = a.day === b.day ? b.time : `${b.day} ${b.time}`;
  return `idle ${start} → ${end} (${run.len}h)`;
}

// ---- billing peak window -------------------------------------------------
// Per the usage-revision notice: Mon–Fri 14:00–18:00 Beijing (UTC+8) are peak
// hours, where GLM-5.2 / GLM-5-Turbo tokens are billed at a 3× coefficient
// (GLM-4.7 stays 1× all day). A bucket labelled "HH:00" spans HH:00–HH+1, so
// the peak buckets are HH ∈ {14,15,16,17} on a weekday.

export function isPeakBucket(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):/.exec(s || '');
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4];
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  return wd >= 1 && wd <= 5 && h >= 14 && h <= 17;
}

/** Local-time label for the 14:00–18:00 Beijing peak window (e.g. "11:30–15:30"). */
function localPeakWindow(apiOffsetMin, toOffsetMin) {
  const a = shiftSlot('2000-01-03 14:00', apiOffsetMin, toOffsetMin);
  const b = shiftSlot('2000-01-03 18:00', apiOffsetMin, toOffsetMin);
  if (!a || !b) return null;
  return `${a.time}–${b.time}`;
}

// ---- vertical hourly chart ----------------------------------------------

/**
 * Vertical bar chart of hourly tokens. Returns an array of plain-text lines
 * (without the section header), or null if there are fewer than 2 buckets.
 *
 * Bars are scaled to `maxTok` across `ROWS` rows; the topmost filled cell of a
 * bar uses a fractional lower-block glyph (▁▂▃▄▅▆▇) for sub-row height. The
 * y-axis labels only the peak (top) and 0 (baseline); the header window and the
 * caller's peak annotation carry the exact values. `slotFn` is the
 * timezone-converted slot parser (convertSlot) so hour/day labels are local.
 */
function hourlyVerticalChart({ x, tok, nh, maxTok, peakIdx, slotFn }) {
  const ROWS = 6;                 // bar rows above the baseline
  if (nh < 2 || maxTok <= 0) return null;

  const lines = [];
  const maxLab = fmtTokens(maxTok);
  const L = maxLab.length;
  const IND = 1;                  // leading indent
  const AXIS = IND + L + 1;       // axis spine col (1-space gap after the label)
  const P0 = AXIS + 2;            // first bar column (axis + 1-char gap)
  const PW = W - P0;              // columns available for bars + gaps
  const slot = Math.max(1, Math.floor(PW / nh));
  const barW = slot >= 2 ? slot - 1 : 1;
  const barLeft = (i) => P0 + i * slot;
  const barCenter = (i) => barLeft(i) + Math.floor(barW / 2);
  const usedCols = nh * slot;
  const blank = () => Array(W).fill(' ');

  // bar glyph for hour i at row r (0 = bottom bar-row, ROWS-1 = top)
  const glyph = (i, r) => {
    const v = +tok[i] || 0;
    if (v <= 0) return ' ';
    const fill = (v / maxTok) * ROWS - r;   // how much of row r the bar covers
    if (fill >= 1) return '█';
    if (fill > 0) {
      let e = Math.round(fill * 8);          // 1..7 eighths
      if (e < 1) e = 1;
      if (e > 7) e = 7;
      return VBLOCKS[e - 1];
    }
    return ' ';
  };

  // bar rows, top → bottom; top row carries the max label + '┤', rest are '│'
  for (let r = ROWS - 1; r >= 0; r--) {
    const line = blank();
    line[AXIS] = (r === ROWS - 1) ? '┤' : '│';
    if (r === ROWS - 1) {
      for (let k = 0; k < L; k++) line[AXIS - 1 - L + k] = maxLab[k];
    }
    for (let i = 0; i < nh; i++) {
      const g = glyph(i, r);
      if (g !== ' ') for (let c = 0; c < barW; c++) line[barLeft(i) + c] = g;
    }
    lines.push(line.join('').trimEnd());
  }

  // x-axis ticks: first, last, and every bucket landing on a 6h boundary (local)
  const slotOf = (i) => slotFn(x[i]);
  const isTick = (i) => {
    if (i === 0 || i === nh - 1) return true;
    const s = slotOf(i);
    return !!s && s.h % 6 === 0;
  };

  // baseline: '0' label + corner '└' + '─' run, with '┬' under each tick
  const base = blank();
  base[AXIS - 2] = '0';
  base[AXIS] = '└';
  for (let c = AXIS + 1; c < P0 + usedCols; c++) base[c] = '─';
  for (let i = 0; i < nh; i++) if (isTick(i)) base[barCenter(i)] = '┬';
  lines.push(base.join('').trimEnd());

  // hour labels under ticks (skip if too close to the previous label)
  const hr = blank();
  let last = -10;
  for (let i = 0; i < nh; i++) {
    if (!isTick(i)) continue;
    const col = barCenter(i);
    if (col - last < 3) continue;
    const s = slotOf(i);
    const txt = s ? String(s.h).padStart(2, '0') : '  ';
    hr[col] = txt[0];
    hr[col + 1] = txt[1];
    last = col;
  }
  lines.push(hr.join('').trimEnd());

  // day labels under the first tick of each new local day
  const day = blank();
  let lastDay = null;
  last = -10;
  for (let i = 0; i < nh; i++) {
    if (!isTick(i)) continue;
    const s = slotOf(i);
    if (!s || s.day === lastDay) continue;
    const col = barCenter(i);
    if (col - last >= s.day.length && col + s.day.length <= W) {
      for (let k = 0; k < s.day.length; k++) day[col + k] = s.day[k];
      lastDay = s.day;
      last = col + s.day.length;
    }
  }
  if (day.some((c) => c !== ' ')) lines.push(day.join('').trimEnd());

  // peak-window (↑) and peak (◂) markers under bar centers
  const mark = blank();
  for (let i = 0; i < nh; i++) if (isPeakBucket(x[i])) mark[barCenter(i)] = '↑';
  if (peakIdx >= 0) mark[barCenter(peakIdx)] = '◂';
  if (mark.some((c) => c !== ' ')) lines.push(mark.join('').trimEnd());

  return lines;
}

// ---- main render ---------------------------------------------------------

export function render({ platform, model, tool, quota, apiOffsetMin = 480, localOffsetMin, now = new Date() } = {}) {
  const out = [];
  const rule = () => '─'.repeat(W);

  // The monitor API labels every bucket in Beijing time (UTC+8). Shift each
  // timestamp to the caller's offset (minutes east of UTC) for display.
  // Defaults to the JS runtime's local zone.
  const toOffset = localOffsetMin != null ? localOffsetMin : -new Date().getTimezoneOffset();
  const convertSlot = (s) => shiftSlot(s, apiOffsetMin, toOffset) || parseSlot(s);

  const x = (model && model.x_time) || [];
  const tok = (model && model.tokensUsage) || [];
  const calls = (model && model.modelCallCount) || [];
  const nh = x.length;

  const tu = (model && model.totalUsage) || {};
  const total = tu.totalTokensUsage != null
    ? tu.totalTokensUsage
    : tok.reduce((a, b) => a + (+b || 0), 0);
  const totalCalls = tu.totalModelCallCount != null
    ? tu.totalModelCallCount
    : calls.reduce((a, b) => a + (+b || 0), 0);

  // peak hour
  let peakIdx = -1;
  let peakTok = 0;
  for (let i = 0; i < tok.length; i++) {
    if ((+tok[i] || 0) > peakTok) { peakTok = +tok[i]; peakIdx = i; }
  }
  const peakCalls = peakIdx >= 0 ? (+calls[peakIdx] || 0) : 0;
  const pctPeak = total > 0 ? (peakTok / total) * 100 : 0;
  const peakSlot = peakIdx >= 0 ? convertSlot(x[peakIdx]) : null;

  const level = quota && quota.level
    ? quota.level.charAt(0).toUpperCase() + quota.level.slice(1)
    : '';

  // ---- header ----
  const left = ` GLM Coding Plan${level ? ' · ' + level : ''}`;
  const firstSlot = convertSlot(x[0]);
  const lastSlot = convertSlot(x[nh - 1]);
  const win = (firstSlot && lastSlot)
    ? `${firstSlot.day} ${firstSlot.time} → ${lastSlot.day} ${lastSlot.time} · ${nh}h`
    : (platform || '');
  out.push(rule());
  out.push(left + padL(win, W - left.length));
  out.push(rule());

  // ---- lead ----
  let lead = ` ${fmtTokens(total)} tokens across ${fmtNum(totalCalls)} model calls`;
  if (peakIdx >= 0 && peakSlot) {
    lead += ` — ${Math.round(pctPeak)}% of it in a single hour (${peakSlot.day} ${peakSlot.time}, ${fmtTokens(peakTok)} tokens / ${fmtNum(peakCalls)} calls)`;
  }
  lead += '.';
  out.push('');
  out.push(lead);

  // ---- stat block ----
  const activeHours = tok.filter((t) => +t > 0).length;
  const longest = idleRuns(tok).filter((r) => r.len >= 2)
    .sort((a, b) => b.len - a.len)[0];
  const tt = (tool && tool.totalUsage) || {};
  const searchN = tt.totalNetworkSearchCount || 0;
  const readN = tt.totalWebReadMcpCount || 0;
  const zreadN = tt.totalZreadMcpCount || 0;
  const toolTotal = tt.totalSearchMcpCount != null
    ? tt.totalSearchMcpCount
    : searchN + readN + zreadN;

  // how much of the window's usage fell inside the 3× billing peak hours
  let peakWinActive = 0;
  let peakWinTokens = 0;
  for (let k = 0; k < nh; k++) {
    if (isPeakBucket(x[k]) && (+tok[k] || 0) > 0) {
      peakWinActive++;
      peakWinTokens += +tok[k];
    }
  }
  const peakWinPct = total > 0 ? (peakWinTokens / total) * 100 : 0;
  const winLabel = localPeakWindow(apiOffsetMin, toOffset);

  out.push('');
  out.push(` Peak     ${padR(peakSlot ? peakSlot.day + ' ' + peakSlot.time : '—', 15)}${padL(fmtTokens(peakTok), 7)} tokens · ${padL(fmtNum(peakCalls), 5)} calls`);
  out.push(` Active   ${padR(activeHours + ' / ' + nh + ' hours', 15)}${longest ? idleLabel(longest, x, convertSlot) : 'no idle gaps'}`);
  out.push(` Tools    ${padR(toolTotal + ' calls', 15)}${searchN} searches · ${readN} reads${zreadN ? ' · ' + zreadN + ' zread' : ''}`);
  if (winLabel) {
    out.push(` Peak hrs Mon–Fri ${winLabel} · GLM-5.2 3× · ${peakWinActive}h active · ${fmtTokens(peakWinTokens)} (${Math.round(peakWinPct)}%)`);
  }

  // ---- hourly chart (vertical bars) ----
  out.push('');
  const chartHdr = ' Hourly tokens · ↑ peak hour ';
  out.push(chartHdr + '─'.repeat(Math.max(0, W - chartHdr.length)));
  const maxTok = peakTok || 1;
  const chartLines = hourlyVerticalChart({ x, tok, nh, maxTok, peakIdx, slotFn: convertSlot });
  if (chartLines) {
    out.push(...chartLines);
    if (peakIdx >= 0 && peakSlot) {
      out.push(`   ◂ peak  ${peakSlot.day} ${peakSlot.time}  ${fmtTokens(peakTok)} tokens · ${fmtNum(peakCalls)} calls`);
    }
  } else {
    out.push('   (not enough hourly data to chart)');
  }

  // ---- model mix ----
  out.push('');
  out.push(' Model mix ' + '─'.repeat(Math.max(0, W - 11)));
  const mixSrc = (model && (model.modelSummaryList || model.modelDataList)) || [];
  const denom = mixSrc.reduce((a, m) => a + (+m.totalTokens || 0), 0) || 1;
  const mixSorted = [...mixSrc].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  for (const m of mixSorted) {
    const pct = (+m.totalTokens || 0) / denom * 100;
    out.push(`   ${padR(m.modelName || '?', 11)}${padL(fmtTokens(m.totalTokens), 8)}  ${padL(pct.toFixed(1) + '%', 6)}  ${barField(pct, 100, 20)}`);
  }

  // ---- limits ----
  out.push('');
  out.push(' Limits ' + '─'.repeat(Math.max(0, W - 8)));

  // Live peak-window status. The window is defined in Beijing (apiOffsetMin)
  // wall-clock; "time left" is a duration, so it needs no timezone for display.
  const bj = new Date(now.getTime() + apiOffsetMin * 60000);
  const bjDay = bj.getUTCDay();
  const peakElapsedMin = (bj.getUTCHours() - 14) * 60 + bj.getUTCMinutes();
  const inPeakNow = bjDay >= 1 && bjDay <= 5 && peakElapsedMin >= 0 && peakElapsedMin < 240;
  if (inPeakNow) {
    const pctElapsed = Math.round((peakElapsedMin / 240) * 100);
    out.push(`   ${padR('Peak now', 17)}${padL(pctElapsed + '%', 4)}  ${meter(pctElapsed, 22)}  ${fmtDur(240 - peakElapsedMin)} left`);
  }

  const limits = (quota && quota.limits) || [];
  const mcp = limits.find((l) => /mcp/i.test(l.type || ''));
  const tok5 = limits.find((l) => /token/i.test(l.type || ''));
  if (tok5) {
    const reset = new Date(tok5.nextResetTime).toLocaleTimeString("en-IN")
    out.push(`   ${padR('Tokens · 5h', 17)}${padL((tok5.percentage || 0) + '%', 4)}  ${meter(tok5.percentage, 22)}  ${reset}`);
  }
  
  if (tok5 && mcp) {
    out.push('')
  }

  if (mcp) {
    const reset = new Date(mcp.nextResetTime).toLocaleString("en-IN")
    out.push(`   ${padR('MCP · this month', 17)}${padL((mcp.percentage || 0) + '%', 4)}  ${meter(mcp.percentage, 22)}  ${reset}`);
    const det = mcp.usageDetails || [];
    const parts = det.map((d) => `${friendlyTool(d.modelCode)} ${fmtNum(d.usage)}`).join('  ');
    if (parts) out.push(`   ${fmtNum(mcp.currentUsage)}M / ${fmtNum(mcp.totol)}M · ${parts}`);
  }

  out.push('');
  out.push(rule());
  return out.join('\n');
}
