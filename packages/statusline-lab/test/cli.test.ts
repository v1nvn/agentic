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
