import type { Command } from 'commander';

export function parseQuietly<T = never>(
  program: Command,
  args: readonly string[],
  recover?: (err: unknown) => T | undefined,
): Command | T | undefined {
  function quiet(command: Command): void {
    command
      .allowExcessArguments(false)
      .exitOverride()
      .configureOutput({
        writeOut: () => undefined,
        writeErr: () => undefined,
      });
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

export function printUsageAndExit(program: Command): never {
  console.error(program.helpInformation());
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}

export async function runMain(main: () => Promise<void> | void): Promise<void> {
  try {
    await main();
  } catch (e) {
    console.error((e as Error).message);
    // CLIs report failure through the exit code; the rule targets libraries.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
