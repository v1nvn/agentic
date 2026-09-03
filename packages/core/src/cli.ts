import type { HookEvent } from './hook.js';

import { emitHookBlock, readHookEvent } from './hook.js';

import type { Command } from 'commander';

export function parseQuietly(
  program: Command,
  args: readonly string[],
): Command | undefined {
  try {
    program
      .allowExcessArguments(false)
      .exitOverride()
      .configureOutput({ writeOut: () => undefined, writeErr: () => undefined })
      .parse([...args], { from: 'user' });
    return program;
  } catch {
    return undefined;
  }
}

export function printUsageAndExit(program: Command): never {
  console.error(program.helpInformation());
  // CLIs report failure through the exit code; the rule targets libraries.
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}

export async function hookOrPrint(
  hook: boolean,
  failure: string,
  run: (event: HookEvent | undefined) => Promise<string> | string,
  stdin: NodeJS.ReadableStream = process.stdin,
): Promise<void> {
  if (hook) {
    let reason: string;
    try {
      reason = await run(await readHookEvent(stdin));
    } catch (e) {
      reason = `${failure}: ${(e as Error).message}`;
    }
    emitHookBlock(reason);
    return;
  }
  try {
    console.log(await run(undefined));
  } catch (e) {
    console.error((e as Error).message);
    // CLIs report failure through the exit code; the rule targets libraries.
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}
