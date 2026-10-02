// Char-class transition scoring for CSS identifiers, after readweb's measured
// price table: a class like `css-1a2b3c` or `content_1tsiE` is priced per
// adjacent char-class transition and normalized by length, and a compound token
// also fails if any delimiter-separated segment does — a stable stem must not
// carry a volatile build hash (`BoxStyles_commercial__Wo6Z4`).
export type CharClass = 'Digit' | 'Lower' | 'Other' | 'Symbol' | 'Upper';

export const GIBBERISH_THRESHOLD = 0.3;

const PRICE_TABLE: Partial<Record<`${CharClass}:${CharClass}`, number>> = {
  'Upper:Lower': 0.2,
  'Lower:Upper': 0.5,
  'Symbol:Upper': 0.4,
  'Symbol:Lower': 0.3,
  'Symbol:Digit': 0.9,
  'Upper:Digit': 1.4,
  'Lower:Digit': 1.3,
  'Digit:Upper': 1.4,
  'Digit:Lower': 1.5,
  'Digit:Symbol': 1.2,
  'Upper:Symbol': 0.2,
  'Lower:Symbol': 0.2,
  'Digit:Digit': 1.2,
  'Symbol:Symbol': 0.3,
  'Upper:Upper': 0.1,
  'Lower:Lower': 0.1,
  'Other:Other': 0.0,
};

function classifyChar(ch: string): CharClass {
  if (/[A-Z]/.test(ch)) {
    return 'Upper';
  }
  if (/[a-z]/.test(ch)) {
    return 'Lower';
  }
  if (/[0-9]/.test(ch)) {
    return 'Digit';
  }
  if (/[-_]/.test(ch)) {
    return 'Symbol';
  }
  return 'Other';
}

function transitionPrice(from: CharClass, to: CharClass): number {
  return PRICE_TABLE[`${from}:${to}`] ?? 1.0;
}

export function gibberishScore(value: string): number {
  if (value.length < 2) {
    return 0;
  }
  let absolute = 0;
  let previous: CharClass | null = null;
  for (const ch of value) {
    const current = classifyChar(ch);
    if (previous !== null) {
      absolute += transitionPrice(previous, current);
    }
    previous = current;
  }
  return absolute / Math.max(1, value.length - 1);
}

function exceedsThreshold(value: string): boolean {
  return value.length >= 4 && gibberishScore(value) >= GIBBERISH_THRESHOLD;
}

export function isGeneratedIdentifier(value: string): boolean {
  if (exceedsThreshold(value)) {
    return true;
  }
  return value.split(/[-_]/).some(segment => exceedsThreshold(segment));
}
