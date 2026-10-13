/**
 * The md island's own support: the one line an exec shows and the command
 * descriptor its registration walks. The engine's island loader imports its
 * own files by relative path alone, so what a home's hooks run lives in the
 * home; process-side surfaces import @v1nvn/agentic-core instead.
 */

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

/** The exec command's descriptor: one row per command, registered in one loop. */
export interface CommandSpec {
  readonly description: string;
  readonly name: string;
}
