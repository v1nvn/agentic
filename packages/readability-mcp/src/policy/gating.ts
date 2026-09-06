export interface GatingSignal {
  readonly likely: boolean;
  readonly reason: string;
}

// Curated vendor/structural paywall selectors — intentionally NOT a greedy
// `[class*="subscribe"]` (that catches newsletter CTAs on clean articles and
// false-positives). Each entry names a known paywall surface.
const PAYWALL_SELECTORS = [
  '.piano',
  '#piano',
  '.tp-modal',
  '.tp-active',
  '[id*="piano"]',
  '[class*="piano"]',
  '[class*="subscribe-wall"]',
  '[id*="subscribe-wall"]',
  '[class*="metered-wall"]',
  '[id*="metered-wall"]',
  '.leaky-paywall',
] as const;

// Class/id substring hits are verdicts, not signals. Measured on real captures:
// Daily Mail free articles carry `<html class="… paywall-ineligible">` plus ~240
// `is-paywalled` / `is-paywall-processed` feed badges — state about other
// articles or processing markers, all matching `[class*="paywall"]`. Real
// surfaces name the wall as the head noun (WIRED's `paywall-modal`, the
// camel-cased `PaywallModalWrapper`).
const PAYWALL_ATTR_CANDIDATES = '[class*="paywall"], [id*="paywall"]';

const NEGATION_SEGMENTS = new Set([
  'bypass',
  'disabled',
  'exempt',
  'free',
  'ineligible',
  'no',
  'non',
  'not',
  'off',
  'optout',
  'without',
]);

function namesPaywallSurface(classAndId: string): boolean {
  for (const token of classAndId.split(/\s+/)) {
    const segments = token
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
    if (segments[0] !== 'paywall') {
      continue;
    }
    if (segments.some(segment => NEGATION_SEGMENTS.has(segment))) {
      continue;
    }
    return true;
  }
  return false;
}

// Phrases that essentially never appear on a fully-unlocked article. Bare
// "Subscribe" nav links / newsletter CTAs are intentionally excluded — they
// are ubiquitous and would mislead the host into discarding complete content.
const METERED_TEXT_RE =
  /(\d+)\s*(?:free\s*)?(?:articles?|stories?)\s*(?:left|remaining)|you\s+have\s+reached\s+(?:your\s+)?(?:free\s+)?(?:article\s+|story\s+)?limit|subscribe\s+to\s+(?:continue\s+)?reading|read\s+the\s+full\s+(?:article|story)|unlock\s+(?:this|full|all)\s+(?:article|story|content)|keep\s+reading\s+with/i;

function findPaywallOverlay(document: Document): GatingSignal | undefined {
  for (const el of document.querySelectorAll(PAYWALL_ATTR_CANDIDATES)) {
    const classAndId = `${el.getAttribute('class') ?? ''} ${el.getAttribute('id') ?? ''}`;
    if (el.isConnected && namesPaywallSurface(classAndId)) {
      return { likely: true, reason: 'paywall overlay' };
    }
  }
  for (const selector of PAYWALL_SELECTORS) {
    const el = document.querySelector(selector);
    if (el?.isConnected) {
      return { likely: true, reason: 'paywall overlay' };
    }
  }
  return undefined;
}

// One textContent read is cheaper than a per-element scan of a large doc and
// avoids ordering a query per selector. jsdom computes body.textContent once.
function findMeteredMessage(document: Document): GatingSignal | undefined {
  const text = document.body.textContent;
  if (METERED_TEXT_RE.test(text)) {
    return { likely: true, reason: 'metered paywall message' };
  }
  return undefined;
}

// Reads the DOM only — never fetches, authenticates, or mutates the document.
// Conservative by design: a false positive misleads the host into treating
// complete content as truncated, which is worse than a miss.
export function detectGating(document: Document): GatingSignal | undefined {
  return findPaywallOverlay(document) ?? findMeteredMessage(document);
}
