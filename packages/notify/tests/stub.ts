/**
 * The notify engine tests' stub session: it answers the nouns the hooks call —
 * the osascript exec, the debug log, and the session registry the subtitle
 * reads — from memory the way the testing mock answers clock and store, and
 * records what crossed. The island loader keeps tests plugin-relative, so each
 * home owns its stub.
 */

export type RunAnswer = {
  readonly exitCode: number;
  readonly stderr?: string;
  readonly stdout?: string;
};

/** One `~/.claude/sessions/<pid>.json` as the scan meets it. */
export type RegistryEntry = {
  readonly file: string;
  readonly mtimeMs: number;
  readonly name?: string;
  readonly sessionId: string;
};

const HOME = '/home/tester';

export interface EngineStub {
  /** The osascript exec's answer; replace it mid-test. */
  answer: RunAnswer;
  readonly logs: readonly string[];
  readonly runs: readonly (readonly string[])[];
}

type StubOn = (...args: never[]) => unknown;

interface OnCalls {
  (
    event: 'classic.Notification',
    hook: (_$: unknown, e: { message: string }) => unknown,
  ): unknown;
  (event: 'classic.Stop', hook: () => unknown): unknown;
  (
    event: 'env.get',
    hook: (_$: unknown, e: { name: string }) => unknown,
  ): unknown;
  (
    event: 'fs.list',
    hook: (_$: unknown, e: { path?: string }) => unknown,
  ): unknown;
  (
    event: 'fs.read',
    hook: (_$: unknown, e: { path: string }) => unknown,
  ): unknown;
  (
    event: 'process.run',
    hook: (_$: unknown, e: { argv: readonly string[] }) => unknown,
  ): unknown;
  (
    event: 'ui.log',
    hook: (_$: unknown, e: { text: string; to?: string }) => unknown,
  ): unknown;
}

/** The stub session beneath the home's hooks: `stubEngine(on, answer, registry)` records and answers. */
export function stubEngine(
  on: StubOn,
  answer: RunAnswer = { exitCode: 0 },
  registry: readonly RegistryEntry[] = [],
): EngineStub {
  const wire = on as OnCalls;
  const logs: string[] = [];
  const runs: (readonly string[])[] = [];
  const stub: EngineStub = { answer, logs, runs };
  const dir = `${HOME}/.claude/sessions`;
  function entry(path: string | undefined) {
    return registry.find(r => `${dir}/${r.file}` === path);
  }
  wire('classic.Notification', () => ({}));
  wire('classic.Stop', () => ({}));
  wire('env.get', (_$, e) => ({
    value: e.name === 'HOME' ? HOME : undefined,
  }));
  wire('fs.list', (_$, e) => {
    if (e.path !== dir) {
      throw new Error(`ENOENT: ${e.path}`);
    }
    return {
      value: registry.map(r => ({
        name: r.file,
        kind: 'file' as const,
        size: 0,
        mtimeMs: r.mtimeMs,
        isLink: false,
      })),
    };
  });
  wire('fs.read', (_$, e) => {
    const row = entry(e.path);
    if (row === undefined) {
      throw new Error(`ENOENT: ${e.path}`);
    }
    return {
      value: JSON.stringify({ sessionId: row.sessionId, name: row.name }),
    };
  });
  wire('process.run', (_$, e) => {
    runs.push(e.argv);
    return { value: stub.answer };
  });
  wire('ui.log', (_$, e) => {
    logs.push(e.to === 'debug' ? `[debug] ${e.text}` : e.text);
    return { value: undefined };
  });
  return stub;
}
