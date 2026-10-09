import type { Command } from 'commander';

export function parseQuietly<T = never>(
  program: Command,
  args: readonly string[],
  recover?: (err: unknown) => T | undefined,
): Command | T | undefined {
  function quiet(command: Command): void {
    command.configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });
    if (!hasExitOverride(command)) {
      command.exitOverride();
    }
    command.commands.forEach(quiet);
  }
  try {
    quiet(program);
    program.parse([...args], { from: 'user' });
    return program;
  } catch (err) {
    return recover?.(err);
  }
}

function hasExitOverride(command: Command): boolean {
  return (command as { _exitCallback?: unknown })._exitCallback != null;
}

export function exitZeroOnHelp(program: Command): void {
  function install(command: Command): void {
    command.exitOverride(err => {
      if (
        err.exitCode === 0 &&
        (err.code === 'commander.help' ||
          err.code === 'commander.helpDisplayed')
      ) {
        console.log(command.helpInformation());
        exitWithCode(0);
      }
      throw err;
    });
    command.commands.forEach(install);
  }
  install(program);
}

function exitWithCode(code: number): never {
  // eslint-disable-next-line n/no-process-exit
  process.exit(code);
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
