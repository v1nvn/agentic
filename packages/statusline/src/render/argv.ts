import { parseArgs } from 'node:util';

import { specFor } from './items.js';

// The render.mjs argv grammar — node:util parseArgs, never commander and
// never @v1nvn/agentic-core; the CLI and the renderer share only the registry
// data. Grammar only: theme and layout values pass through unresolved.
// --subagent is the one valueless flag; the host's subagentStatusLine key
// carries it, its absence is the session's line.

export interface ArgvResult {
  readonly layout?: string;
  readonly mode: 'line' | 'subagent';
  readonly now?: number;
  readonly picks: Record<string, string>;
  readonly theme?: string;
  readonly warnings: string[];
}

function warn(warnings: string[], message: string): void {
  warnings.push(message);
}

export function parseArgv(argv: readonly string[]): ArgvResult {
  const parsed = parseArgs({
    allowPositionals: true,
    args: [...argv],
    options: {
      layout: { type: 'string' },
      now: { type: 'string' },
      theme: { type: 'string' },
    },
    strict: false,
  });
  const warnings: string[] = [];
  const picks: Record<string, string> = {};
  let mode: 'line' | 'subagent' = 'line';
  let theme: string | undefined;
  let layout: string | undefined;
  let now: number | undefined;

  for (const positional of parsed.positionals) {
    warn(warnings, `statusline: unexpected argument '${positional}', ignored`);
  }

  for (const [name, value] of Object.entries(parsed.values)) {
    if (name === 'subagent') {
      if (value === true) {
        mode = 'subagent';
      } else {
        warn(warnings, 'statusline: --subagent takes no value, ignored');
      }
      continue;
    }
    if (typeof value !== 'string') {
      warn(warnings, `statusline: --${name} needs a value, ignored`);
      continue;
    }
    if (name === 'theme') {
      theme = value;
      continue;
    }
    if (name === 'layout') {
      layout = value;
      continue;
    }
    if (name === 'now') {
      const epoch = Number(value);
      if (Number.isFinite(epoch) && value.trim() !== '') {
        now = epoch;
      } else {
        warn(warnings, `statusline: --now=${value} is not a number, ignored`);
      }
      continue;
    }
    const spec = specFor(name);
    if (spec === undefined) {
      warn(warnings, `statusline: --${name} is not a known flag, ignored`);
      continue;
    }
    if (spec.alternatives.includes(value)) {
      picks[name] = value;
    } else {
      warn(
        warnings,
        `statusline: ${name}=${value} is not available, using ${name}=${spec.default}`,
      );
    }
  }

  return {
    mode,
    picks,
    warnings,
    ...(theme === undefined ? {} : { theme }),
    ...(layout === undefined ? {} : { layout }),
    ...(now === undefined ? {} : { now }),
  };
}
