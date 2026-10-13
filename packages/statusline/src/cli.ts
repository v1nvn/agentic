import { buildCli, helpTextFor, parseCli } from '@v1nvn/agentic-core';

import pkg from '../package.json' with { type: 'json' };
import { ITEM_IDS } from './render/items.ts';
import { THEMES } from './themes.ts';

import type { CliResult, CliRun, CliSpec } from '@v1nvn/agentic-core';

export const VERSION = pkg.version;

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

export interface CatalogArgs {
  readonly home?: string;
  readonly items?: readonly string[];
  readonly themes?: boolean;
}

export interface ConfigureArgs {
  readonly force?: boolean;
  readonly home?: string;
  readonly layout?: string;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export interface PreviewArgs {
  readonly home?: string;
  readonly layout?: string;
  readonly plain?: boolean;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export interface RestoreArgs {
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly home?: string;
}

export interface StatusArgs {
  readonly home?: string;
}

export interface SubcommandRuns {
  catalog?: (args: CatalogArgs) => CliResult | Promise<CliResult>;
  configure?: (args: ConfigureArgs) => CliResult | Promise<CliResult>;
  preview?: (args: PreviewArgs) => CliResult | Promise<CliResult>;
  restore?: (args: RestoreArgs) => CliResult | Promise<CliResult>;
  status?: (args: StatusArgs) => CliResult | Promise<CliResult>;
}

const LAYOUT_HELP =
  "brace clusters of item ids, e.g. '{cwd branch} {model effort}'";
const THEME_HELP = `base design the item flags override: ${Object.keys(THEMES).join(', ')}`;

// Commander camel-cases a hyphenated long flag: --cache-hit lands on
// options.cacheHit, never options['cache-hit'].
function optFor(options: SubcommandOptions, item: string): unknown {
  return options[item.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())];
}

function homeArg(options: SubcommandOptions): { home?: string } {
  return typeof options.home === 'string' ? { home: options.home } : {};
}

function catalogArgs(options: SubcommandOptions): CatalogArgs {
  const items = ITEM_IDS.filter(item => optFor(options, item) === true);
  return {
    ...(items.length > 0 ? { items } : {}),
    ...(typeof options.themes === 'boolean' ? { themes: options.themes } : {}),
    ...homeArg(options),
  };
}

function variantArgs(options: SubcommandOptions): {
  home?: string;
  layout?: string;
  theme?: string;
  variants?: Readonly<Record<string, string>>;
} {
  const variants: Record<string, string> = {};
  for (const item of ITEM_IDS) {
    const alt = optFor(options, item);
    if (typeof alt === 'string') {
      variants[item] = alt;
    }
  }
  return {
    ...(Object.keys(variants).length > 0 ? { variants } : {}),
    ...homeArg(options),
    ...(typeof options.layout === 'string' ? { layout: options.layout } : {}),
    ...(typeof options.theme === 'string' ? { theme: options.theme } : {}),
  };
}

function restoreArgs(options: SubcommandOptions): RestoreArgs {
  return {
    ...(typeof options.dryRun === 'boolean' ? { dryRun: options.dryRun } : {}),
    ...(typeof options.force === 'boolean' ? { force: options.force } : {}),
    ...homeArg(options),
  };
}

function routed<T>(
  map: (options: SubcommandOptions) => T,
  run?: (args: T) => CliResult | Promise<CliResult>,
): CliRun | undefined {
  return run === undefined ? undefined : options => run(map(options));
}

export function statuslineSpec(runs?: SubcommandRuns): CliSpec {
  return {
    name: PROGRAM,
    description: 'Configure the status line and agent panel designs',
    version: VERSION,
    commands: [
      {
        name: 'catalog',
        description:
          'print the themes block (* marks the live theme) then one line per item — * marks the live variant',
        options: [
          {
            flags: '--home <dir>',
            description: 'operate on this home instead of $HOME',
          },
          {
            flags: '--themes',
            description: 'cut the listing to the themes block',
          },
          ...ITEM_IDS.map(item => ({
            flags: `--${item}`,
            description: `cut the listing to the ${item} item`,
          })),
        ],
        run: routed(catalogArgs, runs?.catalog),
      },
      {
        name: 'configure',
        description: 'write both settings keys with the inline lab commands',
        options: [
          {
            flags: '--home <dir>',
            description: 'operate on this home instead of $HOME',
          },
          { flags: '--layout <spec>', description: LAYOUT_HELP },
          { flags: '--theme <name>', description: THEME_HELP },
          { flags: '--force', description: 'take over foreign settings keys' },
          ...ITEM_IDS.map(item => ({
            flags: `--${item} <alt>`,
            description: `variant for the ${item} item`,
          })),
        ],
        run: routed(
          options => ({
            ...(typeof options.force === 'boolean'
              ? { force: options.force }
              : {}),
            ...variantArgs(options),
          }),
          runs?.configure,
        ),
      },
      {
        name: 'preview',
        description:
          'render a candidate line and panel row; nothing is written',
        options: [
          {
            flags: '--home <dir>',
            description: 'operate on this home instead of $HOME',
          },
          { flags: '--layout <spec>', description: LAYOUT_HELP },
          { flags: '--theme <name>', description: THEME_HELP },
          {
            flags: '--plain',
            description: 'strip the color escapes so glyphs survive chat',
          },
          ...ITEM_IDS.map(item => ({
            flags: `--${item} <alt>`,
            description: `variant for the ${item} item`,
          })),
        ],
        run: routed(
          options => ({
            ...(typeof options.plain === 'boolean'
              ? { plain: options.plain }
              : {}),
            ...variantArgs(options),
          }),
          runs?.preview,
        ),
      },
      {
        name: 'restore',
        description:
          'revert both settings keys to their pre-lab values, clean the data dir',
        options: [
          {
            flags: '--home <dir>',
            description: 'operate on this home instead of $HOME',
          },
          { flags: '--dry-run', description: 'print the plan, write nothing' },
          {
            flags: '--force',
            description:
              'splice the saved value over a key changed after the takeover',
          },
        ],
        run: routed(restoreArgs, runs?.restore),
      },
      {
        name: 'status',
        description:
          'check install, keys, config, and backup — exit 0 healthy, 1 when a row needs action',
        options: [
          {
            flags: '--home <dir>',
            description: 'operate on this home instead of $HOME',
          },
        ],
        run: routed(homeArg, runs?.status),
      },
    ],
  };
}

export function buildProgram() {
  return buildCli(statuslineSpec());
}

export function helpFor(help: HelpTopic): string {
  return helpTextFor(statuslineSpec(), help);
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  const parsed = parseCli(statuslineSpec(), args, topic => ({
    version: false,
    help: topic as HelpTopic,
  }));
  if (parsed === undefined || !('root' in parsed)) {
    return parsed as ParsedArgs | undefined;
  }
  if (parsed.root.version === true) {
    return { version: true };
  }
  if (parsed.command === undefined) {
    return undefined;
  }
  const base = {
    version: false as const,
    command: parsed.command as Subcommand,
  };
  switch (parsed.command) {
    case 'catalog':
      return { ...base, ...catalogArgs(parsed.options) };
    case 'configure':
      return {
        ...base,
        ...variantArgs(parsed.options),
        ...(typeof parsed.options.force === 'boolean'
          ? { force: parsed.options.force }
          : {}),
      };
    case 'restore':
      return { ...base, ...restoreArgs(parsed.options) };
    case 'status':
      return { ...base, ...homeArg(parsed.options) };
    default:
      return {
        ...base,
        ...variantArgs(parsed.options),
        ...(typeof parsed.options.plain === 'boolean'
          ? { plain: parsed.options.plain }
          : {}),
      };
  }
}
