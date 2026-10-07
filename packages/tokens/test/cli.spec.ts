import { describe, expect, it } from 'vitest';

import { buildProgram, parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('takes the usage command', () => {
    expect(parseArgs(['usage'])).toEqual({ command: 'usage', json: false });
  });

  it('carries --json on the command', () => {
    expect(parseArgs(['usage', '--json'])).toEqual({
      command: 'usage',
      json: true,
    });
  });

  it('answers bare with no command', () => {
    expect(parseArgs([])).toEqual({ command: undefined, json: false });
  });

  it('refuses the flags outside the command', () => {
    expect(parseArgs(['--json'])).toBeUndefined();
  });

  it('refuses an unknown command', () => {
    expect(parseArgs(['top'])).toBeUndefined();
  });

  it('refuses extra positionals', () => {
    expect(parseArgs(['usage', 'extra'])).toBeUndefined();
  });
});

describe('buildProgram help', () => {
  it('bare lists the usage command; its flags live on the command', () => {
    const program = buildProgram();
    expect(program.helpInformation()).toContain('usage');
    const usage = program.commands.find(c => c.name() === 'usage');
    expect(usage?.helpInformation()).toContain('--json');
  });
});
