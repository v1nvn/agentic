import { Command, Option } from 'commander';

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

export type Subcommand = 'catalog' | 'configure';

export interface ParsedArgs {
  readonly command?: Subcommand;
  readonly dryRun?: boolean;
  readonly fallback?: 'default' | 'existing';
  readonly force?: boolean;
  readonly help?: Subcommand;
  readonly home?: string;
  readonly items?: readonly string[];
  readonly layout?: string;
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
    .addOption(
      new Option(
        '--fallback <mode>',
        'fill unflagged layout items from defaults or the existing config',
      ).choices(['default', 'existing']),
    )
    .option('--dry-run', 'render both surfaces, write nothing')
    .option('--force', 'take over foreign settings keys');
  for (const item of ITEM_IDS) {
    configure.option(`--${item} <alt>`, `variant for the ${item} item`);
  }
  configure.action((options: SubcommandOptions) =>
    onSubcommand?.('configure', options),
  );

  return new Command()
    .name('statusline-lab')
    .description('Configure the status line and agent panel designs')
    .option('-V, --version', 'print the lab version and exit')
    .action(() => undefined)
    .addCommand(catalog)
    .addCommand(configure);
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
  try {
    program
      .allowExcessArguments(false)
      .exitOverride()
      .configureOutput(QUIET)
      .parse([...args], { from: 'user' });
  } catch (e) {
    if (e instanceof HelpRequested) {
      return { version: false, help: e.command };
    }
    return undefined;
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
    ...(typeof options.dryRun === 'boolean' ? { dryRun: options.dryRun } : {}),
    ...(typeof options.fallback === 'string'
      ? { fallback: options.fallback as 'default' | 'existing' }
      : {}),
    ...(typeof options.force === 'boolean' ? { force: options.force } : {}),
    ...(typeof options.home === 'string' ? { home: options.home } : {}),
    ...(typeof options.layout === 'string' ? { layout: options.layout } : {}),
  };
}
