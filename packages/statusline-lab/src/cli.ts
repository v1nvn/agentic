import { parseQuietly } from '@v1nvn/agentic-core';
import { Argument, Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { PAYLOAD_NAMES, type PayloadName } from './payloads.js';

export const VERSION = pkg.version;

export type Subcommand = 'apply' | 'gallery' | 'payload' | 'resolve';

export interface ParsedArgs {
  readonly command?: Subcommand;
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly home?: string;
  readonly out?: string;
  readonly payload?: PayloadName;
  readonly version: boolean;
}

interface SubcommandOptions {
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly home?: string;
  readonly out?: string;
  readonly payload?: PayloadName;
}

const QUIET = { writeOut: () => undefined, writeErr: () => undefined };

function quiet(command: Command): Command {
  return command
    .exitOverride()
    .configureOutput(QUIET)
    .allowExcessArguments(false);
}

export function buildProgram(
  onSubcommand?: (command: Subcommand, options: SubcommandOptions) => void,
): Command {
  const apply = quiet(new Command('apply'))
    .description('install the trampoline and point both settings keys at it')
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option('--force', 'take over a foreign trampoline or settings key')
    .option('--dry-run', 'report the plan without writing')
    .action((options: SubcommandOptions) => onSubcommand?.('apply', options));
  const gallery = quiet(new Command('gallery'))
    .description('render every component alternative to one HTML page')
    .option('--out <file>', 'write the page here instead of stdout')
    .action((options: SubcommandOptions) => onSubcommand?.('gallery', options));
  const payload = quiet(new Command('payload'))
    .description('print a shipped fixture payload for piping into the runtime')
    .addArgument(
      new Argument('<name>', 'fixture name: p1 | p2 | p3 | p4').choices([
        ...PAYLOAD_NAMES,
      ]),
    )
    .action((name: string) =>
      onSubcommand?.('payload', { payload: name as PayloadName }),
    );
  const resolve = quiet(new Command('resolve'))
    .description('print the plugin dir the trampoline would run')
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .action((options: SubcommandOptions) => onSubcommand?.('resolve', options));
  return new Command()
    .name('statusline-lab')
    .description('Preview statusline designs and apply them to the live line')
    .option('-V, --version', 'print the lab version and exit')
    .action(() => undefined)
    .addCommand(apply)
    .addCommand(gallery)
    .addCommand(payload)
    .addCommand(resolve);
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let chosen:
    | undefined
    | { readonly command: Subcommand; readonly options: SubcommandOptions };
  const program = parseQuietly(
    buildProgram((command, options) => {
      chosen = { command, options };
    }),
    args,
  );
  if (program === undefined) {
    return undefined;
  }
  const { version } = program.opts<{ version: boolean | undefined }>();
  if (chosen === undefined) {
    return { version: version ?? false };
  }
  return {
    version: version ?? false,
    command: chosen.command,
    home: chosen.options.home,
    force: chosen.options.force,
    dryRun: chosen.options.dryRun,
    out: chosen.options.out,
    payload: chosen.options.payload,
  };
}
