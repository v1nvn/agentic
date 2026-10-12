import { describeError, type ErrorResult } from '@v1nvn/agentic-core';

export class ExtractionError extends Error {
  public override readonly cause: unknown;

  public constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = 'ExtractionError';
    this.cause = options.cause;
  }
}

export function toErrorResult(err: unknown): ErrorResult {
  const label = err instanceof ExtractionError ? err.name : 'Error';
  return {
    isError: true,
    content: [{ type: 'text', text: `${label}: ${describeError(err)}` }],
  };
}
