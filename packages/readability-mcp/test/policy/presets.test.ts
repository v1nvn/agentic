import { buildDocument } from '../../src/pipeline/dom.js';
import {
  addPreset,
  normalizeSiteKey,
  presetForSite,
  resetPresets,
  resolvePreset,
} from '../../src/policy/presets.js';

function doc(html: string): Document {
  return buildDocument(html, 'https://example.com/article').document;
}

const ARTICLE_HTML =
  '<body><nav id="site-nav">nav</nav>' +
  '<div id="js-article-text"><div itemprop="articleBody"><p>prose</p></div></div>' +
  '<figure class="artSplitter">caption</figure></body>';

const PRESET = {
  site: 'https://www.example.com',
  detectors: ['#site-nav', '#js-article-text'],
  scope: {
    include: 'div[itemprop="articleBody"]',
    exclude: ['.artSplitter'],
  },
};

describe('policy.presets normalizeSiteKey', () => {
  it('strips the URL down to a lowercased host without one www. prefix', () => {
    expect(normalizeSiteKey('https://www.dailymail.com/news/a.html')).toBe(
      'dailymail.com',
    );
    expect(normalizeSiteKey('https://DAILYMAIL.com/a')).toBe('dailymail.com');
    expect(normalizeSiteKey('https://mail.dailymail.com/a')).toBe(
      'mail.dailymail.com',
    );
    expect(normalizeSiteKey('www.dailymail.com')).toBe('dailymail.com');
    expect(normalizeSiteKey('https://www.www.com/')).toBe('www.com');
  });

  it('returns undefined for anything that names no host', () => {
    expect(normalizeSiteKey(undefined)).toBeUndefined();
    expect(normalizeSiteKey('')).toBeUndefined();
    expect(normalizeSiteKey('   ')).toBeUndefined();
    expect(normalizeSiteKey('not a url')).toBeUndefined();
    expect(normalizeSiteKey('https://')).toBeUndefined();
  });
});

describe('policy.presets store', () => {
  beforeEach(() => {
    resetPresets();
  });

  it('keys a URL-site preset so any page URL of the site resolves it', () => {
    addPreset(PRESET);
    expect(presetForSite('https://www.example.com/x')).toBeDefined();
    expect(presetForSite('https://example.com/other.html')).toBeDefined();
    expect(presetForSite('https://dailymail.com/other.html')).toBeUndefined();
    expect(presetForSite('https://other.example.com/x')).toBeUndefined();
  });

  it('replaces the preset on re-add and empties on reset', () => {
    addPreset(PRESET);
    addPreset({ ...PRESET, detectors: ['#only'] });
    expect(presetForSite('www.example.com')?.detectors).toEqual(['#only']);
    resetPresets();
    expect(presetForSite('www.example.com')).toBeUndefined();
  });

  it('rejects a preset whose site names no host', () => {
    expect(() => addPreset({ ...PRESET, site: 'not a url' })).toThrow();
  });
});

describe('policy.presets resolvePreset', () => {
  beforeEach(() => {
    resetPresets();
  });

  it('returns undefined when there is no site or no preset for it', () => {
    expect(resolvePreset(doc(ARTICLE_HTML), undefined, false)).toBeUndefined();
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://example.com/a', false),
    ).toBeUndefined();
  });

  it('applies the preset when every detector and the include hit', () => {
    addPreset(PRESET);
    expect(resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false)).toEqual({
      scope: PRESET.scope,
      signal: { applied: true, site: 'example.com' },
    });
  });

  it('discards the preset when a detector stops matching', () => {
    addPreset({ ...PRESET, detectors: ['#site-nav', '#gone-after-redesign'] });
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false),
    ).toEqual({
      signal: { applied: false, reason: 'detectors-missed', site: 'example.com' },
    });
  });

  it('discards the preset when the include stops matching', () => {
    addPreset({ ...PRESET, scope: { include: 'div[itemprop="missing"]' } });
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false),
    ).toEqual({
      signal: { applied: false, reason: 'detectors-missed', site: 'example.com' },
    });
  });

  it('keeps the preset when an exclude merely matches nothing', () => {
    const scope = { ...PRESET.scope, exclude: ['.never-there'] };
    addPreset({ ...PRESET, scope });
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false)?.scope,
    ).toEqual(scope);
  });

  it('folds a throwing selector into detectors-missed instead of crashing', () => {
    addPreset({ ...PRESET, detectors: ['div['] });
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false),
    ).toEqual({
      signal: { applied: false, reason: 'detectors-missed', site: 'example.com' },
    });
    addPreset({ ...PRESET, scope: { ...PRESET.scope, exclude: ['div['] } });
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', false),
    ).toEqual({
      signal: { applied: false, reason: 'detectors-missed', site: 'example.com' },
    });
  });

  it('reports overridden only when a preset exists', () => {
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', true),
    ).toBeUndefined();
    addPreset(PRESET);
    expect(
      resolvePreset(doc(ARTICLE_HTML), 'https://www.example.com/a', true),
    ).toEqual({
      signal: { applied: false, reason: 'overridden', site: 'example.com' },
    });
  });
});
