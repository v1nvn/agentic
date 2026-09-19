import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { firstPanelRow, previewSources, runtimeRenderer } from './payloads.js';
import {
  DATA_REL,
  mainScriptPath,
  readScriptConfig,
  type ResolvedRuntime,
  resolveRuntime,
  subagentScriptPath,
} from './resolve.js';

export interface ConfigureOptions {
  readonly dryRun?: boolean;
  readonly fallback?: 'default' | 'existing';
  readonly force?: boolean;
  readonly home: string;
  readonly layout?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export type ConfigureResult =
  | { mode: 'dry-run'; text: string }
  | { mode: 'printed'; text: string }
  | { mode: 'written' };

const MANAGED_BY =
  '# statusline-lab — your config. Managed by `statusline-lab configure`.';
const GLOB_NEWEST =
  'd=$(printf \'%s\\n\' "$HOME"/.claude/plugins/cache/agentic/statusline-lab/*/ | sort -V | tail -1)';
const MAIN_COMMAND = `~/${join(DATA_REL, 'statusline-command.sh')}`;
const SUB_COMMAND = `~/${join(DATA_REL, 'subagent-statusline.sh')}`;
const SETTINGS_COMMANDS: Readonly<Record<SettingsKey, string>> = {
  statusLine: MAIN_COMMAND,
  subagentStatusLine: SUB_COMMAND,
};
type SettingsKey = 'statusLine' | 'subagentStatusLine';

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

function parseClusters(layout: string): string[][] {
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

function generatedScript(
  bin: 'statusline.sh' | 'subagent.sh',
  exports: readonly (readonly [string, string])[],
  layout: null | string,
): string {
  const lines = [
    '#!/bin/bash',
    MANAGED_BY,
    ...exports.map(([name, value]) => `export STATUSLINE_LAB_${name}=${value}`),
    ...(layout === null ? [] : [`export STATUSLINE_LAB_LAYOUT='${layout}'`]),
    GLOB_NEWEST,
    `[ -f "\${d%/}/runtime/${bin}" ] && exec bash "\${d%/}/runtime/${bin}" "$@"`,
    'exit 0',
  ];
  return `${lines.join('\n')}\n`;
}

function writeAtomic(file: string, bytes: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, bytes);
  chmodSync(tmp, 0o755);
  renameSync(tmp, file);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOrNull(file: string): null | string {
  try {
    return readFileSync(file, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

function parseSettings(file: string, raw: string): Record<string, unknown> {
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

interface SettingsPlan {
  readonly adds: readonly (readonly [SettingsKey, string])[];
  readonly file: string;
  readonly raw: null | string;
  readonly repoints: readonly (readonly [SettingsKey, string])[];
}

function planSettings(home: string, force: boolean): SettingsPlan {
  const file = join(home, '.claude', 'settings.json');
  const raw = readOrNull(file);
  if (raw === null) {
    return {
      adds: Object.entries(SETTINGS_COMMANDS).map(([key, command]) => [
        key as SettingsKey,
        command,
      ]),
      file,
      raw: null,
      repoints: [],
    };
  }
  const parsed = parseSettings(file, raw);
  const adds: (readonly [SettingsKey, string])[] = [];
  const repoints: (readonly [SettingsKey, string])[] = [];
  for (const key of Object.keys(SETTINGS_COMMANDS) as SettingsKey[]) {
    const command = SETTINGS_COMMANDS[key];
    const value = parsed[key];
    const ours =
      isObject(value) &&
      Object.keys(value).length === 2 &&
      value.type === 'command' &&
      value.command === command;
    if (value === undefined) {
      adds.push([key, command]);
    } else if (ours) {
      continue;
    } else if (force) {
      repoints.push([key, command]);
    } else {
      throw new Error(
        `settings.json ${key} is foreign — rerun with --force to take it over`,
      );
    }
  }
  return { adds, file, raw, repoints };
}

function settingsValue(command: string): string {
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

function rootMemberValueSpan(
  raw: string,
  key: string,
): readonly [number, number] {
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
    const end = skipValue(raw, i);
    if (name === key) {
      return [i, end];
    }
    i = end;
    while (/\s/.test(raw[i] ?? '~')) {
      i += 1;
    }
    if (raw[i] === ',') {
      i += 1;
    } else if (raw[i] !== '}') {
      throw new Error('malformed member in settings.json');
    }
  }
  throw new Error(
    `cannot find the "${key}" member to repoint in settings.json`,
  );
}

function insertMembers(
  raw: string,
  members: readonly (readonly [SettingsKey, string])[],
): string {
  const close = raw.lastIndexOf('}');
  if (close === -1) {
    throw new Error('settings.json has no closing brace to splice into');
  }
  let at = close;
  while (/\s/.test(raw[at - 1] ?? '')) {
    at -= 1;
  }
  const rendered = members
    .map(([key, command]) => `"${key}": ${settingsValue(command)}`)
    .join(',\n  ');
  const comma = raw.replace(/\s/g, '') === '{}' ? '' : ',';
  return `${raw.slice(0, at)}${comma}\n  ${rendered}${raw.slice(at)}`;
}

function splicedSettings(raw: string, plan: SettingsPlan): string {
  let text = plan.adds.length > 0 ? insertMembers(raw, plan.adds) : raw;
  for (const [key, command] of plan.repoints) {
    const [start, end] = rootMemberValueSpan(text, key);
    text = `${text.slice(0, start)}${settingsValue(command)}${text.slice(end)}`;
  }
  return text;
}

function commitSettings(plan: SettingsPlan): void {
  if (plan.raw === null) {
    mkdirSync(dirname(plan.file), { recursive: true });
    const members = (
      Object.entries(SETTINGS_COMMANDS) as readonly [SettingsKey, string][]
    )
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

function renderPreview(
  runtime: ResolvedRuntime,
  home: string,
  values: Readonly<Record<string, string>>,
  layout: string,
  now: string,
): string {
  const sources = previewSources(home, Number(now));
  try {
    const variantEnv = Object.fromEntries(
      Object.entries(values).map(([item, alt]) => [
        `STATUSLINE_LAB_${item.toUpperCase()}`,
        alt,
      ]),
    );
    const line = runtimeRenderer({
      bin: join(runtime.dir, 'statusline.sh'),
      env: {
        COLUMNS: '200',
        HOME: home,
        NOW: now,
        STATUSLINE_LAB_LAYOUT: layout,
        ...variantEnv,
      },
      stdin: sources.main,
    }).replace(/\n+$/, '');
    const panel = firstPanelRow(
      runtimeRenderer({
        bin: join(runtime.dir, 'subagent.sh'),
        env: { COLUMNS: '200', HOME: home, NOW: now },
        stdin: sources.tick,
      }).replace(/\n+$/, ''),
    );
    return `dry-run at 200 columns — nothing written\n${line}\npanel ${panel}\n`;
  } finally {
    sources.cleanup();
  }
}

function printedConfig(runtime: ResolvedRuntime, home: string): string {
  const existing = readScriptConfig(home);
  const lines = [
    `layout='${existing.layout ?? runtime.defaultLayout}'`,
    ...runtime.items.map(
      item =>
        `${item.item}=${
          item.item in existing.values
            ? existing.values[item.item]
            : item.default
        }`,
    ),
  ];
  return [
    ...lines,
    'nothing written — pass variants (`statusline-lab configure --model block`) or run bare on a TTY for the wizard',
  ].join('\n');
}

function existingValue(
  values: Readonly<Record<string, string>>,
  item: string,
): string | undefined {
  return item in values ? values[item] : undefined;
}

export function configure(options: ConfigureOptions): ConfigureResult {
  const runtime = resolveRuntime({ home: options.home });
  const existing = readScriptConfig(options.home);
  const variants = options.variants ?? {};
  const explicit =
    options.layout !== undefined || Object.keys(variants).length > 0;

  if (!explicit && options.fallback === undefined && !options.dryRun) {
    return { mode: 'printed', text: printedConfig(runtime, options.home) };
  }

  const layout =
    options.layout === undefined || options.layout === ''
      ? (existing.layout ?? runtime.defaultLayout)
      : options.layout;
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
    if (!items.includes(item)) {
      throw new Error(
        `variant for '${item}' is not in the layout (layout items: ${items.join(' ')})`,
      );
    }
  }

  const values: Record<string, string> = {};
  for (const item of items) {
    let base: string | undefined;
    if (options.fallback === 'default') {
      base = byItem.get(item)?.default;
    } else if (options.fallback === 'existing') {
      base = existingValue(existing.values, item);
    } else if (!explicit) {
      base = existingValue(existing.values, item) ?? byItem.get(item)?.default;
    }
    if (base !== undefined) {
      values[item] = base;
    }
  }
  const missing = items.filter(
    item => !(item in values) && !(item in variants),
  );
  if (missing.length > 0) {
    throw new Error(
      `no variant for layout item${missing.length > 1 ? 's' : ''} ${missing.join(' ')} — pass --<item> <alt> for each or use --fallback=default|existing`,
    );
  }
  for (const [item, alt] of Object.entries(variants)) {
    values[item] = alt;
  }
  for (const item of items) {
    const alt = values[item];
    const offered = byItem.get(item)?.alternatives ?? [];
    if (!offered.includes(alt)) {
      throw new Error(
        `unknown variant '${alt}' for item '${item}' — valid: ${offered.join(' | ')}`,
      );
    }
  }

  if (options.dryRun) {
    const now = String(Math.floor(Date.now() / 1000));
    return {
      mode: 'dry-run',
      text: renderPreview(runtime, options.home, values, layout, now),
    };
  }

  const plan = planSettings(options.home, options.force ?? false);
  const exports = items.map((item): readonly [string, string] => [
    item.toUpperCase(),
    values[item],
  ]);
  writeAtomic(
    mainScriptPath(options.home),
    generatedScript('statusline.sh', exports, layout),
  );
  writeAtomic(
    subagentScriptPath(options.home),
    generatedScript('subagent.sh', [], null),
  );
  commitSettings(plan);
  return { mode: 'written' };
}
