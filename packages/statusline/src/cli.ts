import { HelpRequested, parseQuietly } from '@v1nvn/agentic-core';
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { ITEM_IDS } from './render/items.js';
import { THEMES } from './themes.js';

export const VERSION = pkg.version;

// The flag surface is the render registry's item ids — one registry, shared
// with the data-dir renderer.

export const PROGRAM = 'statusline';

export type Subcommand =
  'catalog' | 'configure' | 'preview' | 'restore' | 'status';

export type HelpTopic = Subcommand | typeof PROGRAM;

export interface ParsedArgs {
  readonly command?: Subcommand;
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly help?: HelpTopic;
  readonly home?: string;
  readonly items?: readonly string[];
  readonly layout?: string;
  readonly plain?: boolean;
  readonly theme?: string;
  readonly themes?: boolean;
  readonly variants?: Readonly<Record<string, string>>;
  readonly version: boolean;
}

type SubcommandOptions = Record<string, unknown>;

export function buildProgram(
  onSubcommand?: (command: Subcommand, options: SubcommandOptions) => void,
): Command {
  const catalog = new Command('catalog')
    .description(
      'print the themes block (* marks the live theme) then one line per item — * marks the live variant',
    )
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option('--themes', 'cut the listing to the themes block');
  for (const item of ITEM_IDS) {
    catalog.option(`--${item}`, `cut the listing to the ${item} item`);
  }
  catalog.action((options: SubcommandOptions) =>
    onSubcommand?.('catalog', options),
  );

  const LAYOUT_HELP =
    "brace clusters of item ids, e.g. '{cwd branch} {model effort}'";
  const THEME_HELP = `base design the item flags override: ${Object.keys(THEMES).join(', ')}`;

  const configure = new Command('configure')
    .description('write both settings keys with the inline lab commands')
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option('--layout <spec>', LAYOUT_HELP)
    .option('--theme <name>', THEME_HELP)
    .option('--force', 'take over foreign settings keys');
  for (const item of ITEM_IDS) {
    configure.option(`--${item} <alt>`, `variant for the ${item} item`);
  }
  configure.action((options: SubcommandOptions) =>
    onSubcommand?.('configure', options),
  );

  const preview = new Command('preview')
    .description('render a candidate line and panel row; nothing is written')
    .option('--home <dir>', 'operate on this home instead of $HOME')
    .option('--layout <spec>', LAYOUT_HELP)
    .option('--theme <name>', THEME_HELP)
    .option('--plain', 'strip the color escapes so glyphs survive chat');
  for (const item of ITEM_IDS) {
    preview.option(`--${item} <alt>`, `variant for the ${item} item`);
  }
  preview.action((options: SubcommandOptions) =>
    onSubcommand?.('preview', options),
  );

  const restore = new Command('restore')
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

  const status = new Command('status')
    .description(
      'check install, keys, config, and backup — exit 0 healthy, 1 when a row needs action',
    )
    .option('--home <dir>', 'operate on this home instead of $HOME');
  status.action((options: SubcommandOptions) =>
    onSubcommand?.('status', options),
  );

  return new Command()
    .name(PROGRAM)
    .description('Configure the status line and agent panel designs')
    .option('-V, --version', 'print the version and exit')
    .action(() => undefined)
    .addCommand(catalog)
    .addCommand(configure)
    .addCommand(preview)
    .addCommand(restore)
    .addCommand(status);
}

export function helpFor(help: HelpTopic): string {
  const command =
    help === PROGRAM
      ? buildProgram()
      : buildProgram().commands.find(c => c.name() === help);
  if (command === undefined) {
    throw new Error(`no '${help}' command to describe`);
  }
  return command.helpInformation();
}

// Commander camel-cases a hyphenated long flag: --cache-hit lands on
// options.cacheHit, never options['cache-hit'].
function optFor(options: SubcommandOptions, item: string): unknown {
  return options[item.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())];
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let chosen:
    | undefined
    | { readonly command: Subcommand; readonly options: SubcommandOptions };
  const program = buildProgram((command, options) => {
    chosen = { command, options };
  });
  const parsed = parseQuietly(program, args);
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed instanceof HelpRequested) {
    return { version: false, help: parsed.command.name() as HelpTopic };
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
    const items = ITEM_IDS.filter(item => optFor(options, item) === true);
    return {
      version: false,
      command: 'catalog',
      ...(items.length > 0 ? { items } : {}),
      ...(typeof options.themes === 'boolean'
        ? { themes: options.themes }
        : {}),
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
    const alt = optFor(options, item);
    if (typeof alt === 'string') {
      variants[item] = alt;
    }
  }
  const common = {
    version: false as const,
    command: chosen.command,
    ...(Object.keys(variants).length > 0 ? { variants } : {}),
    ...(typeof options.home === 'string' ? { home: options.home } : {}),
    ...(typeof options.layout === 'string' ? { layout: options.layout } : {}),
    ...(typeof options.theme === 'string' ? { theme: options.theme } : {}),
  };
  return chosen.command === 'configure'
    ? {
        ...common,
        ...(typeof options.force === 'boolean' ? { force: options.force } : {}),
      }
    : {
        ...common,
        ...(typeof options.plain === 'boolean' ? { plain: options.plain } : {}),
      };
}
