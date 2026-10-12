// Self-contained by the validator's contract: the types file may not reach
// into src, so the state names the raw payload's top level only — the island
// re-enters src/format.ts's types at its read door.
declare module 'claude-code' {
  interface PluginState {
    zai: {
      usage: null | {
        model: unknown;
        platform: string;
        quota: unknown;
        tool: unknown;
      };
    };
  }
}
