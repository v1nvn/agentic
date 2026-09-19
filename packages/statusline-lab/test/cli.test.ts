import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildProgram,
  parseArgs,
  subcommandHelp,
  VERSION,
} from '../src/cli.js';

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
});

describe('subcommandHelp', () => {
  it("names the catalog's per-item flags", () => {
    expect(subcommandHelp('catalog')).toContain('--model');
  });

  it("names the configure's configuration flags", () => {
    const help = subcommandHelp('configure');
    expect(help).toContain('--fallback');
    expect(help).toContain('--layout');
    expect(help).toContain('--dry-run');
  });
});
