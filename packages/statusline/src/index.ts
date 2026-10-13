#!/usr/bin/env node
import { runCli } from '@v1nvn/agentic-core';

import { catalog } from './catalog.ts';
import { statuslineSpec } from './cli.ts';
import { configure } from './configure.ts';
import { preview } from './preview.ts';
import { restore } from './restore.ts';
import { status } from './status.ts';
import { terminalDeps } from './wizard-tui.ts';
import { createWizard, opensWizard } from './wizard.ts';

function homeOf(flag: string | undefined): string {
  const home = flag ?? process.env.HOME;
  if (home === undefined || home === '') {
    throw new Error('no home to operate on: set $HOME or pass --home');
  }
  return home;
}

process.exitCode = await runCli(
  statuslineSpec({
    catalog: args => {
      console.log(
        catalog({
          home: homeOf(args.home),
          items: args.items,
          themes: args.themes,
        }),
      );
    },
    configure: async args => {
      const home = homeOf(args.home);
      if (opensWizard(args, process.stdin.isTTY)) {
        const outcome = await createWizard(
          {
            force: args.force,
            home,
            now: String(Math.floor(Date.now() / 1000)),
          },
          terminalDeps(),
        );
        return outcome === 'save-failed' ? 1 : 0;
      }
      configure({
        force: args.force,
        home,
        layout: args.layout,
        theme: args.theme,
        variants: args.variants,
      });
      console.log('configured — live on the next paint');
    },
    preview: args => {
      console.log(
        preview({
          home: homeOf(args.home),
          layout: args.layout,
          now: String(Math.floor(Date.now() / 1000)),
          plain: args.plain,
          theme: args.theme,
          variants: args.variants,
        }),
      );
    },
    restore: args => {
      const result = restore({
        dryRun: args.dryRun,
        force: args.force,
        home: homeOf(args.home),
      });
      console.log(result.text);
    },
    status: args => {
      const result = status({ home: homeOf(args.home) });
      console.log(result.rows.join('\n'));
      return result.healthy ? 0 : 1;
    },
  }),
  process.argv.slice(2),
);
