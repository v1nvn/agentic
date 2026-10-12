import { readFileSync } from 'node:fs';

import { runCli } from '@v1nvn/agentic-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildProgram,
  helpFor,
  parseArgs,
  statuslineSpec,
  VERSION,
} from '../src/cli.js';

// Read the manifest off disk so the test sees the published file, not the
// bundler-resolved import src/cli.ts uses.
const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

describe('buildProgram', () => {
  it('names the bin after the package', () => {
    expect(buildProgram().name()).toBe('statusline');
  });

  it('rides the manifest version', () => {
    expect(VERSION).toBe(manifest.version);
  });
});

describe('parseArgs', () => {
  it('parses --version', () => {
    expect(parseArgs(['--version'])).toEqual({ version: true });
  });

  it('a bare invocation is a usage error, not a quiet no-op', () => {
    expect(parseArgs([])).toBeUndefined();
  });

  it('rejects unknown flags and stray arguments', () => {
    expect(parseArgs(['--bogus'])).toBeUndefined();
    expect(parseArgs(['stray'])).toBeUndefined();
  });

  it('routes a subcommand --help to that subcommand', () => {
    expect(parseArgs(['catalog', '--help'])).toEqual({
      version: false,
      help: 'catalog',
    });
    expect(parseArgs(['configure', '-h'])).toEqual({
      version: false,
      help: 'configure',
    });
  });

  it('routes a bare --help to the program, not a usage error', () => {
    expect(parseArgs(['--help'])).toEqual({
      version: false,
      help: 'statusline',
    });
    expect(parseArgs(['-h'])).toEqual({
      version: false,
      help: 'statusline',
    });
  });

  it('registers restore with --dry-run/--force/--home and routes to it', () => {
    expect(
      parseArgs(['restore', '--dry-run', '--force', '--home', '/tmp/lab-home']),
    ).toEqual({
      version: false,
      command: 'restore',
      dryRun: true,
      force: true,
      home: '/tmp/lab-home',
    });
    expect(parseArgs(['restore'])).toEqual({
      version: false,
      command: 'restore',
    });
    expect(parseArgs(['restore', '-h'])).toEqual({
      version: false,
      help: 'restore',
    });
    expect(parseArgs(['restore', 'stray'])).toBeUndefined();
    expect(parseArgs(['restore', '--bogus'])).toBeUndefined();
  });
});

describe('the runCli door', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function spyStdio(): { out: () => string; err: () => string } {
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const err = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    return {
      out: () => out.mock.calls.map(c => String(c[0])).join(''),
      err: () => err.mock.calls.map(c => String(c[0])).join(''),
    };
  }

  it('answers subcommand --help on stdout with 0, printing only its flags', async () => {
    const io = spyStdio();
    expect(await runCli(statuslineSpec(), ['catalog', '--help'])).toBe(0);
    expect(io.out()).toContain('Usage: statusline catalog');
    expect(io.out()).toContain('--themes');
    expect(io.out()).not.toContain('--dry-run');
    expect(io.err()).toBe('');
  });

  it('answers bare --help with the program listing every subcommand', async () => {
    const io = spyStdio();
    expect(await runCli(statuslineSpec(), ['--help'])).toBe(0);
    expect(io.out()).toContain('Usage: statusline');
    for (const verb of ['catalog', 'configure', 'preview', 'restore', 'status']) {
      expect(io.out()).toContain(verb);
    }
  });

  it('prints the version and exits 0 on --version', async () => {
    const io = spyStdio();
    expect(await runCli(statuslineSpec(), ['--version'])).toBe(0);
    expect(io.out()).toBe(`${VERSION}\n`);
  });

  it('a bare invocation is a usage error on stderr, exit 1', async () => {
    const io = spyStdio();
    expect(await runCli(statuslineSpec(), [])).toBe(1);
    expect(io.err()).toContain('Usage: statusline');
    expect(io.out()).toBe('');
  });
});

describe('helpFor', () => {
  it("names the catalog's per-item flags", () => {
    expect(helpFor('catalog')).toContain('--model');
  });

  it("names the configure's configuration flags", () => {
    const help = helpFor('configure');
    expect(help).toContain('--theme');
    expect(help).toContain('--layout');
    expect(help).not.toContain('--fallback');
    expect(help).not.toContain('--dry-run');
    expect(help).not.toMatch(/script/);
  });

  it("names the restore's flags", () => {
    const help = helpFor('restore');
    expect(help).toContain('--dry-run');
    expect(help).toContain('--force');
    expect(help).toContain('--home');
  });

  it("names the preview's render flags and no writer flags", () => {
    const help = helpFor('preview');
    expect(help).toContain('--theme');
    expect(help).toContain('--layout');
    expect(help).toContain('--plain');
    expect(help).toContain('--home');
    expect(help).toContain('--model');
    expect(help).not.toContain('--dry-run');
    expect(help).not.toContain('--force');
    expect(help).not.toContain('--fallback');
  });
});
