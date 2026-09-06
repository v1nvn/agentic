import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a free (unwalled) Daily Mail article:
// https://www.dailymail.com/news/article-16105629/All-flights-grounded-Gatwick-airport-runway-closed-plane-suffers-technical-issue.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.dailymail.com/news/article-16105629/All-flights-grounded-Gatwick-airport-runway-closed-plane-suffers-technical-issue.html';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'markdown' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('free Daily Mail article (paywall-ineligible root, is-paywalled feed badges)', () => {
  it('reports no gating signal — the paywall class markers describe other articles', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });

  it('extracts the complete article', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.readerable).toBe(true);
    expect(structured.content).toContain('Gatwick airport with runway closed');
  });

  // A captured page is composite: the channel-feed module beside the article
  // is a real list, and the detector reports it rather than the article.
  it('detects the embedded channel-feed module when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBeGreaterThanOrEqual(3);
  });
});
