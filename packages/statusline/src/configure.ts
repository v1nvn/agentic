import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import {
  backupPath,
  isOurMainCommand,
  mainKeyValue,
  resolveRuntime,
  subagentKeyValue,
} from './resolve.js';
import { type Theme, THEMES } from './themes.js';

export interface ConfigureOptions {
  readonly force?: boolean;
  readonly home: string;
  readonly layout?: string;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export interface ConfigureResult {
  mode: 'written';
}

export type SettingsKey = 'statusLine' | 'subagentStatusLine';

export const SETTINGS_KEYS = ['statusLine', 'subagentStatusLine'] as const;

export function layoutItems(
  layout: string,
  valid: readonly string[],
): string[] {
  const known = new Set(valid);
  const items: string[] = [];
  for (const cluster of parseClusters(layout)) {
    for (const word of cluster) {
      if (!known.has(word)) {
        throw new Error(
          `unknown layout item '${word}' — valid items: ${valid.join(' ')}`,
        );
      }
      if (!items.includes(word)) {
        items.push(word);
      }
    }
  }
  return items;
}

export function parseClusters(layout: string): string[][] {
  const clusters: string[][] = [];
  let words: string[] = [];
  let word = '';
  let open = false;
  function pushWord(): void {
    if (word !== '') {
      words.push(word);
      word = '';
    }
  }
  for (const c of layout) {
    if (c === '{') {
      if (open) {
        throw new Error(`layout '${layout}': '{' inside a cluster`);
      }
      open = true;
      words = [];
    } else if (c === '}') {
      if (!open) {
        throw new Error(`layout '${layout}': '}' outside a cluster`);
      }
      pushWord();
      open = false;
      if (words.length > 0) {
        clusters.push(words);
      }
    } else if (c === ' ') {
      if (open) {
        pushWord();
      } else if (word !== '') {
        throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
      }
    } else if (/[a-z0-9]/.test(c)) {
      word += c;
    } else {
      throw new Error(
        `layout '${layout}': '${c}' is not layout grammar (braces, item ids, spaces)`,
      );
    }
  }
  if (open) {
    throw new Error(`layout '${layout}': unterminated cluster`);
  }
  if (word !== '') {
    throw new Error(`layout '${layout}': '${word}' sits outside a cluster`);
  }
  if (clusters.length === 0) {
    throw new Error(`layout '${layout}': no clusters`);
  }
  return clusters;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readOrNull(file: string): null | string {
  try {
    return readFileSync(file, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

export function parseSettings(
  file: string,
  raw: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file} is not valid JSON`, { cause: e });
  }
  if (!isObject(parsed)) {
    throw new Error(`${file} does not hold a settings object`);
  }
  return parsed;
}

export function memberCommand(value: unknown): null | string {
  if (!isObject(value) || value.type !== 'command') {
    return null;
  }
  return typeof value.command === 'string' ? value.command : null;
}

export function isOurMember(key: SettingsKey, value: unknown): boolean {
  const command = memberCommand(value);
  if (command === null) {
    return false;
  }
  return key === 'statusLine'
    ? isOurMainCommand(command)
    : command === subagentKeyValue;
}

interface SettingsPlan {
  readonly adds: readonly (readonly [SettingsKey, string])[];
  readonly file: string;
  readonly raw: null | string;
  readonly repoints: readonly (readonly [SettingsKey, string])[];
}

function planSettings(
  home: string,
  mainCommand: string,
  force: boolean,
): SettingsPlan {
  const file = join(home, '.claude', 'settings.json');
  const wanted: Readonly<Record<SettingsKey, string>> = {
    statusLine: mainCommand,
    subagentStatusLine: subagentKeyValue,
  };
  const raw = readOrNull(file);
  if (raw === null) {
    return {
      adds: SETTINGS_KEYS.map(key => [key, wanted[key]] as const),
      file,
      raw: null,
      repoints: [],
    };
  }
  const parsed = parseSettings(file, raw);
  const adds: (readonly [SettingsKey, string])[] = [];
  const repoints: (readonly [SettingsKey, string])[] = [];
  for (const key of SETTINGS_KEYS) {
    const command = wanted[key];
    const value = parsed[key];
    if (value === undefined) {
      adds.push([key, command]);
    } else if (memberCommand(value) === command) {
      continue;
    } else if (isOurMember(key, value) || force) {
      repoints.push([key, command]);
    } else {
      throw new Error(
        `settings.json ${key} is foreign — rerun with --force added to your configuration flags to take it over`,
      );
    }
  }
  return { adds, file, raw, repoints };
}

export function settingsValue(command: string): string {
  return JSON.stringify({ command, type: 'command' });
}

function skipString(raw: string, at: number): number {
  let i = at + 1;
  while (i < raw.length) {
    if (raw[i] === '\\') {
      i += 2;
    } else if (raw[i] === '"') {
      return i + 1;
    } else {
      i += 1;
    }
  }
  throw new Error('unterminated string in settings.json');
}

function skipValue(raw: string, at: number): number {
  const first = raw[at];
  if (first === '"') {
    return skipString(raw, at);
  }
  if (first === '{' || first === '[') {
    let depth = 0;
    let i = at;
    while (i < raw.length) {
      const c = raw[i];
      if (c === '"') {
        i = skipString(raw, i);
      } else if (c === '{' || c === '[') {
        depth += 1;
        i += 1;
      } else if (c === '}' || c === ']') {
        depth -= 1;
        i += 1;
        if (depth === 0) {
          return i;
        }
      } else {
        i += 1;
      }
    }
    throw new Error('unterminated container in settings.json');
  }
  let i = at;
  while (
    i < raw.length &&
    !',}]'.includes(raw[i] ?? '') &&
    !/\s/.test(raw[i] ?? '~')
  ) {
    i += 1;
  }
  return i;
}

interface RootMember {
  readonly name: string;
  readonly nameStart: number;
  readonly valueEnd: number;
  readonly valueStart: number;
}

function rootMembers(raw: string): readonly RootMember[] {
  const members: RootMember[] = [];
  let i = raw.indexOf('{') + 1;
  while (i < raw.length) {
    while (/\s/.test(raw[i] ?? '~')) {
      i += 1;
    }
    if (raw[i] === '}') {
      break;
    }
    if (raw[i] !== '"') {
      throw new Error('malformed member in settings.json');
    }
    const nameStart = i;
    const nameEnd = skipString(raw, i);
    const name = JSON.parse(raw.slice(i, nameEnd)) as string;
    i = nameEnd;
    while (/\s/.test(raw[i] ?? '~')) {
      i += 1;
    }
    if (raw[i] !== ':') {
      throw new Error('malformed member in settings.json');
    }
    i += 1;
    while (/\s/.test(raw[i] ?? '~')) {
      i += 1;
    }
    const valueStart = i;
    const valueEnd = skipValue(raw, i);
    members.push({ name, nameStart, valueEnd, valueStart });
    i = valueEnd;
    while (/\s/.test(raw[i] ?? '~')) {
      i += 1;
    }
    if (raw[i] === ',') {
      i += 1;
    } else if (raw[i] !== '}') {
      throw new Error('malformed member in settings.json');
    }
  }
  return members;
}

export function rootMemberValueSpan(
  raw: string,
  key: string,
): null | readonly [number, number] {
  const member = rootMembers(raw).find(m => m.name === key);
  return member === undefined ? null : [member.valueStart, member.valueEnd];
}

export function removeMembers(raw: string, keys: readonly string[]): string {
  let text = raw;
  for (const key of keys) {
    const members = rootMembers(text);
    const at = members.findIndex(m => m.name === key);
    if (at === -1) {
      throw new Error(
        `cannot find the "${key}" member to remove in settings.json`,
      );
    }
    if (members.length === 1) {
      return '{}';
    }
    const member = members[at];
    if (at > 0) {
      let start = member.nameStart;
      while (/\s/.test(text[start - 1] ?? '~')) {
        start -= 1;
      }
      text = `${text.slice(0, start - 1)}${text.slice(member.valueEnd)}`;
    } else {
      text = `${text.slice(0, member.nameStart)}${text.slice(members[1].nameStart)}`;
    }
  }
  return text;
}

export function insertMembers(
  raw: string,
  members: readonly (readonly [SettingsKey, string])[],
): string {
  const close = raw.lastIndexOf('}');
  if (close === -1) {
    throw new Error('settings.json has no closing brace to splice into');
  }
  let at = close;
  while (/\s/.test(raw[at - 1] ?? '~')) {
    at -= 1;
  }
  const comma = raw.replace(/\s/g, '') === '{}' ? '' : ',';
  return `${raw.slice(0, at)}${comma}\n  ${renderMembers(members)}${raw.slice(at)}`;
}

function renderMembers(
  members: readonly (readonly [string, string])[],
): string {
  return members
    .map(([key, command]) => `"${key}": ${settingsValue(command)}`)
    .join(',\n  ');
}

/** Splice each rendered value over its root member. */
export function repointRootMembers(
  raw: string,
  entries: readonly { key: string; value: string }[],
): string {
  let text = raw;
  for (const { key, value } of entries) {
    const span = rootMemberValueSpan(text, key);
    if (span === null) {
      throw new Error(`cannot find the "${key}" member in settings.json`);
    }
    text = `${text.slice(0, span[0])}${value}${text.slice(span[1])}`;
  }
  return text;
}

function splicedSettings(raw: string, plan: SettingsPlan): string {
  const text = plan.adds.length > 0 ? insertMembers(raw, plan.adds) : raw;
  return repointRootMembers(
    text,
    plan.repoints.map(([key, command]) => ({
      key,
      value: settingsValue(command),
    })),
  );
}

export interface SettingsBackup {
  readonly createdFile: boolean;
  readonly keys: Readonly<Partial<Record<SettingsKey, string>>>;
}

function writeBackupIfAbsent(home: string, plan: SettingsPlan): void {
  const file = backupPath(home);
  if (existsSync(file)) {
    return;
  }
  const keys: Partial<Record<SettingsKey, string>> = {};
  if (plan.raw !== null) {
    for (const key of SETTINGS_KEYS) {
      const span = rootMemberValueSpan(plan.raw, key);
      if (span === null) {
        continue;
      }
      const memberRaw = plan.raw.slice(span[0], span[1]);
      if (isOurMember(key, JSON.parse(memberRaw))) {
        continue;
      }
      keys[key] = memberRaw;
    }
  }
  const dir = dirname(file);
  mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(
    tmp,
    `${JSON.stringify({ createdFile: plan.raw === null, keys }, null, 2)}\n`,
  );
  renameSync(tmp, file);
}

function commitSettings(plan: SettingsPlan): void {
  if (plan.raw === null) {
    mkdirSync(dirname(plan.file), { recursive: true });
    const members = plan.adds
      .map(([key, command]) => `"${key}": ${settingsValue(command)}`)
      .join(',\n  ');
    writeFileSync(plan.file, `{\n  ${members}\n}\n`);
    return;
  }
  if (plan.adds.length === 0 && plan.repoints.length === 0) {
    return;
  }
  writeFileSync(plan.file, splicedSettings(plan.raw, plan));
}

const THEME_NAMES = Object.keys(THEMES).sort();

function themeNamed(name: string): Theme {
  const theme: Theme | undefined = (
    THEMES as Readonly<Record<string, Theme | undefined>>
  )[name];
  if (theme === undefined) {
    throw new Error(
      `unknown theme '${name}' — valid themes: ${THEME_NAMES.join(' ')}`,
    );
  }
  return theme;
}

export function configure(options: ConfigureOptions): ConfigureResult {
  const runtime = resolveRuntime({ home: options.home });
  const variants = options.variants ?? {};
  const theme =
    options.theme === undefined ? undefined : themeNamed(options.theme);

  if (
    theme === undefined &&
    options.layout === undefined &&
    Object.keys(variants).length === 0
  ) {
    throw new Error(
      "no theme and no item flags — on a terminal run 'statusline configure' for the wizard; in Claude Code use the /lab skill",
    );
  }

  const layout = options.layout ?? theme?.layout;
  if (layout === undefined) {
    throw new Error('no layout — pass --layout <spec> or --theme <name>');
  }
  const byItem = new Map(runtime.items.map(item => [item.item, item]));
  const items = layoutItems(
    layout,
    runtime.items.map(item => item.item),
  );

  for (const item of Object.keys(variants)) {
    if (!byItem.has(item)) {
      throw new Error(
        `unknown item '${item}' — valid items: ${[...byItem.keys()].join(' ')}`,
      );
    }
  }

  const values: Record<string, string> = {
    ...(theme?.variants ?? {}),
    ...variants,
  };
  const missing = items.filter(item => !(item in values));
  if (missing.length > 0) {
    const hints = missing.map(item => `--${item} <alt>`).join(' ');
    const names = missing.map(item => `'${item}'`).join(' ');
    const plural = missing.length > 1 ? 's' : '';
    throw new Error(
      theme === undefined
        ? `no variant for layout item${plural} ${names} — pass ${hints}, or name a theme: --theme ${THEME_NAMES.join('|')}`
        : `theme '${options.theme}' has no pick for layout item${plural} ${names} — pass ${hints}, or drop ${missing.length > 1 ? 'them' : 'it'} from the layout`,
    );
  }
  for (const [item, alt] of Object.entries(values)) {
    const offered = byItem.get(item)?.alternatives ?? [];
    if (!offered.includes(alt)) {
      throw new Error(
        `unknown variant '${alt}' for item '${item}' — valid: ${offered.join(' | ')}`,
      );
    }
  }

  const ordered = [
    ...items,
    ...runtime.items
      .map(entry => entry.item)
      .filter(item => !items.includes(item) && item in values),
  ];
  const assignments = ordered.map(
    item => `STATUSLINE_LAB_${item.toUpperCase()}=${values[item]}`,
  );
  const plan = planSettings(
    options.home,
    mainKeyValue(layout, assignments),
    options.force ?? false,
  );
  if (plan.adds.length > 0 || plan.repoints.length > 0) {
    writeBackupIfAbsent(options.home, plan);
  }
  commitSettings(plan);
  return { mode: 'written' };
}
