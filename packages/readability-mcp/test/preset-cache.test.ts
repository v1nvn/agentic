import {
  existsSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  loadPresetDir,
  loadPresets,
  MAX_PRESET_FILES,
  PRESETS_DIR_ENV,
  resolvePresetsDir,
} from '../src/preset-cache.js';
import { presetForSite, resetPresets } from '../src/policy/presets.js';
import { extractArticleFromHtml } from '../src/tools/extract.js';
import type { StructuredContent } from '../src/tools/output-schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');

const A66_URL =
  'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html';

const DAILYMAIL_PRESET = {
  site: 'www.dailymail.com',
  detectors: ['#js-article-text', '.artSplitter'],
  scope: {
    include: 'div[itemprop="articleBody"]',
    exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
  },
};

function writePreset(dir: string, name: string, value: unknown): string {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(value, null, 2));
  return path;
}

describe('preset-cache resolvePresetsDir', () => {
  it('prefers the override, treats empty as disabled', () => {
    expect(
      resolvePresetsDir({ [PRESETS_DIR_ENV]: '/tmp/presets' } as NodeJS.ProcessEnv),
    ).toBe('/tmp/presets');
    expect(
      resolvePresetsDir({ [PRESETS_DIR_ENV]: '' } as NodeJS.ProcessEnv),
    ).toBeUndefined();
  });

  it('falls back to XDG, then the platform cache root', () => {
    const xdg = resolvePresetsDir({ XDG_CACHE_HOME: '/xdg' } as NodeJS.ProcessEnv);
    expect(xdg).toBe(join('/xdg', 'readability-mcp', 'presets'));
    const fallback = resolvePresetsDir({} as NodeJS.ProcessEnv);
    expect(fallback).toMatch(/readability-mcp[/\\]presets$/);
  });
});

describe('preset-cache loadPresetDir', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'preset-cache-'));
  });

  afterEach(() => {
    resetPresets();
  });

  it('loads a preset file into the store, keyed by its site', () => {
    writePreset(dir, 'dailymail.com.json', DAILYMAIL_PRESET);
    expect(loadPresetDir(dir)).toEqual({ loaded: 1, pruned: 0, skipped: 0 });
    expect(presetForSite('https://www.dailymail.com/anything')).toBeDefined();
  });

  it('feeds extraction through the real pipeline', () => {
    const html = readFileSync(join(fixturesDir, 'dailymail-a66', 'saved.html'), 'utf8');
    const baseline = extractArticleFromHtml({
      html,
      baseUrl: A66_URL,
      format: 'markdown',
    });
    const baseStructured = baseline.structuredContent as StructuredContent;
    expect('preset' in baseStructured.diagnostics).toBe(false);
    expect(baseStructured.content).toContain('Loaded: 0%');

    writePreset(dir, 'dailymail.com.json', DAILYMAIL_PRESET);
    loadPresetDir(dir);
    const withPreset = extractArticleFromHtml({
      html,
      baseUrl: A66_URL,
      format: 'markdown',
    });
    const structured = withPreset.structuredContent as StructuredContent;
    expect(structured.diagnostics.preset).toEqual({
      applied: true,
      site: 'dailymail.com',
    });
    expect(structured.content).not.toContain('Loaded: 0%');
  });

  it('skips broken files without losing the rest', () => {
    writePreset(dir, 'dailymail.com.json', DAILYMAIL_PRESET);
    writeFileSync(join(dir, 'broken.json'), '{not json');
    writePreset(dir, 'no-detectors.json', { ...DAILYMAIL_PRESET, detectors: [] });
    writePreset(dir, 'empty-scope.json', {
      ...DAILYMAIL_PRESET,
      scope: {},
    });
    writePreset(dir, 'bad-site.json', { ...DAILYMAIL_PRESET, site: 'not a host!' });
    expect(loadPresetDir(dir)).toEqual({ loaded: 1, pruned: 0, skipped: 4 });
    expect(presetForSite('https://www.dailymail.com/')).toBeDefined();
  });

  it('treats a missing directory as an empty cache', () => {
    expect(loadPresetDir(join(dir, 'absent'))).toEqual({
      loaded: 0,
      pruned: 0,
      skipped: 0,
    });
  });

  it('keeps the newest files up to the bound and prunes the rest', () => {
    const total = MAX_PRESET_FILES + 2;
    for (let i = 0; i < total; i++) {
      const path = writePreset(dir, `site-${String(i).padStart(2, '0')}.json`, {
        ...DAILYMAIL_PRESET,
        site: `site-${i}.example`,
      });
      const t = new Date(Date.UTC(2026, 0, 1, 0, 0, i));
      utimesSync(path, t, t);
    }
    const report = loadPresetDir(dir);
    expect(report.loaded).toBe(MAX_PRESET_FILES);
    expect(report.pruned).toBe(2);
    expect(existsSync(join(dir, 'site-00.json'))).toBe(false);
    expect(existsSync(join(dir, 'site-01.json'))).toBe(false);
    expect(existsSync(join(dir, `site-${total - 1}.json`))).toBe(true);
    expect(presetForSite('https://site-2.example/')).toBeDefined();
    expect(presetForSite('https://site-0.example/')).toBeUndefined();
  });
});

describe('preset-cache loadPresets', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'preset-cache-env-'));
  });

  afterEach(() => {
    resetPresets();
  });

  it('returns undefined when disabled and a report when pointed at a directory', () => {
    const env = { [PRESETS_DIR_ENV]: '' } as NodeJS.ProcessEnv;
    expect(loadPresets(env)).toBeUndefined();

    writePreset(dir, 'dailymail.com.json', DAILYMAIL_PRESET);
    const enabled = { [PRESETS_DIR_ENV]: dir } as NodeJS.ProcessEnv;
    expect(loadPresets(enabled)).toEqual({ loaded: 1, pruned: 0, skipped: 0 });
    expect(presetForSite(A66_URL)).toBeDefined();
  });
});
