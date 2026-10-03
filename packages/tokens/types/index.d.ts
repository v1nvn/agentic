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

declare module 'claude-code' {
  interface PluginState {
    tokens: { usage: null | ScanResult };
  }
}
