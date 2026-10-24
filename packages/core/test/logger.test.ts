import { describe, expect, it, vi } from 'vitest';

import {
  describeError,
  loggerFromEnv,
  toolHandler,
  type ErrorResult,
  type Logger,
} from '../src/index.ts';

const toErrorResult = (err: unknown): ErrorResult => ({
  content: [{ type: 'text', text: describeError(err) }],
  isError: true,
});

const failingTool = (log: Logger) =>
  toolHandler<ErrorResult>(log, toErrorResult)('pinned', (): ErrorResult => {
    throw new Error('boom');
  });

describe('loggerFromEnv', () => {
  it('falls back to the default level on an invalid value', () => {
    expect(loggerFromEnv({ LEVEL: 'verbose' }, 'LEVEL').activeLevel).toBe(
      'info',
    );
    expect(
      loggerFromEnv({ LEVEL: 'verbose' }, 'LEVEL', 'warn').activeLevel,
    ).toBe('warn');
    expect(loggerFromEnv({}, 'LEVEL', 'debug').activeLevel).toBe('debug');
  });

  it('reads a valid level from the env, and silent mutes the wrapper error', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    const loud = failingTool(loggerFromEnv({ LEVEL: 'verbose' }, 'LEVEL'));
    expect(loud().isError).toBe(true);
    expect(write.mock.calls.flat().join('')).toContain('pinned failed: boom');

    write.mockClear();
    const quiet = failingTool(loggerFromEnv({ LEVEL: 'silent' }, 'LEVEL'));
    expect(quiet().isError).toBe(true);
    expect(write).not.toHaveBeenCalled();

    write.mockRestore();
  });
});
