import { Command } from 'commander';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hookOrPrint, parseQuietly, printUsageAndExit } from '../src/cli.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseQuietly', () => {
  const program = () =>
    new Command()
      .name('tool')
      .argument('[file]')
      .option('--hook', 'hook mode');

  it('returns the parsed program with opts and positionals', () => {
    const parsed = parseQuietly(program(), ['a.md', '--hook']);
    expect(parsed?.opts<{ hook: boolean | undefined }>().hook).toBe(true);
    expect(parsed?.args).toEqual(['a.md']);
  });

  it('accepts the --flag=value form', () => {
    const p = new Command().name('tool').option('--key <key>', 'key');
    expect(parseQuietly(p, ['--key=v'])?.opts().key).toBe('v');
  });

  it('returns undefined for an unknown flag, a missing value, an excess positional, and --help', () => {
    expect(parseQuietly(program(), ['--bogus'])).toBeUndefined();
    expect(
      parseQuietly(new Command().name('tool').option('--key <key>', 'key'), [
        '--key',
      ]),
    ).toBeUndefined();
    expect(parseQuietly(program(), ['a.md', 'b.md'])).toBeUndefined();
    expect(parseQuietly(program(), ['--help'])).toBeUndefined();
  });

  it('writes nothing while parsing', () => {
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    parseQuietly(program(), ['--bogus']);
    expect(err).not.toHaveBeenCalled();
    expect(out).not.toHaveBeenCalled();
  });
});

describe('printUsageAndExit', () => {
  it('prints the generated usage and exits 1', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    printUsageAndExit(new Command().name('tool').option('--key <key>', 'key'));
    expect(err).toHaveBeenCalledTimes(1);
    expect(String(err.mock.calls[0][0])).toContain('--key');
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('hookOrPrint', () => {
  it('direct mode prints the body on stdout', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await hookOrPrint(false, 'query failed', () => 'the report');
    expect(log).toHaveBeenCalledWith('the report');
  });

  it('direct mode prints the error and exits 1 when the body throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    await hookOrPrint(false, 'query failed', () => {
      throw new Error('boom');
    });
    expect(err).toHaveBeenCalledWith('boom');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('hook mode blocks with the body run on the stdin event', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stdin = new PassThrough();
    const promise = hookOrPrint(true, 'query failed', event => `sid=${event?.session_id}` , stdin);
    stdin.end('{"session_id":"s1"}');
    await promise;
    const emitted = JSON.parse(String(out.mock.calls[0][0])) as {
      decision: string;
      reason: string;
    };
    expect(emitted).toEqual({ decision: 'block', reason: 'sid=s1' });
  });

  it('hook mode blocks with the failure reason when the body throws', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stdin = new PassThrough();
    const promise = hookOrPrint(true, 'query failed', () => {
      throw new Error('boom');
    }, stdin);
    stdin.end('{}');
    await promise;
    const emitted = JSON.parse(String(out.mock.calls[0][0])) as {
      decision: string;
      reason: string;
    };
    expect(emitted).toEqual({ decision: 'block', reason: 'query failed: boom' });
  });
});
