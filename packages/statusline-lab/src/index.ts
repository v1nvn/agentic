import { printUsageAndExit } from '@v1nvn/agentic-core';

import { catalog } from './catalog.js';
import { buildProgram, parseArgs, subcommandHelp, VERSION } from './cli.js';
import { configure } from './configure.js';
import { restore } from './restore.js';
import { terminalDeps } from './wizard-tui.js';
import { createWizard } from './wizard.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

function homeOf(flag: string | undefined): string {
  const home = flag ?? process.env.HOME;
  if (home === undefined || home === '') {
    throw new Error('no home to operate on: set $HOME or pass --home');
  }
  return home;
}

function run(job: () => void): void {
  try {
    job();
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}

if (parsed.help !== undefined) {
  console.log(subcommandHelp(parsed.help));
} else if (parsed.version) {
  console.log(VERSION);
} else if (parsed.command === 'catalog') {
  run(() => {
    console.log(catalog({ home: homeOf(parsed.home), items: parsed.items }));
  });
} else if (parsed.command === 'configure') {
  const home = homeOf(parsed.home);
  const interactive =
    parsed.layout === undefined &&
    parsed.variants === undefined &&
    parsed.fallback === undefined &&
    !parsed.dryRun &&
    !parsed.force;
  if (interactive && process.stdin.isTTY) {
    const outcome = await createWizard(
      { home, now: String(Math.floor(Date.now() / 1000)) },
      terminalDeps(),
    );
    if (outcome === 'save-failed') {
      process.exitCode = 1;
    }
  } else {
    run(() => {
      const result = configure({
        dryRun: parsed.dryRun,
        fallback: parsed.fallback,
        force: parsed.force,
        home,
        layout: parsed.layout,
        variants: parsed.variants,
      });
      console.log(
        result.mode === 'written'
          ? 'configured — live on the next paint'
          : result.text,
      );
    });
  }
} else if (parsed.command === 'restore') {
  run(() => {
    const result = restore({
      dryRun: parsed.dryRun,
      force: parsed.force,
      home: homeOf(parsed.home),
    });
    console.log(
      result.mode === 'restored'
        ? 'restored — the lab keys hold their pre-lab values again'
        : result.text,
    );
  });
}
