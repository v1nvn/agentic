/**
 * The report line model and fixed-width primitives. Output targets a
 * monospace terminal — the pane — so everything here is fixed-width:
 * ink-tagged segments, padding, block-glyph bars, and compact number
 * formatting.
 */

export interface Segment {
  ink?: 'bold' | 'dim';
  text: string;
}

export type Line = Segment[];

export function plain(text: string): Segment {
  return { text };
}
export function dim(text: string): Segment {
  return { text, ink: 'dim' };
}
export function bold(text: string): Segment {
  return { text, ink: 'bold' };
}

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

export const RULE_WIDTH = 68;

export function rule(): string {
  return '─'.repeat(RULE_WIDTH);
}

/** '2026-08-15' → 'Aug 15'. */
export function dayLabel(day: string): string {
  const [, , month, date] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day) ?? [];
  return month !== undefined && date !== undefined
    ? `${MONTHS[+month - 1] ?? day} ${date}`
    : day;
}

export function fmtClock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-time `YYYY-MM-DD` key. */
export function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fmtTokens(n: null | number | undefined): string {
  if (n == null || Number.isNaN(n)) {
    return '—';
  }
  if (n >= 1e9) {
    return (n / 1e9).toFixed(1) + 'B';
  }
  if (n >= 1e6) {
    return (n / 1e6).toFixed(1) + 'M';
  }
  if (n >= 1e3) {
    return (n / 1e3).toFixed(1) + 'K';
  }
  return String(n);
}

export function fmtNum(n: null | number | undefined): string {
  return (n || 0).toLocaleString('en-US');
}

export function padR(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

export function padL(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

/** Fixed-width bar field (width cols): █ blocks + an eighth-fraction + trailing spaces. */
export function barField(v: number, max: number, width: number): string {
  if (!v || v <= 0 || max <= 0) {
    return ' '.repeat(width);
  }
  const scaled = (v / max) * width;
  let full = Math.floor(scaled);
  let fi = Math.round((scaled - full) * 8);
  if (fi === 8) {
    full += 1;
    fi = 0;
  }
  if (full === 0 && fi === 0) {
    fi = 1;
  } // keep a sliver for any nonzero value
  let s = '█'.repeat(Math.min(full, width));
  if (full < width && fi > 0) {
    s += EIGHTHS[fi] ?? '';
  }
  if (s.length < width) {
    s += ' '.repeat(width - s.length);
  }
  return s.slice(0, width);
}

/** Filled/empty meter: █ for used, ░ for remaining. */
export function meter(pct: number | undefined, width: number): string {
  let filled = Math.round(((pct || 0) / 100) * width);
  filled = Math.max(0, Math.min(width, filled));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function renderLines(lines: readonly Line[]): string {
  return lines.map(line => line.map(seg => seg.text).join('')).join('\n');
}
