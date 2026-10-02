import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assessLostSignal, NEAR_EMPTY_WORDS } from '../../src/policy/lost-signal.js';
import { extractArticleFromHtml } from '../../src/tools/extract.js';
import type { StructuredContent } from '../../src/tools/output-schema.js';

const here = dirname(fileURLToPath(import.meta.url));

function baselineText(fixtureId: string, url: string): string {
  const html = readFileSync(join(here, '..', 'fixtures', fixtureId, 'saved.html'), 'utf8');
  const result = extractArticleFromHtml({ html, baseUrl: url, cache: false, format: 'text' });
  expect(result.isError).toBeFalsy();
  return ((result.structuredContent as StructuredContent).content ?? '') as string;
}

describe('policy.lost-signal', () => {
  it('fires on the dailymail-a66 baseline — debris is the only signal present', () => {
    const evidence = assessLostSignal({
      contentText: baselineText(
        'dailymail-a66',
        'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html',
      ),
      fallbackUsed: false,
    });
    expect(evidence.fallbackUsed).toBe(false);
    expect(evidence.gatedReason).toBeUndefined();
    expect(evidence.nearEmpty).toBe(false);
    expect(evidence.debrisProbes).toContain('player-controls');
    expect(evidence.reasons).toEqual(['debris:player-controls']);
  });

  it('stays quiet on a healthy extraction', () => {
    const evidence = assessLostSignal({
      contentText: baselineText(
        'corriere-afd',
        'https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml',
      ),
      fallbackUsed: false,
    });
    expect(evidence.reasons).toEqual([]);
  });

  it('never fires on a gating signal alone', () => {
    const evidence = assessLostSignal({
      contentText:
        'A complete and perfectly healthy article. '.repeat(30),
      fallbackUsed: false,
      gated: { likely: true, reason: 'paywall overlay' },
    });
    expect(evidence.gatedReason).toBe('paywall overlay');
    expect(evidence.reasons).toEqual([]);
  });

  it('pairs gating with near-empty content into a firing verdict', () => {
    const evidence = assessLostSignal({
      contentText: 'just the dek',
      fallbackUsed: false,
      gated: { likely: true, reason: 'metered paywall message' },
    });
    expect(evidence.nearEmpty).toBe(true);
    expect(evidence.reasons).toEqual(['near-empty']);
  });

  it('fires on a fallback extraction regardless of its length', () => {
    const evidence = assessLostSignal({
      contentText: 'word '.repeat(NEAR_EMPTY_WORDS + 10),
      fallbackUsed: true,
    });
    expect(evidence.reasons).toEqual(['fallback-used']);
  });

  it('fires on the metered barrier text WIRED prints in place of the article', () => {
    const evidence = assessLostSignal({
      contentText:
        'The party was already underway when the news broke, and nobody in the room expected the announcement that came over the loudspeakers a few minutes later. '.repeat(6) +
        "You've read your last free article. Subscribe to continue reading.",
      fallbackUsed: false,
    });
    expect(evidence.nearEmpty).toBe(false);
    expect(evidence.debrisProbes).toEqual(['metered-barrier']);
    expect(evidence.reasons).toEqual(['debris:metered-barrier']);
  });
});
