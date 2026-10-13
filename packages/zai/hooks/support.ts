/**
 * The zai island's own support: the exec/accept/parse door, pane chrome as
 * fields, the one line a failed exec shows, and the narrow line type the pane
 * renders. The engine's island loader imports its own files by relative path
 * alone, so what a home's hooks run lives in the home; process-side surfaces
 * import @v1nvn/agentic-core instead. The CLI emits the finished lines —
 * the island never formats, it only accepts and renders them.
 */

export interface Segment {
  ink?: 'bold' | 'dim' | 'green' | 'magenta';
  text: string;
}

export type Line = readonly Segment[];

export interface ToolLineSource {
  readonly deny?: string;
  readonly isError?: boolean;
  readonly result?: unknown;
  readonly text?: string;
}

interface Stdio {
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

function stdioOf(result: unknown): Stdio {
  return typeof result === 'object' && result !== null ? result : {};
}

function stdoutOf(result: unknown): string {
  const { stdout } = stdioOf(result);
  return typeof stdout === 'string' ? stdout : '';
}

/** The one line an exec shows: the refusal's reason, stdout, else stderr or `fallback`. */
export function lineOf(call: ToolLineSource, fallback: string): string {
  if (call.deny !== undefined) {
    return call.deny;
  }
  if (call.isError === true) {
    return call.text ?? fallback;
  }
  const out = stdoutOf(call.result).trim();
  if (out !== '') {
    return out;
  }
  const { stderr } = stdioOf(call.result);
  const err = typeof stderr === 'string' ? stderr.trim() : '';
  return err !== '' ? err : fallback;
}

export type Door<T> =
  | { readonly line: string; readonly ok: false }
  | { readonly ok: true; readonly value: T };

/**
 * The door every pane command enters with its exec: stdout parsed and
 * accepted, or the one line a failed exec shows. A refused door keeps the
 * pane's last good value — a refresh re-scan never logs.
 */
export function acceptJson<T>(
  call: ToolLineSource,
  fallback: string,
  accept: (parsed: unknown) => null | T,
): Door<T> {
  function failed(): Door<T> {
    return { ok: false, line: lineOf(call, fallback) };
  }
  if (call.deny !== undefined || call.isError === true) {
    return failed();
  }
  try {
    const value = accept(JSON.parse(stdoutOf(call.result)));
    return value === null ? failed() : { ok: true, value };
  } catch {
    return failed();
  }
}

export interface PaneSpec {
  /** The empty-state line the pane draws before any report has landed. */
  readonly empty?: string;
  /** Whether the pane wraps its lines in a box frame (two rows of chrome). */
  readonly frame: boolean;
  readonly id: string;
  /** Re-scan the pane's command this often while it stays open; absent, never. */
  readonly refreshMs?: number;
  readonly title: string;
}

/** The rows a pane asks for: its lines, plus the frame's two. */
export function paneRows(lines: number, pane: PaneSpec): number {
  return lines + (pane.frame ? 2 : 0);
}

/** Whether the pane is still open — the gate a refresh re-scan waits on. */
export function showsPane(
  panes: readonly { readonly id: string }[],
  pane: PaneSpec,
): boolean {
  return panes.some(p => p.id === pane.id);
}

/** The exec command's descriptor: one row per command, registered in one loop. */
export interface CommandSpec {
  readonly description: string;
  readonly name: string;
}
