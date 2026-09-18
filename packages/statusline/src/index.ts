import { printUsageAndExit } from '@v1nvn/agentic-core';
import { writeFileSync } from 'node:fs';

import { apply } from './apply.js';
import { capture } from './capture.js';
import { buildProgram, parseArgs, VERSION } from './cli.js';
import { buildGallery } from './gallery.js';
import { payloadJson, type PayloadName } from './payloads.js';
import { resolve } from './resolve.js';
import { terminalDeps } from './wizard-tui.js';
import { createWizard, resolveWizardPayload } from './wizard.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

function homeOf(flag: string | undefined): string {
  const home = flag ?? process.env.HOME;
  if (home === undefined || home === '') {
    throw new Error('no home to operate on: set $HOME or pass --home');
  }
  return home;
}

// Pipe stdin is not always a blocking fd (a node upstream leaves the read end
// O_NONBLOCK on macOS), so read it as a stream, never readFileSync(0).
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
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
} else if (parsed.command === 'capture') {
  try {
    const filed = capture({
      home: homeOf(parsed.home),
      stdin: await readStdin(),
    });
    console.log(filed.path);
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
} else if (parsed.command === 'gallery') {
  const page = buildGallery();
  if (parsed.out === undefined) {
    console.log(page);
  } else {
    writeFileSync(parsed.out, page);
    console.error(`wrote ${parsed.out}`);
  }
} else if (parsed.command === 'payload' && parsed.payload !== undefined) {
  console.log(payloadJson(parsed.payload as PayloadName));
} else if (parsed.command === 'pick') {
  const home = homeOf(parsed.home);
  const payload = resolveWizardPayload({ home, payload: parsed.payload });
  await createWizard(
    {
      home,
      now: String(Math.floor(Date.now() / 1000)),
      payloadPath: payload.path,
    },
    terminalDeps(),
  );
} else if (parsed.command === 'resolve') {
  console.log(resolve({ home: homeOf(parsed.home) }).pluginDir ?? 'none');
} else {
  printUsageAndExit(buildProgram());
}
