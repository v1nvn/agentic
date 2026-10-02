import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { PRESETS_DIR_ENV } from '../../src/preset-cache.js';
import { presetForSite, resetPresets } from '../../src/policy/presets.js';
import { runSuggestLoop } from '../../src/tools/suggest-preset.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', 'fixtures');

const A66_PATH = join(fixturesDir, 'dailymail-a66', 'saved.html');
const A66_URL =
  'https://www.dailymail.com/news/article-16104603/Headteachers-thugs-Middlesbrough-schools-close-early-funeral-A66.html';
const CORRIERE_PATH = join(fixturesDir, 'corriere-afd', 'saved.html');
const CORRIERE_URL =
  'https://www.corriere.it/esteri/26_settembre_05/germania-afd-partito-estrema-destra-eea3ed68-00f3-4741-983e-5f6bb02e6xlk.shtml';
const GATWICK_PATH = join(fixturesDir, 'dailymail-gatwick', 'saved.html');

const GOOD_CORE_PROPOSAL = {
  detectors: ['#js-article-text', '.artSplitter'],
  scope: { include: 'div[itemprop="articleBody"]' },
};
const GOOD_EXCLUDE_PROPOSAL = {
  exclude: ['.mol-video', '.vjs-video-container', '.artSplitter'],
};

type Reply = string | Error;

// A stand-in for the connected host: replies from a scripted list, one per
// sampling call. The loop only ever touches server.server.createMessage.
function fakeHost(replies: Reply[], requests: string[] = []): McpServer {
  let index = 0;
  return {
    server: {
      createMessage: async (params: { messages: { content: { text: string } }[] }) => {
        requests.push(params.messages[0]?.content.text ?? '');
        const reply = replies[index++];
        if (reply instanceof Error) {
          throw reply;
        }
        if (reply === undefined) {
          throw new Error(`unexpected sampling call ${index}`);
        }
        return { content: { type: 'text', text: reply }, role: 'assistant' };
      },
    },
  } as unknown as McpServer;
}

const json = (value: unknown): string => JSON.stringify(value);

describe('suggest_preset runSuggestLoop', () => {
  let presetDir: string;

  beforeEach(() => {
    resetPresets();
    presetDir = mkdtempSync(join(tmpdir(), 'suggest-preset-'));
    process.env[PRESETS_DIR_ENV] = presetDir;
  });

  afterEach(() => {
    resetPresets();
    delete process.env[PRESETS_DIR_ENV];
    rmSync(presetDir, { force: true, recursive: true });
  });

  // Each loop run re-parses the large capture several times (baseline,
  // outline, per-proposal lint tree, verification) — a few seconds each.
  it('converges on the a66 fixture: validated, stored, persisted, applied', { timeout: 60_000 }, async () => {
    const requests: string[] = [];
    const host = fakeHost(
      [json(GOOD_CORE_PROPOSAL), json(GOOD_EXCLUDE_PROPOSAL)],
      requests,
    );
    const result = await runSuggestLoop(
      { baseUrl: A66_URL, localPath: A66_PATH, maxSamplingCalls: 4 },
      host,
    );
    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as Record<string, any>;

    expect(structured.trigger.fired).toBe(true);
    expect(structured.trigger.reasons).toEqual(['debris:player-controls']);
    expect(structured.sampling).toEqual({
      budget: 4,
      budgetExhausted: false,
      calls: 2,
    });
    expect(structured.preset.site).toBe('dailymail.com');
    expect(structured.preset.scope.include).toBe('div[itemprop="articleBody"]');
    expect(structured.preset.scope.exclude).toContain('.mol-video');
    expect(structured.verification).toEqual({
      applied: true,
      converged: true,
      verifiedPages: 1,
      wordCountBefore: structured.trigger.wordCount,
      wordCountAfter: expect.any(Number),
    });
    expect(structured.persistence.persisted).toBe(true);
    expect(existsSync(join(presetDir, 'dailymail.com.json'))).toBe(true);

    // The material the model saw was the copy-safe page outline.
    expect(requests[0]).toContain('div[itemprop="articleBody"]');
    // The stored preset resolves for the next extraction of the same site.
    expect(presetForSite(A66_URL)).toBeDefined();
  });

  it('feeds validator rejections back and still converges', { timeout: 60_000 }, async () => {
    const requests: string[] = [];
    const host = fakeHost(
      [
        json({
          detectors: ['#js-article-text'],
          scope: { include: 'div.content_1tsiE' },
        }),
        json(GOOD_CORE_PROPOSAL),
        json(GOOD_EXCLUDE_PROPOSAL),
      ],
      requests,
    );
    const result = await runSuggestLoop(
      { baseUrl: A66_URL, localPath: A66_PATH, maxSamplingCalls: 4 },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.verification.converged).toBe(true);
    expect(structured.sampling.calls).toBe(3);
    expect(requests[1]).toContain('generated-identifier');
    expect(requests[1]).toContain('div.content_1tsiE');
  });

  it('exhausts the budget on unparseable replies and stores nothing', { timeout: 60_000 }, async () => {
    const host = fakeHost(['not json at all', 'also not json']);
    const result = await runSuggestLoop(
      { baseUrl: A66_URL, localPath: A66_PATH, maxSamplingCalls: 2 },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.trigger.fired).toBe(true);
    expect(structured.preset).toBeUndefined();
    expect(structured.verification).toBeUndefined();
    expect(structured.persistence).toBeUndefined();
    expect(structured.sampling).toEqual({
      budget: 2,
      budgetExhausted: true,
      calls: 2,
    });
    expect(presetForSite(A66_URL)).toBeUndefined();
    expect(readdirSync(presetDir)).toHaveLength(0);
  });

  it('reports honest non-convergence when the wall truncates the DOM', async () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `<p>Paragraph ${i} of a readable article body with plenty of words to stay far above every near-empty threshold we measure.</p>`,
    ).join('');
    const html = `<html><body><nav id="site-nav">nav</nav><main><article>${paragraphs}
      <div class="paywall-barrier">You've read your last free article. Subscribe to continue reading.</div>
      </article></main></body></html>`;
    const path = join(presetDir, 'metered.html');
    writeFileSync(path, html);

    const host = fakeHost([
      json({ detectors: ['#site-nav'], scope: { include: 'article' } }),
      json({ exclude: [] }),
    ]);
    const result = await runSuggestLoop(
      {
        baseUrl: 'https://wired.example.com/story',
        localPath: path,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    // The include was accepted and applied, but the barrier text survives the
    // extraction it can name — no selector recovers text the DOM does not have.
    expect(structured.verification.applied).toBe(true);
    expect(structured.verification.converged).toBe(false);
    expect(structured.persistence).toEqual({
      persisted: false,
      reason: 'not-converged',
    });
    expect(presetForSite('https://wired.example.com/story')).toBeUndefined();
    expect(existsSync(join(presetDir, 'wired.example.com.json'))).toBe(false);
  });

  it('refuses a healthy page without sampling', { timeout: 60_000 }, async () => {
    const requests: string[] = [];
    const host = fakeHost([], requests);
    const result = await runSuggestLoop(
      {
        baseUrl: CORRIERE_URL,
        localPath: CORRIERE_PATH,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.trigger.fired).toBe(false);
    expect(structured.trigger.reasons).toEqual([]);
    expect(structured.sampling.calls).toBe(0);
    expect(structured.preset).toBeUndefined();
    expect(requests).toHaveLength(0);
  });

  it('never fires on a gating signal alone', async () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `<p>Paragraph ${i} of a complete article that extraction handles fine.</p>`,
    ).join('');
    const html = `<html><body><div class="paywall-modal">upgrade</div><main><article>${paragraphs}</article></main></body></html>`;
    const path = join(presetDir, 'gated.html');
    writeFileSync(path, html);

    const host = fakeHost([], []);
    const result = await runSuggestLoop(
      {
        baseUrl: 'https://news.example.com/free-story',
        localPath: path,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.trigger.fired).toBe(false);
    expect(structured.trigger.gatedReason).toBe('paywall overlay');
    expect(structured.sampling.calls).toBe(0);
  });

  it('refuses when a preset already exists for the site', async () => {
    const { addPreset } = await import('../../src/policy/presets.js');
    addPreset({
      detectors: ['#js-article-text'],
      scope: { include: 'div[itemprop="articleBody"]' },
      site: 'dailymail.com',
    });
    const host = fakeHost([], []);
    const result = await runSuggestLoop(
      { baseUrl: A66_URL, localPath: A66_PATH, maxSamplingCalls: 4 },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.trigger.fired).toBe(false);
    expect(structured.trigger.reasons).toEqual(['preset-exists']);
    expect(structured.sampling.calls).toBe(0);
  });

  it('parses a fenced reply and persists a converged run', { timeout: 60_000 }, async () => {
    const host = fakeHost([
      '```json\n' + json(GOOD_CORE_PROPOSAL) + '\n```',
      json(GOOD_EXCLUDE_PROPOSAL),
    ]);
    const result = await runSuggestLoop(
      { baseUrl: A66_URL, localPath: A66_PATH, maxSamplingCalls: 4 },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.verification.converged).toBe(true);
    expect(structured.persistence.persisted).toBe(true);
  });

  it('refuses when the capture canonicalizes to another host', { timeout: 60_000 }, async () => {
    const requests: string[] = [];
    const host = fakeHost([], requests);
    await expect(
      runSuggestLoop(
        {
          baseUrl: 'https://template-thief.example.com/story',
          localPath: A66_PATH,
          maxSamplingCalls: 4,
        },
        host,
      ),
    ).rejects.toThrow(/canonical/);
    expect(requests).toHaveLength(0);
    expect(existsSync(join(presetDir, 'template-thief.example.com.json'))).toBe(
      false,
    );
  });

  it('verifies on a second capture before persisting', { timeout: 120_000 }, async () => {
    const requests: string[] = [];
    const host = fakeHost(
      [json(GOOD_CORE_PROPOSAL), json(GOOD_EXCLUDE_PROPOSAL)],
      requests,
    );
    const result = await runSuggestLoop(
      {
        baseUrl: A66_URL,
        localPath: A66_PATH,
        secondPath: GATWICK_PATH,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.verification.verifiedPages).toBe(2);
    expect(structured.secondVerification.applied).toBe(true);
    expect(structured.secondVerification.converged).toBe(true);
    expect(structured.persistence.persisted).toBe(true);
    expect(existsSync(join(presetDir, 'dailymail.com.json'))).toBe(true);
    expect(presetForSite(A66_URL)).toBeDefined();
    expect(requests).toHaveLength(2);
  });

  it('refuses to persist when the second capture misses the preset', { timeout: 120_000 }, async () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `<p>Paragraph ${i} of a plain article body with enough words to sit far above the near-empty threshold.</p>`,
    ).join('');
    const html = `<html><head><link rel="canonical" href="https://www.dailymail.com/news/article-2.html"></head><body><main><article>${paragraphs}</article></main></body></html>`;
    const path = join(presetDir, 'second-capture.html');
    writeFileSync(path, html);
    const host = fakeHost([
      json(GOOD_CORE_PROPOSAL),
      json(GOOD_EXCLUDE_PROPOSAL),
    ]);
    const result = await runSuggestLoop(
      {
        baseUrl: A66_URL,
        localPath: A66_PATH,
        secondPath: path,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.verification.verifiedPages).toBe(1);
    expect(structured.secondVerification.applied).toBe(false);
    expect(structured.secondVerification.converged).toBe(false);
    expect(structured.persistence).toEqual({
      persisted: false,
      reason: 'second-page-not-converged',
    });
    expect(existsSync(join(presetDir, 'dailymail.com.json'))).toBe(false);
    expect(presetForSite(A66_URL)).toBeUndefined();
  });

  it('refuses to persist when the second capture belongs to another site', { timeout: 120_000 }, async () => {
    const host = fakeHost([
      json(GOOD_CORE_PROPOSAL),
      json(GOOD_EXCLUDE_PROPOSAL),
    ]);
    const result = await runSuggestLoop(
      {
        baseUrl: A66_URL,
        localPath: A66_PATH,
        secondPath: CORRIERE_PATH,
        maxSamplingCalls: 4,
      },
      host,
    );
    const structured = result.structuredContent as Record<string, any>;
    expect(structured.persistence).toEqual({
      persisted: false,
      reason: 'second-page-canonical-mismatch',
    });
    expect(structured.secondVerification).toBeUndefined();
    expect(existsSync(join(presetDir, 'dailymail.com.json'))).toBe(false);
    expect(presetForSite(A66_URL)).toBeUndefined();
  });
});
