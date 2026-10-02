import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocument } from '../../../src/pipeline/dom.js';
import { detectList } from '../../../src/policy/list-detector.js';
import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { ExtractFromHtmlInput } from '../../../src/tools/schemas.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

type ExtractSelectors = NonNullable<ExtractFromHtmlInput['selectors']>;

// Slimmed rendered capture of a free (unwalled) Daily Mail article:
// https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html';

// The scope a site-matched preset would carry (step-0 spike, validated by hand
// on both Daily Mail captures). itemprop="articleBody" is the real body marker;
// the obvious #js-article-text also contains #reader-comments.
const ARTICLE_BODY_SCOPE: ExtractSelectors = {
  include: 'div[itemprop="articleBody"]',
  exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
};

function extractFixture(selectors?: ExtractSelectors): StructuredContent {
  const html = readFileSync(fixturePath, 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: pageUrl, format: 'markdown', selectors });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('debris-class capture: generic extract loses to page junk', () => {
  it('carries video-control text, an embedded related headline, and fused captions', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('Loaded: 0%');
    expect(structured.content).toContain('Duration Time 1:13');
    expect(structured.content).toContain('Inside the gang warfare turning Middlesbrough into a nightmare');
    expect(structured.content).toContain("cortege for Jacob Matusiak enroute to St John's");
  });

  it('reports no gating signal — the paywall class markers describe other articles', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });
});

describe('the step-0 scope applied through the real pipeline', () => {
  it('drops the debris and keeps the article prose', () => {
    const structured = extractFixture(ARTICLE_BODY_SCOPE);
    expect(structured.content).not.toContain('Loaded: 0%');
    expect(structured.content).not.toContain('Duration Time 1:13');
    expect(structured.content).not.toContain('Inside the gang warfare turning Middlesbrough into a nightmare');
    expect(structured.content).not.toContain("cortege for Jacob Matusiak enroute to St John's");
    expect(structured.content).toContain('Hundreds of mourners have gathered');
  });

  // Transfer: the same scope is asserted against both Daily Mail captures
  // (dailymail-gatwick). A scope that only worked on one page would be a
  // page-specific selector, not a site preset.
  it('keeps prose and drops debris the same way on the gatwick capture', () => {
    const gatwickUrl =
      'https://www.dailymail.com/news/article-16105629/All-flights-grounded-Gatwick-airport-runway-closed-plane-suffers-technical-issue.html';
    const html = readFileSync(join(dirname(fixturePath), '..', 'dailymail-gatwick', 'saved.html'), 'utf8');
    const result = extractArticleFromHtml({ html, baseUrl: gatwickUrl, format: 'markdown', selectors: ARTICLE_BODY_SCOPE });
    const structured = result.structuredContent as StructuredContent;
    expect(structured.content).not.toContain('Loaded: 0%');
    expect(structured.content).toContain('Gatwick airport with runway closed');
  });
});

// A captured page is composite: the channel-feed module beside the article
// is a real list, and the detector reports it rather than the article.
describe('composite capture: embedded furniture', () => {
  it('detects the channel-feed module when asked for a list', () => {
    const html = readFileSync(fixturePath, 'utf8');
    const { document } = buildDocument(html, pageUrl);
    const result = detectList(document, pageUrl);
    expect(result.detected).toBe(true);
    expect(result.itemCount).toBeGreaterThanOrEqual(3);
  });
});
