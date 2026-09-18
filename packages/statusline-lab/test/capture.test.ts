import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import p1 from '../assets/payloads/p1.json' with { type: 'json' };
import multi from '../assets/ticks/multi.json' with { type: 'json' };
import { capture } from '../src/capture.js';
import { createHomes, snapshotTree } from './fixtures.js';

// The canonical form, pinned byte-for-byte: object keys sorted recursively
// (code-unit order), array order preserved (task order is semantic), two-space
// indent, exactly one trailing newline.
const CANONICAL_P1 = `{
  "context_window": {
    "context_window_size": 200000,
    "current_usage": {
      "cache_creation_input_tokens": 18400,
      "cache_read_input_tokens": 90200,
      "input_tokens": 8200,
      "output_tokens": 8400
    },
    "remaining_percentage": 41.6,
    "total_input_tokens": 116800,
    "total_output_tokens": 8400,
    "used_percentage": 58.4
  },
  "cost": {
    "total_api_duration_ms": 742000,
    "total_cost_usd": 3.87,
    "total_duration_ms": 4925000,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "cwd": "/demo/atlas-web",
  "effort": {
    "level": "high"
  },
  "exceeds_200k_tokens": false,
  "fast_mode": false,
  "model": {
    "display_name": "Opus",
    "id": "claude-opus-5"
  },
  "output_style": {
    "name": "default"
  },
  "pr": {
    "number": 4821,
    "review_state": "pending",
    "url": "https://github.com/vineet/atlas-web/pull/4821"
  },
  "prompt_cache": {
    "cache_write_tokens": 352000,
    "caching_observed": true,
    "expected_rebuilds": 1,
    "expires_at": 1788869062,
    "hit_ratio": 0.94,
    "last_miss_at": 1788865162,
    "last_miss_cause": {
      "causes": [
        "tools_changed"
      ],
      "tools_added": 2,
      "tools_removed": 0
    },
    "miss_recache_tokens": 310200,
    "misses": 3,
    "requests": 214,
    "ttl": "1h",
    "warm": true
  },
  "rate_limits": {
    "five_hour": {
      "resets_at": 1788880972,
      "used_percentage": 23.5
    },
    "seven_day": {
      "resets_at": 1789385542,
      "used_percentage": 41.2
    },
    "spend_limit": {
      "resets_at": 1789817542,
      "used_percentage": 62.8
    }
  },
  "session_id": "a1b2c3d4demo",
  "session_name": "statusline-makeover",
  "thinking": {
    "enabled": true
  },
  "transcript_path": "/Users/vineet/.claude/projects/demo/x.jsonl",
  "version": "2.1.275",
  "vim": {
    "mode": "NORMAL"
  },
  "workspace": {
    "added_dirs": [],
    "current_dir": "/demo/atlas-web",
    "project_dir": "/demo/atlas-web",
    "repo": {
      "host": "github.com",
      "name": "atlas-web",
      "owner": "vineet"
    }
  }
}
`;

const CANONICAL_MULTI = `{
  "columns": 200,
  "tasks": [
    {
      "contextWindowSize": 200000,
      "description": "Reading unit 2's landed pattern",
      "effort": "high",
      "id": "row-explore",
      "label": "Explore",
      "model": "Sonnet [1m]",
      "name": "explore",
      "startTime": 1788862735,
      "tokenCount": 142300
    },
    {
      "contextWindowSize": 180000,
      "description": "Golden capture for the subagent rows",
      "effort": "medium",
      "id": "row-tests",
      "label": "Tests",
      "model": "Opus",
      "name": "test-writer",
      "startTime": 1788869875000,
      "tokenCount": 9000
    },
    {
      "contextWindowSize": 0,
      "description": "",
      "effort": "low",
      "id": "row-review",
      "label": "Review",
      "model": "Haiku",
      "name": "reviewer",
      "startTime": 1788869990,
      "tokenCount": 0
    },
    {
      "contextWindowSize": 1000000,
      "description": "Name stands in when label is empty",
      "effort": "",
      "id": "row-fork",
      "label": "",
      "model": "Sonnet",
      "name": "Fork",
      "startTime": 0,
      "tokenCount": 950000
    },
    {
      "contextWindowSize": 0,
      "description": "Idle",
      "effort": "",
      "id": "row-idle",
      "label": "Idle",
      "model": "",
      "name": "idle",
      "startTime": 1788870001,
      "tokenCount": 0
    },
    {
      "contextWindowSize": 200000,
      "description": "Row without an id renders no line",
      "effort": "high",
      "label": "NoId",
      "model": "Opus",
      "name": "ghost",
      "startTime": 1788869950,
      "tokenCount": 1000
    }
  ]
}
`;

// Reverses key order at every object level and strips all whitespace — the
// input must differ from the canonical output for the normalization pin to
// prove anything.
function scrambled(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(scrambled).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .reverse()
      .map(([key, nested]) => `${JSON.stringify(key)}:${scrambled(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function slotPath(home: string, kind: 'main' | 'tick'): string {
  const leaf = kind === 'main' ? 'payloads' : 'ticks';
  return join(
    home,
    '.claude',
    'plugins',
    'data',
    'statusline-lab-agentic',
    leaf,
    'latest.json',
  );
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('capture: shapes and slots', () => {
  it('files a main payload at payloads/latest.json in the data dir, canonically serialized', () => {
    const home = homes.newHome();
    const stdin = `\n\n   ${scrambled(p1)}   \n`;

    const result = capture({ home, stdin });

    expect(result.kind).toBe('main');
    expect(result.path).toBe(slotPath(home, 'main'));
    expect(result.bytes).not.toBe(stdin);
    expect(result.bytes).toBe(CANONICAL_P1);
    expect(readFileSync(result.path, 'utf8')).toBe(CANONICAL_P1);
  });

  it('files a subagent tick at ticks/latest.json in the data dir, canonically serialized', () => {
    const home = homes.newHome();
    const stdin = `\n${scrambled(multi)}\n`;

    const result = capture({ home, stdin });

    expect(result.kind).toBe('tick');
    expect(result.path).toBe(slotPath(home, 'tick'));
    expect(result.bytes).not.toBe(stdin);
    expect(result.bytes).toBe(CANONICAL_MULTI);
    expect(readFileSync(result.path, 'utf8')).toBe(CANONICAL_MULTI);
  });

  it('calls the tick only on a tasks array — a bare tasks key falls through to main', () => {
    const home = homes.newHome();

    const result = capture({
      home,
      stdin: '{"tasks":"not-an-array","model":{"id":"claude-opus-5"}}',
    });

    expect(result.kind).toBe('main');
    expect(result.path).toBe(slotPath(home, 'main'));
  });

  it('files an empty tick at ticks/latest.json — zero running tasks is a live panel state', () => {
    const home = homes.newHome();

    const result = capture({ home, stdin: '{"tasks":[],"columns":120}' });

    expect(result.kind).toBe('tick');
    expect(result.path).toBe(slotPath(home, 'tick'));
    expect(result.bytes).toBe('{\n  "columns": 120,\n  "tasks": []\n}\n');
    expect(readFileSync(result.path, 'utf8')).toBe(result.bytes);
  });
});

describe('capture: idempotence', () => {
  it('re-capturing its own main-payload output is a byte-identical no-op', () => {
    const home = homes.newHome();
    const once = capture({ home, stdin: scrambled(p1) });
    const onDisk = readFileSync(once.path, 'utf8');

    const twice = capture({ home, stdin: once.bytes });

    expect(twice).toEqual(once);
    expect(readFileSync(once.path, 'utf8')).toBe(onDisk);
    expect(readFileSync(once.path, 'utf8')).toBe(twice.bytes);
  });

  it('re-capturing its own tick output is a byte-identical no-op', () => {
    const home = homes.newHome();
    const once = capture({ home, stdin: scrambled(multi) });
    const onDisk = readFileSync(once.path, 'utf8');

    const twice = capture({ home, stdin: once.bytes });

    expect(twice).toEqual(once);
    expect(readFileSync(once.path, 'utf8')).toBe(onDisk);
    expect(readFileSync(once.path, 'utf8')).toBe(twice.bytes);
  });
});

describe('capture: rejection', () => {
  it.each([
    { name: 'non-JSON text', stdin: 'definitely { not json' },
    { name: 'empty stdin', stdin: '' },
    { name: 'a top-level array', stdin: '[{"columns":80,"tasks":[]}]' },
    { name: 'a top-level scalar', stdin: '42' },
    { name: 'null', stdin: 'null' },
  ])('$name: one-line error, nothing written', ({ stdin }) => {
    const home = homes.newHome();
    const before = snapshotTree(home);

    let message = '';
    try {
      capture({ home, stdin });
    } catch (e) {
      message = (e as Error).message;
    }

    expect(message).not.toBe('');
    expect(message).not.toMatch(/\n/);
    expect(snapshotTree(home)).toEqual(before);
  });
});

describe('capture: containment', () => {
  it('writes only inside the data dir — both slots together touch nothing else', () => {
    const home = homes.newHome();
    expect(snapshotTree(home)).toEqual({});

    capture({ home, stdin: scrambled(p1) });
    capture({ home, stdin: scrambled(multi) });

    expect(Object.keys(snapshotTree(home)).sort()).toEqual([
      '.claude/plugins/data/statusline-lab-agentic/payloads/latest.json',
      '.claude/plugins/data/statusline-lab-agentic/ticks/latest.json',
    ]);
  });
});

describe('capture: fidelity', () => {
  // Capture stores what came in: re-anchoring timestamps is a gallery
  // concern, and a rewritten timestamp would falsify the no-op pin above.
  it('keeps incoming timestamps verbatim in both shapes', () => {
    const home = homes.newHome();

    const payload = capture({
      home,
      stdin: '{"session_id":"s","prompt_cache":{"expires_at":1000000000}}',
    });
    expect(payload.bytes).toContain('"expires_at": 1000000000');

    const tick = capture({
      home,
      stdin: '{"tasks":[{"id":"a","startTime":500}],"columns":80}',
    });
    expect(tick.bytes).toContain('"startTime": 500');
  });
});
