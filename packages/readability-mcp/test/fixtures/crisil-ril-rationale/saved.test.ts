import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a CRISIL rating rationale (a Word-to-HTML
// export laid out as dozens of sibling <table>s):
// https://www.crisil.com/mnt/winshare/Ratings/RatingList/RatingDocs/RelianceIndustriesLimited_March%2030_%202026_RR_392495.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.crisil.com/mnt/winshare/Ratings/RatingList/RatingDocs/RelianceIndustriesLimited_March%2030_%202026_RR_392495.html';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'text' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

// The rationale body is present in the DOM, but Readability roots at a single
// <tr> of one sibling table and amputates the rest of the document: the
// extraction returns the About-the-agency block and none of the rating action.
describe('rationale capture: Word-export table layout', () => {
  it('amputates the rationale, keeping only the boilerplate block', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.metadata.wordCount).toBeLessThan(3000);
    expect(structured.content).toContain('(A subsidiary of Crisil');
    expect(structured.content).not.toContain('Credit Bulletin');
    expect(structured.content).not.toContain('Update on Reliance Industries Limited');
    expect(structured.content.toLowerCase()).not.toContain('outlook');
  });
});
