/**
 * Plain-text rendering primitives shared by the zai and tokens report renderers.
 *
 * Output targets a monospace terminal / hook-block `reason`, so everything here
 * is fixed-width: padding, block-glyph bars, and compact number formatting.
 * Canonical copy — plugins/<name>/bin/text-format.mjs are synced verbatim
 * (CI enforces it via .github/workflows/build.yml).
 */

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

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

export function padR(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

export function padL(s, n) {
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
