import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { ExtractFromHtmlInput } from '../../../src/tools/schemas.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

type ExtractSelectors = NonNullable<ExtractFromHtmlInput['selectors']>;

// Slimmed rendered capture of a free Reach plc (Daily Mirror) article:
// https://www.mirror.co.uk/news/uk-news/e-coli-boy-dies-beach-37627608
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
// Second page of the mirror-costa-dorada template — the transfer proof.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl = 'https://www.mirror.co.uk/news/uk-news/e-coli-boy-dies-beach-37627608';

const ARTICLE_BODY_SCOPE: ExtractSelectors = {
  include: 'article#article-body',
  exclude: ['[class*="commercial"]'],
};

function extractFixture(selectors?: ExtractSelectors): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'markdown', selectors });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('debris-class capture: Reach furniture interleaved with the article', () => {
  it('carries the continue markers inside the article container', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content.match(/Article continues below/g)).toHaveLength(3);
  });

  it('reports no gating signal', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });
});

describe('the article-body scope applied through the real pipeline', () => {
  it('drops the commercial boxes and keeps the article prose', () => {
    const structured = extractFixture(ARTICLE_BODY_SCOPE);
    expect(structured.content).not.toContain('Article continues below');
    expect(structured.content).toContain('E.coli could survive in the water');
    expect(structured.content).toContain('the death of her son');
  });
});
