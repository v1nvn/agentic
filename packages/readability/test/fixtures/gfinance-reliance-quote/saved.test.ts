import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a client-rendered quote page (post-JS browser
// render — the static HTML is a shell):
// https://www.google.com/finance/quote/RELIANCE:NSE
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl = 'https://www.google.com/finance/quote/RELIANCE:NSE';

function extractFixture(selectors?: { include: string }): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({
    html,
    baseUrl: pageUrl,
    format: 'text',
    ...(selectors ? { selectors } : {}),
  });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('quote-shell capture: rendered data in a widget, not an article', () => {
  it('loses the quote card on the article path, keeping a sector-table fragment', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.readerable).toBe(false);
    expect(structured.metadata.wordCount).toBeLessThan(50);
    expect(structured.content).not.toContain('Reliance Industries');
    expect(structured.content).not.toMatch(/1,3\d\d\.\d\d/);
  });

  // Scoping to <main> recovers the name and some quote fields but not the
  // quote card as a unit (Mkt Cap still missing).
  it('recovers the name only partially when scoped to main', () => {
    const structured = extractFixture({ include: 'main' });
    expect(structured.content).toContain('Reliance Industries');
    expect(structured.content).not.toContain('Mkt Cap');
  });
});

// A captured page is composite: detection fires on the sector-index table rows rather than the
// page's main content — measured here so the false-positive guard can skip
// this fixture.
describe('composite capture: embedded furniture', () => {
  it('detects the list-shaped furniture when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBe(12);
    expect(result.containerSelector).toBe('tbody');
  });
});
