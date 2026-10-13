import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCli,
  HelpRequested,
  helpTextFor,
  parseCli,
  runCli,
  type CliSpec,
} from '../src/cli.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

const spec = (): CliSpec => ({
  name: 'tool',
  description: 'a tool',
  version: '1.2.3',
  options: [{ flags: '--flag', description: 'flag mode' }],
  commands: [
    {
      name: 'inner',
      description: 'inner work',
      argument: { flags: '[file]', description: 'a file' },
      options: [
        { flags: '--key <key>', description: 'key', env: 'TOOL_KEY' },
        {
          flags: '--kind <kind>',
          description: 'kind',
          choices: ['a', 'b'],
          default: 'a',
        },
      ],
    },
  ],
});

function spyStdio(): { out: () => string; err: () => string } {
  const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return {
    out: () => out.mock.calls.map(c => String(c[0])).join(''),
    err: () => err.mock.calls.map(c => String(c[0])).join(''),
  };
}

describe('runCli', () => {
  it('answers --help on stdout with exit 0', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), ['--help'])).toBe(0);
    expect(io.out()).toContain('Usage: tool');
    expect(io.err()).toBe('');
  });

  it('routes subcommand --help to that subcommand, exit 0', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), ['inner', '--help'])).toBe(0);
    expect(io.out()).toContain('Usage: tool inner');
    expect(io.out()).toContain('--key');
    expect(io.out()).not.toContain('--flag');
    expect(io.err()).toBe('');
  });

  it('prints usage to stderr on a bad parse, exit 1 by default', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), ['--bogus'])).toBe(1);
    expect(io.err()).toContain('Usage: tool');
    expect(io.out()).toBe('');
  });

  it('a bad option on a subcommand prints that subcommand usage, not the root listing', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), ['inner', '--bogus'])).toBe(1);
    expect(io.err()).toContain('Usage: tool inner');
    expect(io.err()).not.toContain('Usage: tool [options]');
  });

  it('a parse error on a subcommand option prints the reason and that subcommand usage', async () => {
    const io = spyStdio();
    const numeric = (value: string): number => {
      const n = Number(value);
      if (!Number.isInteger(n)) {
        throw new Error('must be an integer');
      }
      return n;
    };
    const inner = spec().commands![0]!;
    const withParse: CliSpec = {
      ...spec(),
      usageExit: 2,
      commands: [
        {
          ...inner,
          options: [
            ...(inner.options ?? []),
            { flags: '--n <n>', description: 'a number', parse: numeric },
          ],
        },
      ],
    };
    expect(await runCli(withParse, ['inner', '--n', 'abc'])).toBe(2);
    expect(io.err()).toContain(
      "error: option '--n <n>' argument 'abc' is invalid. must be an integer",
    );
    expect(io.err()).toContain('Usage: tool inner');
    expect(io.err()).not.toContain('Usage: tool [options]');
  });

  it('a bare invocation of a command-bearing spec is a usage error', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), [])).toBe(1);
    expect(io.err()).toContain('Usage: tool');
  });

  it('honors the spec usageExit code', async () => {
    spyStdio();
    expect(await runCli({ ...spec(), usageExit: 2 }, ['--bogus'])).toBe(2);
  });

  it('prints the spec version on the version flag, exit 0', async () => {
    const io = spyStdio();
    expect(await runCli(spec(), ['--version'])).toBe(0);
    expect(io.out()).toBe('1.2.3\n');
  });

  it('the version flag wins even when a subcommand also parses', async () => {
    const io = spyStdio();
    const run = vi.fn();
    expect(
      await runCli(
        { ...spec(), commands: [{ ...spec().commands![0]!, run }] },
        ['--version', 'inner'],
      ),
    ).toBe(0);
    expect(io.out()).toBe('1.2.3\n');
    expect(run).not.toHaveBeenCalled();
  });

  it('hands the help payload to the hook instead of printing', async () => {
    const io = spyStdio();
    const hook = vi.fn(() => 7);
    expect(await runCli(spec(), ['inner', '-h'], hook)).toBe(7);
    expect(hook).toHaveBeenCalledWith(
      'inner',
      expect.stringContaining('--key'),
    );
    expect(io.out()).toBe('');
  });

  it('dispatches to the matched command with parsed options and args', async () => {
    spyStdio();
    const run = vi.fn(() => 3);
    expect(
      await runCli(
        { ...spec(), commands: [{ ...spec().commands![0]!, run }] },
        ['inner', 'a.md', '--key=v'],
      ),
    ).toBe(3);
    expect(run).toHaveBeenCalledWith({ key: 'v', kind: 'a' }, ['a.md']);
  });

  it('dispatches a root-only spec with its options and positionals', async () => {
    spyStdio();
    const run = vi.fn();
    const solo: CliSpec = {
      name: 'solo',
      description: 'solo',
      options: [{ flags: '--view', description: 'view mode' }],
      argument: { flags: '[file]', description: 'a file' },
      run,
    };
    expect(await runCli(solo, ['a.md', '--view'])).toBe(0);
    expect(run).toHaveBeenCalledWith({ view: true }, ['a.md']);
  });

  it('prints the thrown message and exits 1 when a run fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const run = () => {
      throw new Error('boom');
    };
    expect(
      await runCli(
        { ...spec(), commands: [{ ...spec().commands![0]!, run }] },
        ['inner'],
      ),
    ).toBe(1);
    expect(err).toHaveBeenCalledWith('boom');
  });

  it('writes nothing while parsing a bad invocation', async () => {
    const io = spyStdio();
    await runCli(spec(), ['--bogus']);
    expect(io.out()).toBe('');
  });
});

describe('parseCli', () => {
  it('returns the invocation: command, options, positionals, root options', () => {
    const parsed = parseCli(spec(), ['inner', 'a.md', '--key=v']);
    expect(parsed).toEqual({
      command: 'inner',
      options: { key: 'v', kind: 'a' },
      args: ['a.md'],
      root: {},
    });
  });

  it('returns a root invocation with the command undefined', () => {
    const parsed = parseCli(spec(), ['--flag']);
    expect(parsed).toEqual({
      command: undefined,
      options: { flag: true },
      args: [],
      root: { flag: true },
    });
  });

  it('returns undefined for an unknown flag, a missing value, and an excess positional', () => {
    expect(parseCli(spec(), ['--bogus'])).toBeUndefined();
    expect(parseCli(spec(), ['inner', '--key'])).toBeUndefined();
    expect(parseCli(spec(), ['inner', 'a.md', 'b.md'])).toBeUndefined();
  });

  it('hands a help ask to the payload hook', () => {
    const hook = vi.fn(() => ({ helped: true }) as const);
    expect(parseCli(spec(), ['inner', '--help'], hook)).toEqual({
      helped: true,
    });
    expect(hook).toHaveBeenCalledWith('inner', expect.any(String));
  });

  it('returns HelpRequested carrying the asked command when no hook is given', () => {
    const asked = parseCli(spec(), ['inner', '--help']);
    expect(asked).toBeInstanceOf(HelpRequested);
    expect((asked as HelpRequested).command.name()).toBe('inner');
    expect(parseCli(spec(), ['--help']) instanceof HelpRequested).toBe(true);
  });

  it('folds an env-backed option in, flag beating env', () => {
    vi.stubEnv('TOOL_KEY', 'env-key');
    expect(
      (
        parseCli(spec(), ['inner', '--key=flag-key']) as {
          options: Record<string, unknown>;
        }
      ).options.key,
    ).toBe('flag-key');
    expect(
      (parseCli(spec(), ['inner']) as { options: Record<string, unknown> })
        .options.key,
    ).toBe('env-key');
    vi.unstubAllEnvs();
  });

  it('rejects a value outside the choices and keeps the default', () => {
    expect(parseCli(spec(), ['inner', '--kind', 'z'])).toBeUndefined();
    expect(
      (parseCli(spec(), ['inner']) as { options: Record<string, unknown> })
        .options.kind,
    ).toBe('a');
  });
});

describe('buildCli and helpTextFor', () => {
  it('names commands and renders their help', () => {
    const program = buildCli(spec());
    expect(program.name()).toBe('tool');
    expect(program.commands.map(c => c.name())).toEqual(['inner']);
    expect(helpTextFor(spec(), 'inner')).toContain('--key');
    expect(helpTextFor(spec(), 'tool')).toContain('Usage: tool');
  });

  it('refuses an unknown help topic', () => {
    expect(() => helpTextFor(spec(), 'nope')).toThrow(/no 'nope' command/);
  });
});
