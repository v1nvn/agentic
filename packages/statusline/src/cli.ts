import { parseQuietly } from '@v1nvn/agentic-core';
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };

export const VERSION = pkg.version;

// The flag surface mirrors statusline.sh's COMPS item registry; the catalog
// and configure suites pin the two together.
const ITEM_IDS = [
  'model',
  'effort',
  'state',
  'cwd',
  'branch',
  'status',
  'ahead',
  'pr',
  'bar',
  'tokens',
  'cache',
  'cost',
  'duration',
  'lines',
  'rate',
  'style',
] as const satisfies readonly string[];

export type Subcommand = 'catalog' | 'configure' | 'restore' | 'status';

export interface ParsedArgs {
  readonly command?: Subcommand;
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly help?: Subcommand;
  readonly home?: string;
  readonly items?: readonly string[];
  readonly layout?: string;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
  readonly version: boolean;
}

type SubcommandOptions = Record<string, unknown>;

const QUIET = { writeOut: () => undefined, writeErr: () => undefined };

class HelpRequested extends Error {
  constructor(readonly command: Subcommand) {
    super(`${command} --help`);
  }
}

function quiet(name: Subcommand, command: Command): Command {
  return command
    .exitOverride(err => {
      const code = (err as { code?: string }).code;
      if (code === 'commander.help' || code === 'commander.helpDisplayed') {
        throw new HelpRequested(name);
      }
      throw err;
    })
    .configureOutput(QUIET)
    .allowExcessArguments(false);
}

export function buildProgram(
  onSubcommand?: (command: Subcommand, options: SubcommandOptions) => void,
): Command {
  const catalog = quiet('catalog', new Command('catalog'))
    .description('print one line per item — * marks the live variant')
    .option('--home <dir>', 'operate on this home instead of $HOME');
  for (const item of ITEM_IDS) {
    catalog.option(`--${item}`, `cut the listing to the ${item} item`);
  }
  catalog.action((options: SubcommandOptions) =>
    onSubcommand?.('catalog', options),
  );

  const configure = quiet('configure', new Command('configure'))
    .description('write both settings keys with the inline lab commands')
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option(
      '--layout <spec>',
      "brace clusters of item ids, e.g. '{cwd branch} {model effort}'",
    )
    .option(
      '--theme <name>',
      'base design the item flags override: quiet, lean, classic, rich, custom',
    )
    .option('--force', 'take over foreign settings keys');
  for (const item of ITEM_IDS) {
    configure.option(`--${item} <alt>`, `variant for the ${item} item`);
  }
  configure.action((options: SubcommandOptions) =>
    onSubcommand?.('configure', options),
  );

  const restore = quiet('restore', new Command('restore'))
    .description(
      'revert both settings keys to their pre-lab values, clean the data dir',
    )
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option('--dry-run', 'print the plan, write nothing')
    .option(
      '--force',
      'splice the saved value over a key changed after the takeover',
    );
  restore.action((options: SubcommandOptions) =>
    onSubcommand?.('restore', options),
  );

  const status = quiet('status', new Command('status'))
    .description(
      'check install, keys, config, and backup — exit 0 healthy, 1 when a row needs action',
    )
    .option('--home <dir>', 'operate on this home instead of $HOME');
  status.action((options: SubcommandOptions) =>
    onSubcommand?.('status', options),
  );

  return new Command()
    .name('statusline')
    .description('Configure the status line and agent panel designs')
    .option('-V, --version', 'print the version and exit')
    .action(() => undefined)
    .addCommand(catalog)
    .addCommand(configure)
    .addCommand(restore)
    .addCommand(status);
}

export function subcommandHelp(name: Subcommand): string {
  const command = buildProgram().commands.find(c => c.name() === name);
  if (command === undefined) {
    throw new Error(`no '${name}' command to describe`);
  }
  return command.helpInformation();
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let chosen:
    | undefined
    | { readonly command: Subcommand; readonly options: SubcommandOptions };
  const program = buildProgram((command, options) => {
    chosen = { command, options };
  });
  const parsed = parseQuietly(program, args, err =>
    err instanceof HelpRequested ? { help: err.command } : undefined,
  );
  if (parsed === undefined) {
    return undefined;
  }
  if (!(parsed instanceof Command)) {
    return { version: false, help: parsed.help };
  }
  const { version } = program.opts<{ version: boolean | undefined }>();
  if (version) {
    return { version: true };
  }
  if (chosen === undefined) {
    return undefined;
  }
  const options = chosen.options;
  if (chosen.command === 'catalog') {
    const items = ITEM_IDS.filter(item => options[item] === true);
    return {
      version: false,
      command: 'catalog',
      ...(items.length > 0 ? { items } : {}),
      ...(typeof options.home === 'string' ? { home: options.home } : {}),
    };
  }
  if (chosen.command === 'restore') {
    return {
      version: false,
      command: 'restore',
      ...(typeof options.dryRun === 'boolean'
        ? { dryRun: options.dryRun }
        : {}),
      ...(typeof options.force === 'boolean' ? { force: options.force } : {}),
      ...(typeof options.home === 'string' ? { home: options.home } : {}),
    };
  }
  if (chosen.command === 'status') {
    return {
      version: false,
      command: 'status',
      ...(typeof options.home === 'string' ? { home: options.home } : {}),
    };
  }
  const variants: Record<string, string> = {};
  for (const item of ITEM_IDS) {
    if (typeof options[item] === 'string') {
      variants[item] = options[item];
    }
  }
  return {
    version: false,
    command: 'configure',
    ...(Object.keys(variants).length > 0 ? { variants } : {}),
    ...(typeof options.force === 'boolean' ? { force: options.force } : {}),
    ...(typeof options.home === 'string' ? { home: options.home } : {}),
    ...(typeof options.layout === 'string' ? { layout: options.layout } : {}),
    ...(typeof options.theme === 'string' ? { theme: options.theme } : {}),
  };
}
