import type { SitePreset } from '../../src/policy/presets.js';

// The proposals the suggest loop accepted on each fixture, checked in as data:
// the bench replays them through the loop's material→validate→apply path, so
// its numbers are the suggest-loop baseline. Corriere is a trigger negative
// (the extraction already succeeds) and dailymail-aa-ducttape is a trigger
// negative too (clean page) — neither gets a scored row.
export interface SuggestScenario {
  readonly fixtureId: string;
  readonly preset: SitePreset;
}

export const SUGGEST_SCENARIOS: readonly SuggestScenario[] = [
  {
    fixtureId: 'dailymail-a66',
    preset: {
      site: 'www.dailymail.com',
      detectors: ['#js-article-text', '.artSplitter'],
      scope: {
        include: 'div[itemprop="articleBody"]',
        exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
      },
    },
  },
  {
    fixtureId: 'dailymail-gatwick',
    preset: {
      site: 'www.dailymail.com',
      detectors: ['#js-article-text', '.artSplitter'],
      scope: {
        include: 'div[itemprop="articleBody"]',
        exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
      },
    },
  },
  {
    fixtureId: 'mirror-costa-dorada',
    preset: {
      site: 'www.mirror.co.uk',
      detectors: ['main#main-content'],
      scope: {
        include: 'article#article-body',
        exclude: ['[class*="commercial"]'],
      },
    },
  },
  {
    fixtureId: 'mirror-ecoli',
    preset: {
      site: 'www.mirror.co.uk',
      detectors: ['main#main-content'],
      scope: {
        include: 'article#article-body',
        exclude: ['[class*="commercial"]'],
      },
    },
  },
];
