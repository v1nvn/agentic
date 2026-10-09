import type { Line } from '../src/text.js';

export type UsageAcc = {
  cacheCreation: number;
  cacheRead: number;
  calls: number;
  input: number;
  output: number;
};

export type DayRow = UsageAcc & { day: string };

export type ModelRow = UsageAcc & { model: string };

export type ScanResult = {
  days: DayRow[];
  last24: ModelRow[];
  models: ModelRow[];
  now: string;
};

export type TopRateLimit = {
  kind: string;
  percentUsed: number;
  resetsAt: number | null;
};

export type TopMeasure = {
  startedAt: number | null;
  tokens: number | null;
  window: number;
  percent: number | null;
  compactAt: number | null;
  costUsd: number | null;
  rateLimits: TopRateLimit[];
  categories: { kind: string; name: string; tokens: number }[];
  mcp: { server: string; tokens: number }[];
  memory: { path: string; tokens: number }[];
};

export type TopUsage = {
  cacheRead: number;
  input: number;
  output: number;
};

export type TopFlow = {
  agents: { id: string; rate: number; ring: number[] }[];
  firstChunkMs: number | null;
  hit: number | null;
  outRate: number;
  outRing: number[];
  thinkRate: number;
  thinkRing: number[];
  turnEnd: string | null;
  turnMs: number | null;
  usage: TopUsage | null;
};

export type TopState = {
  flow: TopFlow;
  measure: TopMeasure | null;
  notices: {
    arrival: { at: number; kind: string; source: string } | null;
    compact: { after: number | null; at: number; before: number | null } | null;
  };
  running: {
    calls: { at: number; id: string; label: string; tool: string }[];
    children: { argv: string; at: number; id: string }[];
  };
  spawns: { at: number; id: string }[];
};

declare module 'claude-code' {
  interface PluginState {
    tokens: {
      top: null | TopState;
      usage: null | { lines: Line[]; scan: ScanResult };
    };
  }
}
