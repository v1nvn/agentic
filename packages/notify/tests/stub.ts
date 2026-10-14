/**
 * The notify engine tests' stub session: it answers the nouns the hooks call —
 * the osascript exec and the debug log — from memory the way the testing mock
 * answers clock, store and env, and records what crossed. The island loader
 * keeps tests plugin-relative, so each home owns its stub.
 */

export type RunAnswer = {
  readonly exitCode: number;
  readonly stderr?: string;
  readonly stdout?: string;
};

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
    event: 'process.run',
    hook: (_$: unknown, e: { argv: readonly string[] }) => unknown,
  ): unknown;
  (
    event: 'ui.log',
    hook: (_$: unknown, e: { text: string; to?: string }) => unknown,
  ): unknown;
}

/** The stub session beneath the home's hooks: `stubEngine(on, answer)` records and answers. */
export function stubEngine(
  on: StubOn,
  answer: RunAnswer = { exitCode: 0 },
): EngineStub {
  const wire = on as OnCalls;
  const logs: string[] = [];
  const runs: (readonly string[])[] = [];
  const stub: EngineStub = { answer, logs, runs };
  wire('classic.Notification', () => ({}));
  wire('classic.Stop', () => ({}));
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
