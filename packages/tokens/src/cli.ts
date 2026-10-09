/**
 * The CLI surface: `tokens-report usage` prints the account report (the
 * mod execs it with --json); bare prints the command list. Parsing lives
 * here, pure, so the spec can drive it; src/index.ts is the entry.
 */

import { exitZeroOnHelp, parseQuietly } from '@v1nvn/agentic-core';
import { Command } from 'commander';

export interface ParsedArgs {
  readonly command?: 'usage';
  readonly json: boolean;
}

export function buildProgram(
  onUsage?: (options: { json?: boolean }) => void,
): Command {
  const usage = new Command('usage')
    .description(
      'per-model token usage and cache hit rate from local transcripts',
    )
    .option('--json', 'print the ScanResult as JSON for the tokens mod')
    .action(options => onUsage?.(options as { json?: boolean }));
  return new Command()
    .name('tokens-report')
    .description(
      'Token usage — the account report; the live session is /tokens-top in Claude Code',
    )
    .action(() => undefined)
    .addCommand(usage);
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let parsed: ParsedArgs | undefined;
  const program = buildProgram(options => {
    parsed = { command: 'usage', json: options.json === true };
  });
  exitZeroOnHelp(program);
  if (parseQuietly(program, args) === undefined) {
    return undefined;
  }
  return parsed ?? { command: undefined, json: false };
}
