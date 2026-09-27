import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { DATA_DIR } from './render/capture.js';
import { DEFAULT_LAYOUT } from './render/index.js';

export function capturePath(home: string, surface: 'main' | 'tick'): string {
  return join(home, DATA_DIR, 'captures', `${surface}.json`);
}

export function backupPath(home: string): string {
  return join(home, DATA_DIR, 'backup.json');
}

export function renderMjsPath(home: string): string {
  return join(home, DATA_DIR, 'render.mjs');
}

export interface ScriptConfig {
  readonly layout: null | string;
  readonly values: Readonly<Record<string, string>>;
}

// The program the settings keys spawn: plain node on the data-dir renderer the
// CLI syncs, `$HOME` expanded by the host shell. Flags may follow in any
// order — the assignments-hug-the-command rule died with the env wall.
const RENDER_PROGRAM = `node "$HOME/${DATA_DIR.split(sep).join('/')}/render.mjs"`;
const PANEL_PROGRAM = `${RENDER_PROGRAM} panel`;
const KEY_SUFFIX = ' || true';

export function mainKeyValue(
  layout: null | string,
  flags: readonly string[],
): string {
  return [
    RENDER_PROGRAM,
    ...(layout === null ? [] : [`--layout='${layout}'`]),
    ...flags,
    '|| true',
  ].join(' ');
}

export function panelKeyValue(flags: readonly string[]): string {
  return [PANEL_PROGRAM, ...flags, '|| true'].join(' ');
}

function isOurCommand(program: string, command: string): boolean {
  if (!command.startsWith(program) || !command.endsWith(KEY_SUFFIX)) {
    return false;
  }
  const middle = command.slice(
    program.length,
    command.length - KEY_SUFFIX.length,
  );
  return middle === '' || middle.startsWith(' --');
}

export function isOurMainCommand(command: string): boolean {
  return isOurCommand(RENDER_PROGRAM, command);
}

export function isOurPanelCommand(command: string): boolean {
  return isOurCommand(PANEL_PROGRAM, command);
}

function mainKeyFlags(command: string): null | string {
  if (!isOurMainCommand(command)) {
    return null;
  }
  return command.slice(
    RENDER_PROGRAM.length,
    command.length - KEY_SUFFIX.length,
  );
}

function settingsCommand(home: string): null | string {
  let raw: string;
  try {
    raw = readFileSync(join(home, '.claude', 'settings.json'), 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const member = (parsed as null | { statusLine?: unknown })?.statusLine;
  if (typeof member !== 'object' || member === null) {
    return null;
  }
  const command = (member as { command?: unknown }).command;
  return typeof command === 'string' ? command : null;
}

// The main key's flags parsed back into a selection: a null layout means no
// ours key at all; an ours key without --layout reads as the default layout
// it implies. Unknown item names survive to surface as status drift.
export function readKeyConfig(home: string): ScriptConfig {
  const command = settingsCommand(home);
  const flags = command === null ? null : mainKeyFlags(command);
  if (flags === null) {
    return { layout: null, values: {} };
  }
  const values: Record<string, string> = {};
  for (const [, name, alt] of flags.matchAll(
    /(?:^| )--([a-z][a-z0-9]*)=([a-z0-9]+)/g,
  )) {
    if (name !== 'theme' && name !== 'now') {
      values[name] = alt;
    }
  }
  const layout = /--layout='([^']*)'/.exec(flags);
  return { layout: layout === null ? DEFAULT_LAYOUT : layout[1], values };
}
