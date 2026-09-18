#!/usr/bin/env node
// assets/runtime is a generated copy of the plugin runtime — edit
// plugins/statusline-lab, never the copy (tests and the gallery render the copy).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(
  new URL('../../../plugins/statusline-lab', import.meta.url),
);
const TARGET = fileURLToPath(new URL('../assets/runtime', import.meta.url));

if (!existsSync(SOURCE)) {
  throw new Error(`plugin runtime missing: ${SOURCE}`);
}
rmSync(TARGET, { recursive: true, force: true });
cpSync(SOURCE, TARGET, { recursive: true });
