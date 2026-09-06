import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractArticleFromHtml } from '../../../src/tools/extract.js';
import type { ExtractFromHtmlInput } from '../../../src/tools/schemas.js';
import type { StructuredContent } from '../../../src/tools/output-schema.js';

type ExtractSelectors = NonNullable<ExtractFromHtmlInput['selectors']>;

// Slimmed rendered capture of a free Reach plc (Daily Mirror) article:
// https://www.mirror.co.uk/news/uk-news/costa-dorada-spain-brit-dead-37632170
// Executable scripts, style payloads, and base64 data URIs are stripped
// (scripts/trim-capture.mjs); every element and attribute is the real DOM.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'saved.html');
const pageUrl = 'https://www.mirror.co.uk/news/uk-news/costa-dorada-spain-brit-dead-37632170';

// Reach's article container is `article#article-body`; the breadcrumb nav and
// the "Preferred Source" promo sit beside it inside the wrapper, and the
// "Article continues below" commercial boxes sit inside it. The box classes are
// CSS-modules output (`BoxStyles_commercial__Wo6Z4`), so the exclude names the
// stable stem as an attribute substring.
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
  it('carries the breadcrumb nav, the Preferred Source promo, and continue markers', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).toContain('![Daily Mirror Icon]');
    expect(structured.content).toContain('[UK News]');
    expect(structured.content).toContain("Choose Daily Mirror as a 'Preferred Source'");
    expect(structured.content).toContain('Article continues below');
    expect(structured.content).toContain('[Breaking News]');
  });

  it('reports no gating signal', () => {
    const structured = extractFixture();
    expect(structured.diagnostics.gated).toBeUndefined();
  });
});

describe('the article-body scope applied through the real pipeline', () => {
  it('drops the furniture and keeps the article prose', () => {
    const structured = extractFixture(ARTICLE_BODY_SCOPE);
    expect(structured.content).not.toContain('![Daily Mirror Icon]');
    expect(structured.content).not.toContain("Choose Daily Mirror as a 'Preferred Source'");
    expect(structured.content).not.toContain('Article continues below');
    expect(structured.content).toContain('A British holidaymaker has tragically drowned');
    expect(structured.content).toContain('the first to die in September');
  });

  // Transfer: the same scope is asserted against the second Reach capture
  // (mirror-ecoli). A scope that only worked on one page would be a
  // page-specific selector, not a site preset.
  it('keeps prose and drops debris the same way on the mirror-ecoli capture', () => {
    const html = readFileSync(join(dirname(fixturePath), '..', 'mirror-ecoli', 'saved.html'), 'utf8');
    const result = extractArticleFromHtml({
      html,
      baseUrl: 'https://www.mirror.co.uk/news/uk-news/e-coli-boy-dies-beach-37627608',
      format: 'markdown',
      selectors: ARTICLE_BODY_SCOPE,
    });
    const structured = result.structuredContent as StructuredContent;
    expect(structured.content).not.toContain('Article continues below');
    expect(structured.content).toContain('E.coli could survive in the water');
  });
});
