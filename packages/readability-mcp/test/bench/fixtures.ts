import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SitePreset } from '../../src/policy/presets.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

export interface BenchFixture {
  readonly category: string;
  readonly id: string;
  readonly path: string;
  readonly url: string;
}

// Each url mirrors the one its fixture's saved.test.ts uses, so the bench
// exercises the same origin context the golden suite does.
export const BENCH_FIXTURES: readonly BenchFixture[] = [
  {
    category: 'article',
    id: 'react-spa',
    path: 'test/fixtures/react-spa/saved.html',
    url: 'https://example.com/blog/post',
  },
  {
    category: 'documentation',
    id: 'documentation',
    path: 'test/fixtures/documentation/saved.html',
    url: 'https://docs.example.com/typescript/arrays',
  },
  {
    category: 'documentation',
    id: 'outline',
    path: 'test/fixtures/outline/saved.html',
    url: 'https://docs.example.com/api',
  },
  {
    category: 'article',
    id: 'fallback',
    path: 'test/fixtures/fallback/saved.html',
    url: 'https://aurora.example.com/',
  },
  {
    category: 'article',
    id: 'lazy-images',
    path: 'test/fixtures/lazy-images/saved.html',
    url: 'https://example.com/blog/lazy',
  },
  {
    category: 'article',
    id: 'consent-banner',
    path: 'test/fixtures/consent-banner/saved.html',
    url: 'https://news.example.com/world/consent-overlays',
  },
  {
    category: 'article',
    id: 'code-langs',
    path: 'test/fixtures/code-langs/saved.html',
    url: 'https://docs.example.com/guides/code-langs',
  },
  {
    category: 'article',
    id: 'dailymail-a66',
    path: 'test/fixtures/dailymail-a66/saved.html',
    url: 'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html',
  },
  {
    category: 'article',
    id: 'dailymail-gatwick',
    path: 'test/fixtures/dailymail-gatwick/saved.html',
    url: 'https://www.dailymail.com/news/article-16105629/All-flights-grounded-Gatwick-airport-runway-closed-plane-suffers-technical-issue.html',
  },
  {
    category: 'article',
    id: 'corriere-afd',
    path: 'test/fixtures/corriere-afd/saved.html',
    url: 'https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml',
  },
  {
    category: 'article',
    id: 'mirror-costa-dorada',
    path: 'test/fixtures/mirror-costa-dorada/saved.html',
    url: 'https://www.mirror.co.uk/news/uk-news/costa-dorada-spain-brit-dead-37632170',
  },
  {
    category: 'article',
    id: 'mirror-ecoli',
    path: 'test/fixtures/mirror-ecoli/saved.html',
    url: 'https://www.mirror.co.uk/news/uk-news/e-coli-boy-dies-beach-37627608',
  },
  {
    category: 'article',
    id: 'dailymail-aa-ducttape',
    path: 'test/fixtures/dailymail-aa-ducttape/saved.html',
    url: 'https://www.dailymail.com/news/article-16107451/american-airlines-duct-tape-racist-tirade-divert.html',
  },
];

export function resolveFixturePath(fixture: BenchFixture): string {
  return join(repoRoot, fixture.path);
}

// Preset-applied variants of existing fixtures, scored as `<fixtureId>@preset`
// in scores.json and reported in their own table. Kept out of BENCH_FIXTURES so
// the default-pipeline aggregate never absorbs preset runs. The preset is the
// step-0 scope, measured on both Daily Mail captures.
export interface PresetScenario {
  readonly fixtureId: string;
  readonly preset: SitePreset;
}

export const PRESET_SCENARIOS: readonly PresetScenario[] = [
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
    // The measured scope on a third, clean Daily Mail page: the preset must
    // hold precision on a page that never needed fixing (dailymail-aa-ducttape).
    fixtureId: 'dailymail-aa-ducttape',
    preset: {
      site: 'www.dailymail.com',
      detectors: ['#js-article-text', '.artSplitter'],
      scope: {
        include: 'div[itemprop="articleBody"]',
        exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
      },
    },
  },
];
