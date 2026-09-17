import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildProgram, parseArgs, VERSION } from '../src/cli.js';

// Read the manifest off disk so the test sees the published file, not the
// bundler-resolved import src/cli.ts uses.
const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

describe('buildProgram', () => {
  it('names the bin after the package', () => {
    expect(buildProgram().name()).toBe('statusline-lab');
  });

  it('rides the manifest version', () => {
    expect(VERSION).toBe(manifest.version);
  });
});

describe('parseArgs', () => {
  it('parses --version', () => {
    expect(parseArgs(['--version'])).toEqual({ version: true });
  });

  it('accepts no args', () => {
    expect(parseArgs([])).toEqual({ version: false });
  });

  it('rejects unknown flags', () => {
    expect(parseArgs(['--bogus'])).toBeUndefined();
  });

  it('rejects stray arguments', () => {
    expect(parseArgs(['stray'])).toBeUndefined();
  });
});

describe('parseArgs: subcommands', () => {
  it('parses apply with every flag', () => {
    expect(
      parseArgs(['apply', '--home', '/tmp/lab-home', '--force', '--dry-run']),
    ).toEqual({
      version: false,
      command: 'apply',
      home: '/tmp/lab-home',
      force: true,
      dryRun: true,
    });
  });

  it('parses apply with defaults', () => {
    expect(parseArgs(['apply'])).toEqual({ version: false, command: 'apply' });
  });

  it('parses resolve with --home', () => {
    expect(parseArgs(['resolve', '--home', '/tmp/lab-home'])).toEqual({
      version: false,
      command: 'resolve',
      home: '/tmp/lab-home',
    });
  });

  it('scopes --force and --dry-run to apply', () => {
    expect(parseArgs(['resolve', '--force'])).toBeUndefined();
    expect(parseArgs(['resolve', '--dry-run'])).toBeUndefined();
  });

  it('rejects unknown flags, stray arguments, and unknown commands', () => {
    expect(parseArgs(['apply', '--bogus'])).toBeUndefined();
    expect(parseArgs(['apply', 'stray'])).toBeUndefined();
    expect(parseArgs(['nonsense'])).toBeUndefined();
  });
});

describe('parseArgs: gallery', () => {
  it('parses gallery with --out', () => {
    expect(parseArgs(['gallery', '--out', '/tmp/page.html'])).toEqual({
      version: false,
      command: 'gallery',
      out: '/tmp/page.html',
    });
  });

  it('parses gallery without --out', () => {
    expect(parseArgs(['gallery'])).toEqual({
      version: false,
      command: 'gallery',
    });
  });

  it('scopes --out to gallery', () => {
    expect(parseArgs(['apply', '--out', '/tmp/page.html'])).toBeUndefined();
    expect(parseArgs(['resolve', '--out', '/tmp/page.html'])).toBeUndefined();
  });

  it('rejects unknown flags and stray arguments', () => {
    expect(parseArgs(['gallery', '--bogus'])).toBeUndefined();
    expect(parseArgs(['gallery', 'stray'])).toBeUndefined();
  });
});

describe('parseArgs: payload', () => {
  it('parses each shipped fixture name', () => {
    for (const name of ['p1', 'p2', 'p3', 'p4']) {
      expect(parseArgs(['payload', name])).toEqual({
        version: false,
        command: 'payload',
        payload: name,
      });
    }
  });

  it('rejects unknown fixture names at parse, like unknown commands', () => {
    expect(parseArgs(['payload', 'p9'])).toBeUndefined();
    expect(parseArgs(['payload', 'capture-1'])).toBeUndefined();
  });
});
