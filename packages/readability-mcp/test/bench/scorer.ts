import type { TraceStage } from '../../src/pipeline/context.js';
import { buildDocument } from '../../src/pipeline/dom.js';
import { normalizeDocument, resolveLazyImages } from '../../src/pipeline/normalize.js';
import { addPreset, resetPresets, type SitePreset } from '../../src/policy/presets.js';
import { lintSelectorText } from '../../src/policy/selector-lint.js';
import { buildChainOutline, OUTLINE_MAX_CHARS } from '../../src/policy/outline-chains.js';
import { extractArticleFromHtml } from '../../src/tools/extract.js';
import type { StructuredContent } from '../../src/tools/output-schema.js';

export interface PrecisionRecall {
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
}

export interface FixtureScore extends PrecisionRecall {
  readonly extractedText: string;
  readonly extractedTokens: number;
  readonly labeledText: string;
  readonly labeledTokens: number;
  readonly trace: readonly TraceStage[];
}

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of text.toLowerCase().matchAll(TOKEN_PATTERN)) {
    const token = match[0];
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

export function tokenTotal(map: Map<string, number>): number {
  let total = 0;
  for (const count of map.values()) total += count;
  return total;
}

export function overlap(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let shared = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [token, count] of small) {
    const other = large.get(token);
    if (other !== undefined) {
      shared += Math.min(count, other);
    }
  }
  return shared;
}

// NaN propagates when either side has no word tokens (e.g. the `fallback`
// image-only gallery); callers exclude NaN scores from macro-averages.
export function scorePrecisionRecall(
  extracted: string,
  labeled: string,
): PrecisionRecall {
  const ext = tokenize(extracted);
  const lbl = tokenize(labeled);
  if (ext.size === 0 || lbl.size === 0) {
    return { precision: NaN, recall: NaN, f1: NaN };
  }
  const shared = overlap(ext, lbl);
  const precision = shared / tokenTotal(ext);
  const recall = shared / tokenTotal(lbl);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { f1, precision, recall };
}

export function scoreFixture(
  html: string,
  url: string,
  selector: string,
): FixtureScore {
  const labeledElement = buildDocument(html, url).document.querySelector(selector);
  if (!labeledElement) {
    throw new Error(`main-content selector did not resolve: ${selector}`);
  }
  const labeledText = labeledElement.textContent ?? '';
  const result = extractArticleFromHtml({ debug: true, format: 'text', html, baseUrl: url });
  const first = result.content[0];
  const extractedText = first && 'text' in first ? first.text : '';
  const trace =
    (result.structuredContent as StructuredContent).diagnostics.trace ?? [];
  const extTokens = tokenize(extractedText);
  const lblTokens = tokenize(labeledText);
  const { f1, precision, recall } = scorePrecisionRecall(extractedText, labeledText);
  return {
    extractedText,
    extractedTokens: tokenTotal(extTokens),
    f1,
    labeledText,
    labeledTokens: tokenTotal(lblTokens),
    precision,
    recall,
    trace,
  };
}

// The reset runs in finally because the store is process-global and scoreFixture
// throws when a label selector does not resolve.
export function scoreFixtureWithPreset(
  html: string,
  url: string,
  selector: string,
  preset: SitePreset,
): FixtureScore {
  addPreset(preset);
  try {
    return scoreFixture(html, url, selector);
  } finally {
    resetPresets();
  }
}

// Replays a recorded suggest-loop outcome through the loop's full path, not
// just the apply: every selector must pass the static lint, the preset must
// satisfy the runtime match contract on THIS fixture, and the round-one
// material must have been within budget. Excludes are checked parse-only, as
// presetMatches does at runtime — a preset's excludes name debris that other
// pages of the site may not carry, which is not staleness. (The stricter
// propose-time "must match" rule lives in the live loop, where a proposal
// names debris on the page it was proposed from.)
export function scoreFixtureWithSuggest(
  html: string,
  url: string,
  selector: string,
  preset: SitePreset,
): FixtureScore {
  const { document } = buildDocument(html, url);
  normalizeDocument(document, { cleanChrome: true });
  resolveLazyImages(document);
  const problems: string[] = [];
  const selectors = [...preset.detectors, ...(preset.scope.include ? [preset.scope.include] : []), ...(preset.scope.exclude ?? [])];
  for (const candidate of selectors) {
    const violation = lintSelectorText(candidate);
    if (violation) {
      problems.push(`${violation.kind}: ${candidate}`);
    }
  }
  for (const detector of preset.detectors) {
    if (document.querySelectorAll(detector).length === 0) {
      problems.push(`no-match detector: ${detector}`);
    }
  }
  if (preset.scope.include && document.body.querySelector(preset.scope.include) === null) {
    problems.push(`no-match include: ${preset.scope.include}`);
  }
  for (const candidate of preset.scope.exclude ?? []) {
    try {
      document.querySelectorAll(candidate);
    } catch {
      problems.push(`unparseable exclude: ${candidate}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`recorded proposal is not a valid preset here: ${problems.join('; ')}`);
  }
  const outline = buildChainOutline({ baseUrl: url, cleanChrome: true, html, mode: 'page' });
  if (outline.text.length > OUTLINE_MAX_CHARS) {
    throw new Error(`round-one material exceeds the budget: ${outline.text.length} chars`);
  }
  return scoreFixtureWithPreset(html, url, selector, preset);
}
