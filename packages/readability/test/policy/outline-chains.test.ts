import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildChainOutline,
  BLOCK_OWN_TEXT_MIN,
  OUTLINE_MAX_CHARS,
} from '../../src/policy/outline-chains.js';

const here = dirname(fileURLToPath(import.meta.url));

function fixtureHtml(id: string): string {
  return readFileSync(join(here, '..', 'fixtures', id, 'saved.html'), 'utf8');
}

const A66_URL =
  'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html';
const A66_SCOPE = {
  include: 'div[itemprop="articleBody"]',
  exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
};

describe('policy.outline-chains round-one page view', () => {
  const outline = buildChainOutline({
    baseUrl: A66_URL,
    cleanChrome: true,
    html: fixtureHtml('dailymail-a66'),
    mode: 'page',
  });

  it('renders the real body marker as copy-safe CSS, never shorthand', () => {
    expect(outline.text).toContain('div[itemprop="articleBody"]');
    expect(outline.text).not.toContain('div[articleBody]');
  });

  it('shows the article branch and its junk competitors', () => {
    expect(outline.text).toContain('#js-article-text');
    expect(outline.text).toContain('#reader-comments');
    expect(outline.text).toContain('p.mol-para-with-font');
  });

  it('carries sizes, not article prose', () => {
    expect(outline.text).toMatch(/own:\d+, all:\d+/);
    expect(outline.text).not.toContain('Hundreds of mourners');
  });

  it('never emits a generated hash class the suggester could copy', () => {
    expect(outline.text).not.toMatch(/\.(css-|content_)[A-Za-z0-9]+/);
  });

  it('fits the token budget', () => {
    expect(outline.text.length).toBeLessThanOrEqual(OUTLINE_MAX_CHARS);
  });
});

describe('policy.outline-chains round-two scope view', () => {
  // Round two applies the accepted include ALONE — the excludes are what this
  // round is supposed to produce — so the embedded video module and the
  // caption figures still stand in the subtree, each grouped into its own line.
  const withScope = buildChainOutline({
    baseUrl: A66_URL,
    cleanChrome: true,
    html: fixtureHtml('dailymail-a66'),
    mode: { scope: { include: A66_SCOPE.include } },
  });

  it('anchors chains at the include root', () => {
    expect(withScope.text).toMatch(/p\.mol-para-with-font > div\[itemprop="articleBody"\]/);
  });

  it('groups prose paragraphs into one line with a count and a range', () => {
    expect(withScope.text).toMatch(/p\.mol-para-with-font > div\[itemprop="articleBody"\] \(own:\d+\.\.\d+, ×\d+\)/);
  });

  it('surfaces the embedded related headline and the caption figures as their own groups', () => {
    expect(withScope.text).toContain('div.vjs-title-text');
    expect(withScope.text).toContain('sample: "Inside the gang warfare turning Middlesbrough into a nightmare"');
    expect(withScope.text).toContain('p.imageCaption > div.artSplitter.mol-img-group');
  });

  it('keeps the block sweep below the page-view budget', () => {
    expect(withScope.text.length).toBeLessThanOrEqual(OUTLINE_MAX_CHARS);
    expect(BLOCK_OWN_TEXT_MIN).toBeLessThan(200);
  });
});
