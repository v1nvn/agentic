import { describe, expect, it } from 'vitest';

import type { TopMeasure, TopState } from './top.js';

import { renderLines } from './text.js';
import { emptyTop, fmtDur, topLines } from './top.js';

const NOW = 1_000 * 3600;

const SESSION = {
  model: 'glm-5.3[1m]',
  version: '2.1.287',
  cwd: '/Users/vineet/git/agentic',
  turns: 47,
  surfaces: ['terminal'],
  agents: [],
};

const MEASURE: TopMeasure = {
  startedAt: NOW - 112 * 60 * 1000,
  tokens: 124100,
  window: 200000,
  percent: 62,
  compactAt: 156000,
  costUsd: 4.13,
  rateLimits: [
    { kind: 'five_hour', percentUsed: 71, resetsAt: NOW + 3600 * 2.2 * 1000 },
    { kind: 'seven_day', percentUsed: 34, resetsAt: null },
  ],
  categories: [
    { name: 'Messages', tokens: 84200, kind: 'used' },
    { name: 'Tools', tokens: 12100, kind: 'used' },
    { name: 'Free space', tokens: 74000, kind: 'free' },
    { name: 'Deferred tools', tokens: 9000, kind: 'deferred' },
  ],
  mcp: [
    { server: 'chrome-devtools', tokens: 4200 },
    { server: 'enhansome', tokens: 2100 },
  ],
  memory: [{ path: '/Users/vineet/.claude/CLAUDE.md', tokens: 2600 }],
};

function state(patch: (s: TopState) => TopState): TopState {
  return patch({ ...emptyTop(), measure: MEASURE });
}

function body(s: TopState): string {
  return renderLines(topLines(s, SESSION, { now: NOW }));
}

describe('topLines', () => {
  it('draws the header from session facts and the measure', () => {
    const rows = body(state(() => ({ ...emptyTop(), measure: MEASURE }))).split(
      '\n',
    );
    expect(rows[0]).toContain(' glm-5.3[1m] · 2.1.287 · 1h52m');
    expect(rows[1]).toContain('git/agentic · terminal · 47 prompts · $4.13');
  });

  it('shows the context block with categories, eaters, and limits', () => {
    const text = body(state(() => ({ ...emptyTop(), measure: MEASURE })));
    expect(text).toContain('124.1K / 200.0K  ·  62%');
    expect(text).toContain('compact at 156.0K');
    expect(text).toContain('messages 84.2K · tools 12.1K');
    expect(text).toContain('free 74.0K');
    expect(text).not.toContain('deferred');
    expect(text).toContain('mcp     chrome-devtools 4.2K · enhansome 2.1K');
    expect(text).toContain('memory  CLAUDE.md 2.6K');
    expect(text).toContain('5h');
    expect(text).toContain('week');
    expect(text).toContain('resets 2h12m');
  });

  it('never draws a shade glyph', () => {
    const text = body(
      state(s => ({
        ...s,
        running: {
          calls: [
            { id: 'c1', tool: 'Bash', label: 'node check.js', at: NOW - 4000 },
          ],
          children: [{ id: 'ch1', argv: 'git status', at: NOW - 1000 }],
        },
      })),
    );
    expect(text).not.toMatch(/[░▒▓]/);
  });

  it('collapses empty sections and lists the running call with its age', () => {
    const text = body(
      state(s => ({
        ...s,
        running: {
          calls: [
            {
              id: 'c1',
              tool: 'Read',
              label: 'hooks/register.tsx',
              at: NOW - 4000,
            },
          ],
          children: [],
        },
      })),
    );
    expect(text).toContain('Read    hooks/register.tsx · 4s');
    expect(text).not.toContain('child');
    expect(text).not.toContain('agents');
    expect(text).not.toContain('arrival');
  });

  it('lists agents with age from spawn times and their live rate', () => {
    const withAgents = {
      ...SESSION,
      agents: [
        {
          id: 'a1',
          type: 'Explore',
          status: 'running',
          name: null,
          description: 'audit the render',
        },
      ],
    };
    const text = renderLines(
      topLines(
        state(s => ({
          ...s,
          spawns: [{ id: 'a1', at: NOW - 360 * 1000 }],
          flow: {
            ...s.flow,
            agents: [{ id: 'a1', ring: [3, 9, 4], rate: 21 }],
          },
        })),
        withAgents,
        { now: NOW },
      ),
    );
    expect(text).toContain('1 running');
    expect(text).toContain('Explore      running · 6m · audit the render');
    expect(text).toContain('21 tok/s');
  });

  it('draws flow rates and the last response once one arrived', () => {
    const text = body(
      state(s => ({
        ...s,
        flow: {
          ...s.flow,
          outRing: [1, 5, 20, 9, 2],
          thinkRing: [0, 3, 8, 1, 0],
          outRate: 38,
          thinkRate: 12,
          hit: 96,
          usage: {
            input: 14900,
            output: 2100,
            cacheRead: 383200,
          },
          firstChunkMs: 800,
          turnMs: 41000,
          turnEnd: 'end_turn',
        },
      })),
    );
    expect(text).toContain('38 tok/s');
    expect(text).toContain('12 tok/s');
    expect(text).toContain('cache    96%');
    expect(text).toContain('14.9K in · 2.1K out · 383.2K read');
    expect(text).toContain('first chunk 1s · turn 41s · end_turn');
  });

  it('placeholders before any state', () => {
    const text = renderLines(topLines(null, SESSION, { now: NOW }));
    expect(text).toContain('(waiting for the first measure)');
  });
});

describe('fmtDur', () => {
  it('steps seconds to days', () => {
    expect(fmtDur(42000)).toBe('42s');
    expect(fmtDur(360 * 1000)).toBe('6m');
    expect(fmtDur(112 * 60 * 1000)).toBe('1h52m');
    expect(fmtDur(3600 * 52 * 1000)).toBe('2d4h');
  });
});
