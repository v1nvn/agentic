import { parseQuietly } from '@v1nvn/agentic-core';
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };

export const VERSION = pkg.version;

export interface ParsedArgs {
  readonly version: boolean;
}

export function buildProgram(): Command {
  return new Command()
    .name('statusline-lab')
    .description('Preview statusline designs and apply them to the live line')
    .option('-V, --version', 'print the lab version and exit');
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  const program = parseQuietly(buildProgram(), args);
  if (program === undefined) {
    return undefined;
  }
  const { version } = program.opts<{ version: boolean | undefined }>();
  return { version: version ?? false };
}
