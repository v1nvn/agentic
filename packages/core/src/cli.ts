import type { Command } from 'commander';

// A --help ask caught mid-parse: parseQuietly returns it instead of exiting,
// so a spec can drive the parse and the bin decides to print and exit.
export class HelpRequested extends Error {
  constructor(readonly command: Command) {
    super(`${command.name()} --help`);
  }
}

export function parseQuietly(
  program: Command,
  args: readonly string[],
): Command | HelpRequested | undefined {
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
  try {
    quiet(program);
    program.parse([...args], { from: 'user' });
    return program;
  } catch (err) {
    return err instanceof HelpRequested ? err : undefined;
  }
}

function exitWithCode(code: number): never {
  // eslint-disable-next-line n/no-process-exit
  process.exit(code);
}

export function printHelpAndExit(command: Command): never {
  console.log(command.helpInformation());
  exitWithCode(0);
}

export function printUsageAndExit(program: Command): never {
  console.error(program.helpInformation());
  exitWithCode(1);
}

export async function runMain(main: () => Promise<void> | void): Promise<void> {
  try {
    await main();
  } catch (e) {
    console.error((e as Error).message);
    exitWithCode(1);
  }
}
