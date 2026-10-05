import type { Command } from 'commander';

export function parseQuietly<T = never>(
  program: Command,
  args: readonly string[],
  recover?: (err: unknown) => T | undefined,
): Command | T | undefined {
  try {
    program
      .allowExcessArguments(false)
      .exitOverride()
      .configureOutput({ writeOut: () => undefined, writeErr: () => undefined })
      .parse([...args], { from: 'user' });
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
