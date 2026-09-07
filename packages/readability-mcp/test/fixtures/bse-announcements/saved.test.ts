import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import { extractListFromHtml } from '../../../src/tools/extract_list.js';
import { extractTablesFromHtml } from '../../../src/tools/extract_tables.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a corporate-announcements feed:
// https://www.bseindia.com/corporates/ann.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl = 'https://www.bseindia.com/corporates/ann.html';

// The announcement PDFs open through onclick handlers — no anchor on the page
// carries their URL — so only the record columns (company, category, time,
// subject) are recoverable from this DOM.
describe('filings feed capture: announcement records in a table', () => {
  it('fuses the records into one prose blob on the article path', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'text' });
    const structured = result.structuredContent as StructuredContent;
    expect(structured.diagnostics.readerable).toBe(false);
    expect(structured.content).toContain('SMC Credits Ltd');
    expect(structured.content).toContain('Tandhan Industries Ltd');
    expect(structured.content).not.toContain('|');
  });

  it('reports the sidebar nav as the list, not the announcements table', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const result = extractListFromHtml({ baseUrl: pageUrl, html });
    const structured = result.structuredContent as { diagnostics: { containerSelector: string; itemCount: number } };
    expect(structured.diagnostics.containerSelector).toBe('ul.ullist');
    expect(structured.diagnostics.itemCount).toBe(17);
  });

  it('keeps every record through the table walk', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const result = extractTablesFromHtml({ baseUrl: pageUrl, format: 'gfm', html });
    const structured = result.structuredContent as { tables: { rows: number; markdown: string }[] };
    const records = structured.tables.filter(table => table.rows >= 150);
    expect(records).toHaveLength(1);
    expect(records[0].markdown).toContain('SMC Credits Ltd');
  });
});
