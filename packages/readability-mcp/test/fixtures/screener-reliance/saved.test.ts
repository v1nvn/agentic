import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import { extractTablesFromHtml } from '../../../src/tools/extract_tables.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a screener.in company page (fundamentals tables):
// https://www.screener.in/company/RELIANCE/consolidated/
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl = 'https://www.screener.in/company/RELIANCE/consolidated/';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'markdown' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('fundamentals capture: table-heavy company page', () => {
  it('extracts the page with every financial table as GFM', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('| 1309.50 | 23.71 |');
    expect(structured.content).toContain('| Operating Profit | 38,093 |');
    expect(structured.content).toContain('| Equity Capital | 2,943 |');
    expect(structured.content).toContain('| Net Cash Flow | \\-21,888 |');
  });

  // Row labels live inside <button class="button-plain"> elements; Readability
  // strips every button document-wide, so those rows keep their numbers and
  // lose their names. extract_tables (no Readability) labels the same rows.
  it('loses the button-wrapped row labels on the article path', () => {
    const structured = extractFixture();
    expect(structured.content).toContain('|  | 207,559 |');
    expect(structured.content).toContain('|  | 169,466 |');
    expect(structured.content).toContain('|  | 168,251 |');
    expect(structured.content).not.toContain('| Sales |');
    expect(structured.content).not.toContain('| Expenses |');
    expect(structured.content).not.toContain('| Borrowings |');
  });

  it('labels every row through the table walk', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const result = extractTablesFromHtml({
      baseUrl: pageUrl,
      format: 'json',
      html,
      selectors: { include: '#quarters' },
    });
    const structured = result.structuredContent as { tables: { markdown: string }[] };
    const rows = JSON.parse(structured.tables[0].markdown) as { column_0?: string }[];
    const labels = rows.map(row => row.column_0);
    expect(labels).toContain('Sales +');
    expect(labels).toContain('Expenses +');
    expect(labels).toContain('Net Profit +');
  });
});

// A captured page is composite: detection fires on the documents lists (announcements, annual reports, credit ratings) rather than the
// page's main content — measured here so the false-positive guard can skip
// this fixture.
describe('composite capture: embedded furniture', () => {
  it('detects the list-shaped furniture when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBe(15);
    expect(result.containerSelector).toBe('ul.list-links');
  });
});
