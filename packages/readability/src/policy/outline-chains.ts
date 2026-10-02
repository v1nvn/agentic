import type { SelectorScope } from '../pipeline/normalize.js';

import { buildDocument } from '../pipeline/dom.js';
import {
  applySelectors,
  normalizeDocument,
  resolveLazyImages,
} from '../pipeline/normalize.js';
import { isGeneratedIdentifier } from './identifiers.js';

// Step-0 measured thresholds: 200 own chars is the chain view that produced a
// working proposal at ~630 tokens, and the debris that view misses (video
// controls, captions) holds under 200 own chars — the round-two sweep runs at
// 40 to surface it.
export const OUTLINE_OWN_TEXT_MIN = 200;
export const BLOCK_OWN_TEXT_MIN = 40;
export const OUTLINE_MAX_CHARS = 6000;
export const OUTLINE_MAX_CHAINS = 60;
const SAMPLE_MAX_CHARS = 80;

const NON_CONTENT_SELECTOR = 'script, style, noscript, template';

const HOP_ATTRIBUTE_WHITELIST = ['itemprop', 'role', 'data-testid'] as const;

export interface OutlineResult {
  readonly chainCount: number;
  readonly text: string;
  readonly truncated: boolean;
}

export interface OutlineInput {
  readonly baseUrl?: string;
  readonly cleanChrome: boolean;
  readonly html: string;
  // `page` renders the round-one view of the whole normalized document; a
  // scope renders the round-two view of the included subtree after the scope
  // has been applied for real.
  readonly mode: 'page' | { readonly scope: SelectorScope };
}

interface Candidate {
  readonly element: Element;
  readonly own: number;
}

// The document the outline renders is normalized exactly as extraction
// normalizes it, so a selector proposed from this material validates and
// applies against the same tree the pipeline will run it on.
export function buildChainOutline(input: OutlineInput): OutlineResult {
  const { document } = buildDocument(input.html, input.baseUrl);
  normalizeDocument(document, { cleanChrome: input.cleanChrome });
  resolveLazyImages(document);
  const scope = input.mode === 'page' ? undefined : input.mode.scope;
  if (scope) {
    applySelectors(document, scope);
  }
  const scopeRoot = scope?.include
    ? (document.body.querySelector(scope.include) ?? undefined)
    : undefined;

  const min = scope ? BLOCK_OWN_TEXT_MIN : OUTLINE_OWN_TEXT_MIN;
  const candidates: Candidate[] = [];
  for (const element of (scopeRoot ?? document.body).querySelectorAll('*')) {
    if (element.closest(NON_CONTENT_SELECTOR)) {
      continue;
    }
    const own = ownTextLength(element);
    if (own >= min) {
      candidates.push({ element, own });
    }
  }

  return scope
    ? groupedOutline(candidates, scopeRoot)
    : flatOutline(candidates);
}

// Round one: one full ancestor chain per qualifying node, step-0 format.
function flatOutline(candidates: Candidate[]): OutlineResult {
  const lines: string[] = [];
  let truncated = false;
  for (const candidate of [...candidates].sort((a, b) => b.own - a.own)) {
    if (lines.length >= OUTLINE_MAX_CHAINS) {
      truncated = true;
      break;
    }
    const hops = ancestorsUpTo(candidate.element, undefined).map(element =>
      hopWithSizes(element),
    );
    const line = hops.join(' > ');
    if (lines.join('\n---\n').length + line.length > OUTLINE_MAX_CHARS) {
      truncated = true;
      break;
    }
    lines.push(line);
  }
  return { chainCount: lines.length, text: lines.join('\n---\n'), truncated };
}

// Round two: the included subtree's remaining text blocks, grouped by
// structural chain so dozens of prose paragraphs collapse into one line and
// the odd control-text/caption container stands alone. Smallest own text
// first — that is where the debris lives.
function groupedOutline(
  candidates: Candidate[],
  scopeRoot: Element | undefined,
): OutlineResult {
  const groups = new Map<
    string,
    { chain: string; count: number; max: number; min: number; sample: string }
  >();
  for (const candidate of candidates) {
    const chain = ancestorsUpTo(candidate.element, scopeRoot).map(element =>
      renderHop(element),
    );
    if (scopeRoot) {
      chain.push(renderHop(scopeRoot));
    }
    const key = chain.join(' > ');
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.min = Math.min(existing.min, candidate.own);
      existing.max = Math.max(existing.max, candidate.own);
    } else {
      groups.set(key, {
        chain: key,
        count: 1,
        min: candidate.own,
        max: candidate.own,
        sample: sampleText(candidate.element),
      });
    }
  }

  const lines: string[] = [];
  let truncated = false;
  const sorted = [...groups.values()].sort((a, b) => a.min - b.min);
  for (const group of sorted) {
    if (lines.length >= OUTLINE_MAX_CHAINS) {
      truncated = true;
      break;
    }
    const line = `${group.chain} (own:${group.min}..${group.max}, ×${group.count}) sample: "${group.sample}"`;
    if (lines.join('\n').length + line.length > OUTLINE_MAX_CHARS) {
      truncated = true;
      break;
    }
    lines.push(line);
  }
  return { chainCount: lines.length, text: lines.join('\n'), truncated };
}

// Nearest-to-leaf first; the walk stops below <body> (the root applySelectors
// never matches) and below the include root when one is given — the caller
// prepends that root's own hop where it is wanted.
function ancestorsUpTo(element: Element, stop: Element | undefined): Element[] {
  const hops: Element[] = [];
  let node: Element | null = element;
  const body = element.ownerDocument.body;
  while (node && node !== stop && node !== body) {
    hops.push(node);
    node = node.parentElement;
  }
  return hops;
}

function hopWithSizes(element: Element): string {
  const own = ownTextLength(element);
  const all = element.textContent.length;
  return `${renderHop(element)} (own:${own}, all:${all})`;
}

function ownTextLength(element: Element): number {
  let own = 0;
  for (const node of element.childNodes) {
    if (node.nodeType === node.TEXT_NODE) {
      own += (node.textContent ?? '').length;
    }
  }
  return own;
}

// Copy-safety: what renders here is what the suggester may type back. Every
// token is real CSS — real attribute names and values, and classes/ids that
// survive the generated-identifier lint, so a hash class can never be copied
// into a proposal because it was never shown.
function renderHop(element: Element): string {
  let hop = element.tagName.toLowerCase();
  const id = element.id;
  if (id && !isGeneratedIdentifier(id)) {
    hop += `#${id}`;
  }
  const classes = (element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .filter(className => !isGeneratedIdentifier(className));
  if (classes.length > 0) {
    hop += `.${classes.join('.')}`;
  }
  for (const attribute of HOP_ATTRIBUTE_WHITELIST) {
    const value = element.getAttribute(attribute);
    if (value) {
      hop += `[${attribute}="${value}"]`;
    }
  }
  return hop;
}

function sampleText(element: Element): string {
  const text = element.textContent.trim().replace(/\s+/g, ' ');
  return text.length > SAMPLE_MAX_CHARS
    ? `${text.slice(0, SAMPLE_MAX_CHARS)}…`
    : text;
}
