// Self-contained by the validator's contract: the types file may not reach
// into src, so the state shapes it needs live inline.
declare module 'claude-code' {
  interface PluginState {
    tokens: {
      top: null | {
        flow: {
          agents: { id: string; rate: number; ring: number[] }[];
          firstChunkMs: number | null;
          hit: number | null;
          outRate: number;
          outRing: number[];
          thinkRate: number;
          thinkRing: number[];
          turnEnd: string | null;
          turnMs: number | null;
          usage: { cacheRead: number; input: number; output: number } | null;
        };
        measure: {
          categories: { kind: string; name: string; tokens: number }[];
          compactAt: number | null;
          costUsd: number | null;
          mcp: { server: string; tokens: number }[];
          memory: { path: string; tokens: number }[];
          rateLimits: {
            kind: string;
            percentUsed: number;
            resetsAt: number | null;
          }[];
          startedAt: number | null;
          tokens: number | null;
          window: number;
          percent: number | null;
        } | null;
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
      usage: null | {
        lines: {
          ink?: 'bold' | 'dim' | 'green' | 'magenta';
          text: string;
        }[][];
      };
    };
  }
}
