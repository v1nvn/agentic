import { Command, Option } from 'commander';

export interface CliOption {
  readonly choices?: readonly string[];
  readonly default?: string;
  readonly description: string;
  readonly env?: string;
  readonly flags: string;
  readonly parse?: (value: string) => unknown;
}

export type CliResult = number | undefined;

export type CliRun = (
  options: Record<string, unknown>,
  args: readonly string[],
) => CliResult | Promise<CliResult>;

export interface CliSpec {
  readonly argument?: { readonly description: string; readonly flags: string };
  readonly commands?: readonly CliSpec[];
  readonly description?: string;
  readonly name: string;
  readonly options?: readonly CliOption[];
  readonly run?: CliRun;
  readonly usageExit?: number;
  readonly version?: string;
}

export interface CliInvocation {
  readonly args: readonly string[];
  readonly command?: string;
  readonly options: Record<string, unknown>;
  readonly root: Record<string, unknown>;
}

// A --help ask caught mid-parse: the parse doors return it instead of exiting,
// and runCli answers it (the help payload) on stdout with 0.
export class HelpRequested extends Error {
  constructor(readonly command: Command) {
    super(`${command.name()} --help`);
  }
}

export type CliHelpHook<T> = (topic: string, text: string) => T;

function addOption(cmd: Command, option: CliOption): void {
  const bare =
    option.env === undefined &&
    option.choices === undefined &&
    option.default === undefined &&
    option.parse === undefined;
  if (bare) {
    cmd.option(option.flags, option.description);
    return;
  }
  const built = new Option(option.flags, option.description);
  if (option.env !== undefined) {
    built.env(option.env);
  }
  if (option.choices !== undefined) {
    built.choices(option.choices);
  }
  if (option.default !== undefined) {
    built.default(option.default);
  }
  if (option.parse !== undefined) {
    built.argParser(option.parse);
  }
  cmd.addOption(built);
}

function wire(
  cmd: Command,
  spec: CliSpec,
  program: Command,
  isRoot: boolean,
  sink?: (invocation: CliInvocation) => void,
): void {
  if (spec.description !== undefined) {
    cmd.description(spec.description);
  }
  if (spec.argument !== undefined) {
    cmd.argument(spec.argument.flags, spec.argument.description);
  }
  for (const option of spec.options ?? []) {
    addOption(cmd, option);
  }
  if (isRoot && spec.version !== undefined) {
    cmd.option('-V, --version', 'print the version and exit');
  }
  cmd.action((...all: unknown[]) => {
    const options = all.at(-2) as Record<string, unknown>;
    const command = all.at(-1) as Command;
    sink?.({
      command: isRoot ? undefined : spec.name,
      options,
      args: command.args,
      root: program.opts(),
    });
  });
  for (const sub of spec.commands ?? []) {
    const child = new Command(sub.name);
    wire(child, sub, program, false, sink);
    cmd.addCommand(child);
  }
}

function materialize(
  spec: CliSpec,
  sink?: (invocation: CliInvocation) => void,
): Command {
  const program = new Command(spec.name);
  wire(program, spec, program, true, sink);
  return program;
}

export function buildCli(spec: CliSpec): Command {
  return materialize(spec);
}

function quiet(command: Command): void {
  command.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  command.exitOverride(err => {
    const code = (err as { code?: string }).code;
    if (code === 'commander.help' || code === 'commander.helpDisplayed') {
      throw new HelpRequested(command);
    }
    throw err;
  });
  command.commands.forEach(quiet);
}

export function parseCli<T = HelpRequested>(
  spec: CliSpec,
  argv: readonly string[],
  onHelp?: CliHelpHook<T>,
): CliInvocation | HelpRequested | T | undefined {
  let invocation: CliInvocation | undefined;
  const program = materialize(spec, found => {
    invocation = found;
  });
  quiet(program);
  try {
    program.parse([...argv], { from: 'user' });
  } catch (err) {
    if (!(err instanceof HelpRequested)) {
      return undefined;
    }
    return onHelp !== undefined
      ? onHelp(err.command.name(), err.command.helpInformation())
      : err;
  }
  return invocation;
}

export function helpTextFor(spec: CliSpec, topic: string): string {
  const program = materialize(spec);
  const command =
    topic === spec.name
      ? program
      : program.commands.find(c => c.name() === topic);
  if (command === undefined) {
    throw new Error(`no '${topic}' command to describe`);
  }
  return command.helpInformation();
}

function usageError(spec: CliSpec): number {
  process.stderr.write(`${helpTextFor(spec, spec.name)}\n`);
  return spec.usageExit ?? 1;
}

async function call(
  run: CliRun,
  options: Record<string, unknown>,
  args: readonly string[],
): Promise<number> {
  try {
    return (await run(options, args)) ?? 0;
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
}

export async function runCli(
  spec: CliSpec,
  argv: readonly string[],
  onHelp?: CliHelpHook<CliResult>,
): Promise<number> {
  let asked: undefined | { readonly text: string; readonly topic: string };
  const parsed = parseCli(spec, argv, (topic, text) => {
    asked = { topic, text };
    return 0;
  });
  if (parsed === undefined) {
    return usageError(spec);
  }
  if (asked !== undefined) {
    if (onHelp !== undefined) {
      return onHelp(asked.topic, asked.text) ?? 0;
    }
    process.stdout.write(`${asked.text}\n`);
    return 0;
  }
  const invocation = parsed as CliInvocation;
  if (invocation.command === undefined) {
    if (spec.version !== undefined && invocation.root.version === true) {
      process.stdout.write(`${spec.version}\n`);
      return 0;
    }
    if ((spec.commands?.length ?? 0) > 0) {
      return usageError(spec);
    }
    return spec.run === undefined
      ? 0
      : await call(spec.run, invocation.options, invocation.args);
  }
  const sub = spec.commands?.find(c => c.name === invocation.command);
  return sub?.run === undefined
    ? 0
    : await call(sub.run, invocation.options, invocation.args);
}
