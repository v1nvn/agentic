// The bash renderers format numbers with awk printf ("%.1fk", n/1000,
// "$%.2f", c), which rounds the value's exact IEEE bits to even at a decimal
// tie. toFixed rounds ties away from zero — 1250 prints "1.2k" here, "1.3k"
// there — so fmtFixed is the one door for printf-style decimal formatting,
// and the rounding is done on the double's exact bits, never in floating
// arithmetic.

const TEN = 10n;

function exactParts(ax: number): { exp: number; mant: bigint } {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, ax);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const biased = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (biased === 0) {
    return { exp: -1074, mant: frac };
  }
  return { exp: biased - 1075, mant: frac | (1n << 52n) };
}

// ax * 10^d rounded to an integer, ties to even.
function roundScaled(ax: number, d: number): bigint {
  const { exp, mant } = exactParts(ax);
  const pow10 = TEN ** BigInt(d);
  const num = exp >= 0 ? (mant << BigInt(exp)) * pow10 : mant * pow10;
  const den = exp >= 0 ? 1n : 1n << BigInt(-exp);
  const q = num / den;
  const twice = (num % den) * 2n;
  if (twice > den || (twice === den && q % 2n === 1n)) {
    return q + 1n;
  }
  return q;
}

export function fmtFixed(x: number, d: number): string {
  const q = roundScaled(Math.abs(x), d);
  const sign = x < 0 && q !== 0n ? '-' : '';
  const digits = q.toString();
  if (d === 0) {
    return `${sign}${digits}`;
  }
  const intPart = digits.length <= d ? '0' : digits.slice(0, digits.length - d);
  const fracPart = digits.padStart(d + 1, '0').slice(-d);
  return `${sign}${intPart}.${fracPart}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (minutes < 1440) {
    return `${Math.trunc(minutes / 60)}h${pad2(minutes % 60)}m`;
  }
  return `${Math.trunc(minutes / 1440)}d${pad2(Math.trunc(minutes / 60) % 24)}h`;
}

export function fmtK(n: number, d: number): string {
  return `${fmtFixed(n / 1000, d)}k`;
}

export function fmtM(n: number): string {
  return `${fmtFixed(n / 1_000_000, 0)}M`;
}
