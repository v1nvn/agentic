import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { ExtractFromHtmlInput } from '../../../src/tools/schemas.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

type ExtractSelectors = NonNullable<ExtractFromHtmlInput['selectors']>;

// Slimmed rendered capture of a free, video-heavy Daily Mail US-desk article:
// https://www.dailymail.com/news/article-16107451/american-airlines-duct-tape-racist-tirade-divert.html
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
// Negative control for the debris class: the page embeds a Connatix player and
// fourteen video nodes, and generic extraction still scores the junk out. It
// pins the opposite boundary — a preset must not damage a clean page — and the
// cross-desk transfer of the Daily Mail scope.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl =
  'https://www.dailymail.com/news/article-16107451/american-airlines-duct-tape-racist-tirade-divert.html';

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

describe('clean extraction of a video-heavy page', () => {
  it('carries the article prose without player-control debris', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.diagnostics.extractedNode).toBe('readability');
    expect(structured.content).toContain('duct-taped to his seat on an American Airlines flight');
    expect(structured.content).not.toContain('Loaded:');
    expect(structured.content).not.toContain('Duration Time');
  });

  it('reports no gating signal — the free-article paywall classes are state markers', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });
});

describe('the Daily Mail preset applied to a clean page', () => {
  it('keeps the prose intact — a preset never damages a page it does not need to fix', () => {
    const structured = extractFixture(ARTICLE_BODY_SCOPE);
    expect(structured.content).toContain('duct-taped to his seat on an American Airlines flight');
    expect(structured.content).toContain('wrapping the gray adhesive around his wrists');
    expect(structured.content).toContain('The Daily Mail has reached out to the FAA for comment');
  });
});
