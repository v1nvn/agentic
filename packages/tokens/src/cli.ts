import type { CliRun, CliSpec } from '@v1nvn/agentic-core';

export function usageSpec(run?: CliRun): CliSpec {
  return {
    name: 'tokens-report',
    description:
      'Token usage — the account report; the live session is /tokens-top in Claude Code',
    commands: [
      {
        name: 'usage',
        description:
          'per-model token usage and cache hit rate from local transcripts',
        options: [
          {
            flags: '--json',
            description: 'print the ScanResult as JSON for the tokens mod',
          },
        ],
        run,
      },
    ],
  };
}
