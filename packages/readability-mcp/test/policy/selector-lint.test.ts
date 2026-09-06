import { buildDocument } from '../../src/pipeline/dom.js';
import { lintProposal, lintSelectorText } from '../../src/policy/selector-lint.js';

const PAGE_HTML =
  '<body><nav id="site-nav">nav</nav>' +
  '<div id="js-article-text" class="article-text wide">' +
  '<div itemprop="articleBody"><p>prose</p><figure class="artSplitter"><figcaption>caption</figcaption></figure></div>' +
  '<div id="reader-comments">comments</div>' +
  '</div></body>';

function doc(): Document {
  return buildDocument(PAGE_HTML, 'https://example.com/article').document;
}

describe('policy.selector-lint static text checks', () => {
  it('rejects :contains statically — the engine would honor it silently', () => {
    expect(lintSelectorText('div:contains("article")')?.kind).toBe('contains-pseudo');
  });

  it('rejects the positional pseudo family as a family', () => {
    for (const selector of [
      'body > div:nth-child(4)',
      'div:nth-last-of-type(2)',
      'li:first-child',
      'li:last-child',
      'p:only-of-type',
      'span:first-of-type',
    ]) {
      expect(lintSelectorText(selector)?.kind, selector).toBe('positional-pseudo');
    }
  });

  it('rejects generated hash classes and ids', () => {
    expect(lintSelectorText('div.content_1tsiE')?.kind).toBe('generated-identifier');
    expect(lintSelectorText('.css-1a2b3c p')?.kind).toBe('generated-identifier');
    expect(lintSelectorText('#BoxStyles_box-container__Qk3WH')?.kind).toBe('generated-identifier');
  });

  it('leaves attribute values alone — they name stems, not identifiers', () => {
    expect(lintSelectorText('[class*="commercial"]')).toBeUndefined();
    expect(lintSelectorText('div[itemprop="articleBody"]')).toBeUndefined();
  });

  it('keeps the measured preset selectors', () => {
    for (const selector of [
      'div[itemprop="articleBody"]',
      '.mol-video',
      '.vjs-video-container',
      '.artSplitter',
      '#js-article-text',
      'article#article-body',
      '[class*="commercial"]',
    ]) {
      expect(lintSelectorText(selector), selector).toBeUndefined();
    }
  });
});

describe('policy.selector-lint proposal checks against the live DOM', () => {
  it('accepts the measured Daily Mail proposal', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#site-nav', '#js-article-text'],
      scope: { include: 'div[itemprop="articleBody"]', exclude: ['.artSplitter'] },
    });
    expect(violations).toEqual([]);
  });

  it('rejects a non-matching include — applySelectors would silently no-op', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#site-nav'],
      scope: { include: 'div[itemprop="missing"]' },
    });
    expect(violations).toEqual([
      { kind: 'no-match', selector: 'div[itemprop="missing"]', detail: expect.stringContaining('applySelectors') },
    ]);
  });

  it('rejects a detector that matches nothing', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#defunct-after-redesign'],
      scope: { include: 'div[itemprop="articleBody"]' },
    });
    expect(violations.map(violation => violation.kind)).toEqual(['no-match']);
  });

  it('rejects an exclude that matches nothing — propose time names real debris', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#site-nav'],
      scope: { include: 'div[itemprop="articleBody"]', exclude: ['.never-there'] },
    });
    expect(violations.map(violation => violation.kind)).toEqual(['no-match']);
    expect(violations[0]?.selector).toBe('.never-there');
  });

  it('rejects an exclude that would delete the include root', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#site-nav'],
      scope: {
        include: 'div[itemprop="articleBody"]',
        exclude: ['#js-article-text'],
      },
    });
    expect(violations.map(violation => violation.kind)).toEqual(['exclude-shadows-include']);
  });

  it('rejects an exclude identical to the include', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#site-nav'],
      scope: { include: 'div#js-article-text', exclude: ['div#js-article-text'] },
    });
    expect(violations.map(violation => violation.kind)).toEqual(['exclude-shadows-include']);
  });

  it('rejects an unparseable selector before the pipeline can throw', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: [],
      scope: { include: 'div[', exclude: [] },
    });
    expect(violations.map(violation => violation.kind)).toEqual(['unparseable']);
  });

  it('collects every violation, not just the first', () => {
    const violations = lintProposal({
      document: doc(),
      detectors: ['#gone', 'div:contains("x")'],
      scope: { include: 'p:nth-child(2)', exclude: ['.missing'] },
    });
    expect(violations.map(violation => violation.kind).sort()).toEqual([
      'contains-pseudo',
      'no-match',
      'no-match',
      'positional-pseudo',
    ]);
  });
});
