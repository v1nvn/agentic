import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildPage, examplePagePath, loadPageFile, PAGE_FILE } from './page.ts';
import { validatePage } from './schema.ts';

const FLAGS = ['--new', '--no-open'];

function usage(): void {
  console.error('usage: rulings <page-dir> [--new] [--no-open]');
}

export function main(argv: string[]): number {
  const flags = argv.filter(a => a.startsWith('--'));
  const unknown = flags.filter(f => !FLAGS.includes(f));
  const dirs = argv.filter(a => !a.startsWith('--'));
  if (unknown.length > 0) {
    console.error(`unknown flag ${unknown[0]}`);
    usage();
    return 1;
  }
  if (dirs.length !== 1) {
    usage();
    return 1;
  }
  const dir = resolve(dirs[0].replace(/^~(?=\/)/, homedir()));
  const pageFile = join(dir, PAGE_FILE);

  if (flags.includes('--new')) {
    if (existsSync(pageFile)) {
      console.error(`FAIL  ${pageFile} exists; --new would overwrite it`);
      return 1;
    }
    mkdirSync(dir, { recursive: true });
    copyFileSync(examplePagePath(), pageFile);
  }
  if (!existsSync(pageFile)) {
    console.error(
      `FAIL  ${pageFile} is missing: write it, or pass --new to seed it from the example`,
    );
    return 1;
  }

  let page: unknown;
  try {
    page = loadPageFile(pageFile);
  } catch (e) {
    console.error(`FAIL  ${pageFile}: ${(e as Error).message}`);
    return 1;
  }
  const { errors } = validatePage(page);
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`error: ${e}`);
    }
    console.error(
      `FAIL  ${pageFile} has ${errors.length} problem${errors.length > 1 ? 's' : ''}; nothing written`,
    );
    return 1;
  }

  const indexFile = join(dir, 'index.html');
  writeFileSync(indexFile, buildPage(page));
  console.log(`wrote ${indexFile}`);
  if (!flags.includes('--no-open')) {
    const opened = spawnSync('open', [indexFile], { stdio: 'ignore' });
    if (opened.error !== undefined) {
      console.error(
        `note: page written, but could not open it (${opened.error.message})`,
      );
    }
  }
  return 0;
}
