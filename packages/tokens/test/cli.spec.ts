import { buildCli, runCli } from '@v1nvn/agentic-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usageSpec } from '../src/cli.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

function spyStdio(): { out: () => string; err: () => string } {
  const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return {
    out: () => out.mock.calls.map(c => String(c[0])).join(''),
    err: () => err.mock.calls.map(c => String(c[0])).join(''),
  };
}

describe('the runCli door', () => {
  it('answers usage --help on stdout with 0, printing the command own flags', async () => {
    const io = spyStdio();
    expect(await runCli(usageSpec(), ['usage', '--help'])).toBe(0);
    expect(io.out()).toContain('Usage: tokens-report usage');
    expect(io.out()).toContain('--json');
    expect(io.err()).toBe('');
  });

  it('answers bare --help with the program listing the command', async () => {
    const io = spyStdio();
    expect(await runCli(usageSpec(), ['--help'])).toBe(0);
    expect(io.out()).toContain('Usage: tokens-report');
    expect(io.out()).toContain('usage');
  });

  it('a bare invocation and a flag outside the command are usage errors, exit 1', async () => {
    const io = spyStdio();
    expect(await runCli(usageSpec(), [])).toBe(1);
    expect(await runCli(usageSpec(), ['--json'])).toBe(1);
    expect(await runCli(usageSpec(), ['top'])).toBe(1);
    expect(io.err()).toContain('Usage: tokens-report');
    expect(io.out()).toBe('');
  });
});

describe('buildCli help', () => {
  it('bare lists the usage command; its flags live on the command', () => {
    const program = buildCli(usageSpec());
    expect(program.helpInformation()).toContain('usage');
    const usage = program.commands.find(c => c.name() === 'usage');
    expect(usage?.helpInformation()).toContain('--json');
  });
});
