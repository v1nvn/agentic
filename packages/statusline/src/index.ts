import { printUsageAndExit, runMain } from '@v1nvn/agentic-core';

import { catalog } from './catalog.js';
import { buildProgram, helpFor, parseArgs, VERSION } from './cli.js';
import { configure } from './configure.js';
import { preview } from './preview.js';
import { restore } from './restore.js';
import { status } from './status.js';
import { terminalDeps } from './wizard-tui.js';
import { createWizard, opensWizard } from './wizard.js';

const parsed =
  parseArgs(process.argv.slice(2)) ?? printUsageAndExit(buildProgram());

function homeOf(flag: string | undefined): string {
  const home = flag ?? process.env.HOME;
  if (home === undefined || home === '') {
    throw new Error('no home to operate on: set $HOME or pass --home');
  }
  return home;
}

async function main(): Promise<void> {
  if (parsed.help !== undefined) {
    console.log(helpFor(parsed.help));
  } else if (parsed.version) {
    console.log(VERSION);
  } else if (parsed.command === 'catalog') {
    console.log(
      catalog({
        home: homeOf(parsed.home),
        items: parsed.items,
        themes: parsed.themes,
      }),
    );
  } else if (parsed.command === 'configure') {
    const home = homeOf(parsed.home);
    if (opensWizard(parsed, process.stdin.isTTY)) {
      const outcome = await createWizard(
        {
          force: parsed.force,
          home,
          now: String(Math.floor(Date.now() / 1000)),
        },
        terminalDeps(),
      );
      if (outcome === 'save-failed') {
        process.exitCode = 1;
      }
    } else {
      configure({
        force: parsed.force,
        home,
        layout: parsed.layout,
        theme: parsed.theme,
        variants: parsed.variants,
      });
      console.log('configured — live on the next paint');
    }
  } else if (parsed.command === 'preview') {
    console.log(
      preview({
        home: homeOf(parsed.home),
        layout: parsed.layout,
        now: String(Math.floor(Date.now() / 1000)),
        plain: parsed.plain,
        theme: parsed.theme,
        variants: parsed.variants,
      }),
    );
  } else if (parsed.command === 'restore') {
    const result = restore({
      dryRun: parsed.dryRun,
      force: parsed.force,
      home: homeOf(parsed.home),
    });
    console.log(result.text);
  } else if (parsed.command === 'status') {
    const result = status({ home: homeOf(parsed.home) });
    console.log(result.rows.join('\n'));
    process.exitCode = result.healthy ? 0 : 1;
  }
}

await runMain(main);
