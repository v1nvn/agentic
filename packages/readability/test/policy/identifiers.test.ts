import { gibberishScore, isGeneratedIdentifier } from '../../src/policy/identifiers.js';

// The labeled corpus transplanted from the readweb comparison project
// (tmp/readweb/test/identifiers.test.ts): the score table was measured against
// these, so they are the acceptance bar for any change to it.
const LABELED_CASES: ReadonlyArray<readonly [string, boolean]> = [
  ['z2', false],
  ['TccjmKV6RraCaCw5L9gd', true],
  ['VYRn0PqcTApLnWYi0GKA', true],
  ['ffON2NH02oMAcqyoh2UU', true],
  ['iqWauQNeRzJ1Ot90nG8b', true],
  ['BEgMhHlL4pzYLkyLJv4B', true],
  ['SzPW9boEgn116L6lq3RA', true],
  ['Fe7JdhVTO1JKVRlHT8gi', true],
  ['t5_JGL0gn0OZYrLgkYOJ', true],
  ['DZHFpq3rUWEmzHu77zlF', true],
  ['YZqM_sNA5T5wRIPK_wCK', true],
  ['5d32008a_4274_4039_9573_105622184004', true],
  ['elementor-repeater-item-5b95dec', true],
  ['elementor-element-8ae8848', true],
  ['53b1224c-588a-439a-8495-772814379478', true],
  ['article-123', true],
  ['container', false],
  ['btn-primary', false],
  ['header', false],
  ['nav-bar-0', false],
  ['navBar', false],
  ['article-menu-item', false],
];

describe('policy.identifiers transplanted labeled corpus', () => {
  for (const [token, generated] of LABELED_CASES) {
    it(`classifies "${token}" as ${generated ? 'generated' : 'stable'}`, () => {
      expect(isGeneratedIdentifier(token)).toBe(generated);
    });
  }
});

describe('policy.identifiers compound tokens', () => {
  it('rejects a stable stem carrying a build hash', () => {
    expect(isGeneratedIdentifier('BoxStyles_commercial__Wo6Z4')).toBe(true);
    expect(isGeneratedIdentifier('BoxStyles_box-container__Qk3WH')).toBe(true);
    expect(isGeneratedIdentifier('Article_inner-wrapper__t6GKe')).toBe(true);
  });

  it('keeps the measured Daily Mail preset selectors', () => {
    for (const token of ['js-article-text', 'mol-para-with-font', 'artSplitter', 'mol-video', 'vjs-video-container', 'articleBody']) {
      expect(isGeneratedIdentifier(token)).toBe(false);
    }
  });

  it('keeps the measured Reach container stems', () => {
    expect(isGeneratedIdentifier('article-body')).toBe(false);
    expect(isGeneratedIdentifier('main-content')).toBe(false);
  });

  // Known residual: a short word-like hash with no digits and no delimiter
  // reads as a name to the transition table. Defense is upstream — the
  // suggester never sees such classes, they are dropped from the outline.
  it('misses a short digit-free hash and says so', () => {
    expect(isGeneratedIdentifier('AwrJE')).toBe(false);
    expect(gibberishScore('AwrJE')).toBeLessThan(0.3);
  });
});
