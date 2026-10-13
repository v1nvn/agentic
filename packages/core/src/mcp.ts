import type { Logger } from './logger.ts';

export interface TextContent {
  readonly text: string;
  readonly type: 'text';
}

// The index signature mirrors the SDK's CallToolResult (zod-inferred, so it
// carries one); without it an interface would not assign to that type.
export interface ErrorResult {
  [key: string]: unknown;
  readonly content: TextContent[];
  readonly isError: true;
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type ToolRun<Args, Result> = (args: Args) => Promise<Result> | Result;

/** A zod schema, named structurally so core stays zod-free. */
export interface ToolInputSchema<Args> {
  parse(raw: unknown): Args;
}

/**
 * The wrapper owns the error-drift class: a thrown or rejected error (zod
 * parse included) logs and answers an `isError` result instead of escaping
 * the tool call.
 */
export function toolHandler<Result>(
  log: Logger,
  toErrorResult: (err: unknown) => Result,
) {
  return tool;

  function tool<Args>(
    name: string,
    run: (args: Args) => Promise<Result>,
    schema?: ToolInputSchema<Args>,
  ): (raw?: unknown) => Promise<Result>;
  function tool<Args>(
    name: string,
    run: (args: Args) => Result,
    schema?: ToolInputSchema<Args>,
  ): (raw?: unknown) => Result;
  function tool<Args>(
    name: string,
    run: ToolRun<Args, Result>,
    schema?: ToolInputSchema<Args>,
  ): ToolRun<unknown, Result> {
    function fail(err: unknown): Result {
      log.error(`${name} failed: ${describeError(err)}`);
      return toErrorResult(err);
    }
    return raw => {
      try {
        const args = schema === undefined ? (raw as Args) : schema.parse(raw);
        const result = run(args);
        return result instanceof Promise
          ? result.then(undefined, fail)
          : result;
      } catch (err) {
        return fail(err);
      }
    };
  }
}
