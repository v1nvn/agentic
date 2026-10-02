import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { addPreset, resetPresets } from '../../src/policy/presets.js';
import { extractArticleFromHtml } from '../../src/tools/extract.js';
import { extractSectionFromHtml } from '../../src/tools/extract_section.js';
import { htmlToMarkdownFromHtml } from '../../src/tools/html_to_markdown.js';
import type { ExtractFromHtmlInput } from '../../src/tools/schemas.js';
import type { StructuredContent } from '../../src/tools/output-schema.js';

type ExtractSelectors = NonNullable<ExtractFromHtmlInput['selectors']>;

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', 'fixtures');

function readFixture(id: string): string {
  return readFileSync(join(fixturesDir, id, 'saved.html'), 'utf8');
}

const A66_URL =
  'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html';
const GATWICK_URL =
  'https://www.dailymail.com/news/article-16105629/All-flights-grounded-Gatwick-airport-runway-closed-plane-suffers-technical-issue.html';
const CORRIERE_URL =
  'https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml';

// The scope measured in the step-0 spike and validated on both captures; the
// detectors are Daily Mail template fingerprints present on both pages.
const DAILYMAIL_PRESET = {
  site: 'www.dailymail.com',
  detectors: ['#js-article-text', '.artSplitter'],
  scope: {
    include: 'div[itemprop="articleBody"]',
    exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
  },
};

function extract(
  html: string,
  url: string,
  selectors?: ExtractSelectors,
): StructuredContent {
  const result = extractArticleFromHtml({ html, baseUrl: url, format: 'markdown', selectors });
  expect(result.isError).toBeFalsy();
  return result.structuredContent as StructuredContent;
}

describe('extract resolves a stored site preset', () => {
  beforeEach(() => {
    resetPresets();
  });

  afterEach(() => {
    resetPresets();
  });

  it('applies the preset scope and drops the debris on the a66 capture', () => {
    addPreset(DAILYMAIL_PRESET);
    const structured = extract(readFixture('dailymail-a66'), A66_URL);
    expect(structured.diagnostics.preset).toEqual({
      applied: true,
      site: 'dailymail.com',
    });
    expect(structured.diagnostics.fallbackUsed).toBe(false);
    expect(structured.content).not.toContain('Loaded: 0%');
    expect(structured.content).not.toContain('Duration Time 1:13');
    expect(structured.content).not.toContain(
      'Inside the gang warfare turning Middlesbrough into a nightmare',
    );
    expect(structured.content).not.toContain(
      "cortege for Jacob Matusiak enroute to St John's",
    );
    expect(structured.content).toContain('Hundreds of mourners have gathered');
  });

  it('transfers to the gatwick capture of the same site', () => {
    addPreset(DAILYMAIL_PRESET);
    const structured = extract(readFixture('dailymail-gatwick'), GATWICK_URL);
    expect(structured.diagnostics.preset).toEqual({
      applied: true,
      site: 'dailymail.com',
    });
    expect(structured.content).not.toContain('save us as a Preferred Source');
    expect(structured.content).toContain('Gatwick airport with runway closed');
    // The include drops the in-page headline element (it sits outside
    // articleBody); the title survives through the metadata cascade.
    expect(structured.metadata.title).toContain('Gatwick');
  });

  it('treats explicit selectors as overriding the preset', () => {
    const html = readFixture('dailymail-a66');
    const selectors: ExtractSelectors = { include: 'article' };
    const overridden = extract(html, A66_URL, selectors);
    addPreset(DAILYMAIL_PRESET);
    const withPreset = extract(html, A66_URL, selectors);
    expect(withPreset.diagnostics.preset).toEqual({
      applied: false,
      reason: 'overridden',
      site: 'dailymail.com',
    });
    expect(withPreset.content).toBe(overridden.content);
  });

  it('falls back to the baseline output when the preset is stale', () => {
    const html = readFixture('dailymail-a66');
    const baseline = extract(html, A66_URL);
    addPreset({
      ...DAILYMAIL_PRESET,
      detectors: ['#defunct-container-redesign'],
    });
    const structured = extract(html, A66_URL);
    expect(structured.diagnostics.preset).toEqual({
      applied: false,
      reason: 'detectors-missed',
      site: 'dailymail.com',
    });
    expect(structured.content).toBe(baseline.content);
  });

  it('survives a preset whose selector cannot parse', () => {
    const html = readFixture('dailymail-a66');
    const baseline = extract(html, A66_URL);
    addPreset({ ...DAILYMAIL_PRESET, detectors: ['div['] });
    const structured = extract(html, A66_URL);
    expect(structured.diagnostics.preset).toEqual({
      applied: false,
      reason: 'detectors-missed',
      site: 'dailymail.com',
    });
    expect(structured.content).toBe(baseline.content);
  });

  it('emits no preset signal for a site without one', () => {
    const structured = extract(readFixture('corriere-afd'), CORRIERE_URL);
    expect('preset' in structured.diagnostics).toBe(false);
  });

  it('leaks no preset across sites', () => {
    const html = readFixture('dailymail-a66');
    const baseline = extract(html, A66_URL);
    addPreset({
      site: 'corriere.it',
      detectors: ['#content-to-read'],
      scope: { include: 'div#content-to-read' },
    });
    const a66 = extract(html, A66_URL);
    expect('preset' in a66.diagnostics).toBe(false);
    expect(a66.content).toBe(baseline.content);
    // The same store still serves the preset to its own site.
    const corriere = extract(readFixture('corriere-afd'), CORRIERE_URL);
    expect(corriere.diagnostics.preset).toEqual({
      applied: true,
      site: 'corriere.it',
    });
  });

  it('never fires for extract_section or html_to_markdown', () => {
    addPreset(DAILYMAIL_PRESET);
    const html = readFixture('dailymail-a66');
    const section = extractSectionFromHtml({
      html,
      baseUrl: A66_URL,
      selector: 'div[itemprop="articleBody"]',
    });
    const sectioned = section.structuredContent as StructuredContent;
    expect('preset' in sectioned.diagnostics).toBe(false);
    expect(sectioned.content).toContain('Hundreds of mourners have gathered');

    const fragment = htmlToMarkdownFromHtml({ html, baseUrl: A66_URL });
    expect('preset' in (fragment.structuredContent as StructuredContent).diagnostics).toBe(false);
  });

  it('invalidates cached baseline entries when a preset lands mid-session', () => {
    const html = readFixture('dailymail-a66');
    const before = extractArticleFromHtml({ html, baseUrl: A66_URL, cache: true });
    const beforeCache = (before.structuredContent as StructuredContent).diagnostics.cache;
    expect(beforeCache?.hit).toBe(false);
    const cached = extractArticleFromHtml({ html, baseUrl: A66_URL, cache: true });
    expect((cached.structuredContent as StructuredContent).diagnostics.cache?.hit).toBe(true);

    addPreset(DAILYMAIL_PRESET);
    const after = extractArticleFromHtml({ html, baseUrl: A66_URL, cache: true });
    const structured = after.structuredContent as StructuredContent;
    expect(structured.diagnostics.cache?.hit).toBe(false);
    expect(structured.diagnostics.preset).toEqual({
      applied: true,
      site: 'dailymail.com',
    });
    expect(structured.content).not.toContain('Loaded: 0%');
  });
});
