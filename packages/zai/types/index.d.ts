// Self-contained by the validator's contract: the types file may not reach
// into src, so the state names the lines payload the CLI emits — the island's
// own narrow line shape, spelled inline.
declare module 'claude-code' {
  interface PluginState {
    zai: {
      usage: null | {
        lines: readonly (readonly {
          ink?: 'bold' | 'dim' | 'green' | 'magenta';
          text: string;
        }[])[];
      };
    };
  }
}
