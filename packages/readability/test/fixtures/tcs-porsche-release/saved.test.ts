import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

// Slimmed rendered capture of a corporate newsroom press release:
// https://www.tcs.com/who-we-are/newsroom/press-release/tcs-porsche-ag-partner-accelerate-future-of-ai-powered-mobility
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.tcs.com/who-we-are/newsroom/press-release/tcs-porsche-ag-partner-accelerate-future-of-ai-powered-mobility';

function extractFixture(): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'text' });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

// Hunt negative for the one-off-layout class: a corporate newsroom release
// whose body lands complete without a site preset.
describe('press-release capture: newsroom one-off layout', () => {
  it('extracts the release body', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('Porsche');
    expect(structured.content).toContain('Mumbai');
    expect(structured.content.toLowerCase()).toContain('artificial intelligence');
  });

  it('keeps the newsroom chrome out', () => {
    const structured = extractFixture();
    expect(structured.content.toLowerCase()).not.toContain('cookie');
    expect(structured.content).not.toContain('Subscribe');
  });
});

// A captured page is composite: detection fires on the related-release rail rather than the
// page's main content — measured here so the false-positive guard can skip
// this fixture.
describe('composite capture: embedded furniture', () => {
  it('detects the list-shaped furniture when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBe(4);
    expect(result.containerSelector).toBe('div.d-flex.flex-wrap.various-forms.justify-content-between.d-flex');
  });
});
