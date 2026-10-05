import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseQuietly, printUsageAndExit } from '../src/cli.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseQuietly', () => {
  const program = () =>
    new Command()
      .name('tool')
      .argument('[file]')
      .option('--flag', 'flag mode');

  it('returns the parsed program with opts and positionals', () => {
    const parsed = parseQuietly(program(), ['a.md', '--flag']);
    expect(parsed?.opts<{ flag: boolean | undefined }>().flag).toBe(true);
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
