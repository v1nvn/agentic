import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a Corriere della Sera article behind its
// region-independent consent wall (privacy-cp-wall overlay rendered):
// https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'markdown' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('consent-walled article: the overlay is not extraction loss', () => {
  it('extracts the complete article from behind the consent wall', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.readerable).toBe(true);
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('Ci prepariamo a questo da molti anni');
    // The wall's own text stays out of the article.
    expect(structured.content).not.toContain('ACCETTA E CONTINUA');
  });

  it('reports no gating signal — the piano offer header is furniture, not a wall', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });
});
