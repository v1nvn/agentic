export type Segment = {
  ink?: 'bold' | 'dim';
  text: string;
};

export type Line = Segment[];

declare module 'claude-code' {
  interface PluginState {
    zai: { usage: Line[] | null };
  }
}
