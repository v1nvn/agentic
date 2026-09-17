import { printUsageAndExit } from '@v1nvn/agentic-core';

import { apply } from './apply.js';
import { buildProgram, parseArgs, VERSION } from './cli.js';
import { payloadJson } from './payloads.js';
import { resolve } from './resolve.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

function homeOf(flag: string | undefined): string {
  const home = flag ?? process.env.HOME;
  if (home === undefined || home === '') {
    throw new Error('no home to operate on: set $HOME or pass --home');
  }
  return home;
}

if (parsed.version) {
  console.log(VERSION);
} else if (parsed.command === 'apply') {
  const { steps } = apply({
    home: homeOf(parsed.home),
    force: parsed.force,
    dryRun: parsed.dryRun,
  });
  for (const step of steps) {
    const why = step.action === 'refuse' ? ' (--force to take over)' : '';
    console.log(`${step.target}: ${step.action}${why}`);
  }
} else if (parsed.command === 'payload') {
  const json = payloadJson(parsed.payload ?? '');
  if (json === undefined) {
    console.error(
      `no shipped payload ${parsed.payload ?? ''} (p1 | p2 | p3 | p4)`,
    );
    process.exitCode = 1;
  } else {
    console.log(json);
  }
} else if (parsed.command === 'resolve') {
  console.log(resolve({ home: homeOf(parsed.home) }).pluginDir ?? 'none');
} else {
  printUsageAndExit(buildProgram());
}
