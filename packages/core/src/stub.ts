/**
 * The engine-test kit: the stub session every mod home's tests ride, stamped
 * beside them under `tests/kit/`. It answers the nouns a mod's hooks call —
 * command registration, logs, panes, the Bash exec — from memory the way the
 * testing mock answers clock, store and env, and records what crossed.
 */

export type ExecAnswer =
  | { readonly deny: string }
  | { readonly stderr?: string; readonly stdout: string };

export type ExecReply = (command: string) => ExecAnswer;

export interface EngineStub {
  /** The Bash exec's answer; replace it mid-test (a refresh that starts failing). */
  answer: ExecReply;
  /** Dismisses an open pane, the way the person's Esc does. */
  readonly close: (id: string) => void;
  readonly commands: readonly string[];
  readonly logs: readonly string[];
  readonly opens: readonly { readonly id: string; readonly rows: number }[];
  readonly registered: readonly string[];
}

type StubOn = (...args: never[]) => unknown;

interface OnCalls {
  (
    event: 'command.register',
    hook: (_$: unknown, e: { name: string }) => unknown,
  ): unknown;
  (event: 'session.start' | 'ui.panes', hook: () => unknown): unknown;
  (
    event: 'ui.log',
    hook: (_$: unknown, e: { text: string }) => unknown,
  ): unknown;
  (
    event: 'ui.open',
    hook: (_$: unknown, e: { id: string; rows?: number }) => unknown,
  ): unknown;
  (
    event: 'tool.call',
    matcher: { tool: string },
    hook: (_$: unknown, e: { command?: unknown }) => unknown,
  ): unknown;
}

/** The stub session beneath a home's hooks: `stubEngine(on, answer)` records and answers. */
export function stubEngine(
  on: StubOn,
  answer: ExecAnswer | ExecReply = { stdout: '' },
): EngineStub {
  const wire = on as OnCalls;
  const commands: string[] = [];
  const logs: string[] = [];
  const opens: { id: string; rows: number }[] = [];
  const registered: string[] = [];
  const openIds = new Set<string>();
  const stub: EngineStub = {
    answer: typeof answer === 'function' ? answer : () => answer,
    close: id => {
      openIds.delete(id);
    },
    commands,
    logs,
    opens,
    registered,
  };
  wire('command.register', (_$, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  wire('session.start', () => ({ cwd: '/work' }));
  wire('ui.log', (_$, e) => {
    logs.push(e.text);
    return { value: undefined };
  });
  wire('ui.open', (_$, e) => {
    opens.push({ id: e.id, rows: e.rows ?? 0 });
    openIds.add(e.id);
    return { value: { isPlaced: true } };
  });
  wire('ui.panes', () => ({
    value: [...openIds].map(id => ({
      id,
      isFocused: true,
      isPlaced: true,
      isShown: true,
    })),
  }));
  wire('tool.call', { tool: 'Bash' }, (_$, e) => {
    const command = String(e.command);
    commands.push(command);
    const a = stub.answer(command);
    return 'deny' in a
      ? { deny: a.deny }
      : {
          result: {
            interrupted: false,
            stderr: a.stderr ?? '',
            stdout: a.stdout,
          },
        };
  });
  return stub;
}
