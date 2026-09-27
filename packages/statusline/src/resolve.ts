import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { DATA_DIR } from './render/capture.js';

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
  readonly theme?: string;
  readonly values: Readonly<Record<string, string>>;
}

// The program the settings keys spawn: plain node on the data-dir renderer the
// CLI syncs, `$HOME` expanded by the host shell. Flags may follow in any
// order — the assignments-hug-the-command rule died with the env wall.
const RENDER_PROGRAM = `node "$HOME/${DATA_DIR.split(sep).join('/')}/render.mjs"`;
const PANEL_PROGRAM = `${RENDER_PROGRAM} panel`;
const KEY_SUFFIX = ' || true';

// The one spelling of a settings key: program, --theme, a quoted --layout,
// the differing flags, the swallow-everything suffix.
function keyValue(
  program: string,
  theme: null | string,
  layout: null | string,
  flags: readonly string[],
): string {
  return `${[
    program,
    ...(theme === null ? [] : [`--theme=${theme}`]),
    ...(layout === null ? [] : [`--layout='${layout}'`]),
    ...flags,
  ].join(' ')}${KEY_SUFFIX}`;
}

export function mainKeyValue(
  theme: null | string,
  layout: null | string,
  flags: readonly string[],
): string {
  return keyValue(RENDER_PROGRAM, theme, layout, flags);
}

export function panelKeyValue(
  theme: null | string,
  flags: readonly string[],
): string {
  return keyValue(PANEL_PROGRAM, theme, null, flags);
}

// The flags span between program and suffix — null unless the command is
// ours-shaped (nothing after the program but flags).
function commandMiddle(program: string, command: string): null | string {
  if (!command.startsWith(program) || !command.endsWith(KEY_SUFFIX)) {
    return null;
  }
  const middle = command.slice(
    program.length,
    command.length - KEY_SUFFIX.length,
  );
  return middle === '' || middle.startsWith(' --') ? middle : null;
}

export function isOurMainCommand(command: string): boolean {
  return commandMiddle(RENDER_PROGRAM, command) !== null;
}

export function isOurPanelCommand(command: string): boolean {
  return commandMiddle(PANEL_PROGRAM, command) !== null;
}

const NO_DECISIONS: ScriptConfig = { layout: null, values: {} };

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

// The flags a settings key carries parsed back into the decisions it
// records: --theme as the name, --<item>=<alt> as values, a quoted --layout.
// A null layout means no explicit --layout — a theme key leaves the layout
// to the theme. Unknown item names survive to surface as drift.
function parseKeyFlags(flags: string): ScriptConfig {
  const values: Record<string, string> = {};
  let theme: string | undefined;
  for (const [, name, alt] of flags.matchAll(
    /(?:^| )--([a-z][a-z0-9]*)=([a-z0-9]+)/g,
  )) {
    if (name === 'theme') {
      theme = alt;
    } else if (name !== 'now' && name !== 'layout') {
      values[name] = alt;
    }
  }
  const layout = /--layout='([^']*)'/.exec(flags);
  return {
    layout: layout === null ? null : layout[1],
    values,
    ...(theme === undefined ? {} : { theme }),
  };
}

// The main key's decisions. A missing settings member or a foreign key reads
// the same way, with no theme and no values.
export function readKeyConfig(home: string): ScriptConfig {
  const command = settingsCommand(home);
  const flags =
    command === null ? null : commandMiddle(RENDER_PROGRAM, command);
  return flags === null ? NO_DECISIONS : parseKeyFlags(flags);
}

// The panel key's decisions — the theme it carries, a style pick when one
// rides. An absent or foreign member reads as no decisions.
export function parsePanelCommand(command: null | string): ScriptConfig {
  const flags = command === null ? null : commandMiddle(PANEL_PROGRAM, command);
  return flags === null ? NO_DECISIONS : parseKeyFlags(flags);
}
