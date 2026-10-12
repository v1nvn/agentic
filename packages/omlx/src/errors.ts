import { describeError, type ErrorResult } from '@v1nvn/agentic-core';

export class OmlxError extends Error {
  public override readonly cause: unknown;

  public constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = 'OmlxError';
    this.cause = options.cause;
  }
}

export function toErrorResult(err: unknown): ErrorResult {
  if (err instanceof OmlxError) {
    // Messages already carry the remedy ("unreachable at <url> — start it
    // with: omlx serve"); a class-name prefix would only repeat them.
    return {
      isError: true,
      content: [{ type: 'text', text: err.message }],
    };
  }
  const label = err instanceof Error ? err.name : 'Error';
  return {
    isError: true,
    content: [{ type: 'text', text: `${label}: ${describeError(err)}` }],
  };
}
