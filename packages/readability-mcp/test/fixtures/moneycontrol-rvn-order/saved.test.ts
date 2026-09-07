import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a short Moneycontrol market article:
// https://www.moneycontrol.com/news/business/markets/rail-vikas-nigam-shares-in-focus-on-order-win-worth-rs-903-crore-14023537.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.moneycontrol.com/news/business/markets/rail-vikas-nigam-shares-in-focus-on-order-win-worth-rs-903-crore-14023537.html';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'text' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

// Hunt negative for the debris class: a cluttered financial-news page (stock
// widget, video carousel, newsletter forms) whose article path lands the
// complete body and none of the furniture.
describe('market-article capture: heavy furniture around a short body', () => {
  it('extracts the complete article prose', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('trading with marginal gains in the opening trade');
    expect(structured.content).toContain('SJVN Thermal (STPL)');
    expect(structured.content).toContain('The order value is Rs 903 crore and is to be completed in 36 months');
  });

  it('leaves the page furniture out of the article', () => {
    const structured = extractFixture();
    expect(structured.content).not.toContain('Discover the secret world of unlisted shares');
    expect(structured.content).not.toContain('Day High');
    expect(structured.content).not.toContain('Subscribe to Tech Newsletters');
  });
});

// A captured page is composite: detection fires on the trending-topics rail rather than the
// page's main content — measured here so the false-positive guard can skip
// this fixture.
describe('composite capture: embedded furniture', () => {
  it('detects the list-shaped furniture when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBe(14);
    expect(result.containerSelector).toBe('ul');
  });
});
