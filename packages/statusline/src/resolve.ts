import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DATA_REL = join(
  '.claude',
  'plugins',
  'data',
  'statusline-agentic',
);

export function capturePath(home: string, surface: 'main' | 'tick'): string {
  return join(home, DATA_REL, 'captures', `${surface}.json`);
}

export function backupPath(home: string): string {
  return join(home, DATA_REL, 'backup.json');
}

export interface RuntimeItem {
  readonly alternatives: readonly string[];
  readonly default: string;
  readonly item: string;
}

export interface ResolvedRuntime {
  readonly defaultLayout: string;
  readonly dir: string;
  readonly items: readonly RuntimeItem[];
}

export interface ScriptConfig {
  readonly layout: null | string;
  readonly values: Readonly<Record<string, string>>;
}

// The env assignments must immediately precede bash: a prefix on the d=
// assignment dies with that statement.
export const KEY_RESOLVER =
  "d=$(printf '%s\\n' ~/.claude/plugins/cache/agentic/statusline/*/ | sort -V | tail -1)";
const MAIN_PREFIX = `${KEY_RESOLVER}; `;
const MAIN_SUFFIX = 'bash "${d}runtime/statusline.sh" 2>/dev/null || true';

export function mainKeyValue(
  layout: string,
  assignments: readonly string[],
): string {
  const env = [`STATUSLINE_LAB_LAYOUT='${layout}'`, ...assignments].join(' ');
  return `${MAIN_PREFIX}${env} ${MAIN_SUFFIX}`;
}

export const subagentKeyValue = `${KEY_RESOLVER}; bash "\${d}runtime/subagent.sh" 2>/dev/null || true`;

export function isOurMainCommand(command: string): boolean {
  return command.startsWith(MAIN_PREFIX) && command.endsWith(` ${MAIN_SUFFIX}`);
}

function mainKeyMiddle(command: string): null | string {
  if (!isOurMainCommand(command)) {
    return null;
  }
  return command.slice(
    MAIN_PREFIX.length,
    command.length - MAIN_SUFFIX.length - 1,
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

export function readKeyConfig(home: string): ScriptConfig {
  const command = settingsCommand(home);
  const middle = command === null ? null : mainKeyMiddle(command);
  if (middle === null) {
    return { layout: null, values: {} };
  }
  const layout = /^STATUSLINE_LAB_LAYOUT='([^']*)'/.exec(middle);
  if (layout === null) {
    return { layout: null, values: {} };
  }
  const values: Record<string, string> = {};
  for (const [, name, alt] of middle.matchAll(
    /(?:^| )STATUSLINE_LAB_([A-Z][A-Z0-9_]*)=([a-z0-9]+)/g,
  )) {
    values[name.toLowerCase()] = alt;
  }
  return { layout: layout[1], values };
}

function byVersion(a: string, b: string): number {
  const left = a.split('.');
  const right = b.split('.');
  for (let i = 0; i < left.length || i < right.length; i += 1) {
    const delta =
      (parseInt(left[i] ?? '0', 10) || 0) -
      (parseInt(right[i] ?? '0', 10) || 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function newestCacheDir(cacheRoot: string): null | string {
  let versions: string[];
  try {
    versions = readdirSync(cacheRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return null;
  }
  if (versions.length === 0) {
    return null;
  }
  versions.sort(byVersion);
  return join(cacheRoot, versions[versions.length - 1]);
}

function readAlternatives(dir: string): Map<string, readonly string[]> {
  const declared = new Map<string, readonly string[]>();
  const components = join(dir, 'components');
  for (const file of readdirSync(components).sort()) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    for (const line of readFileSync(join(components, file), 'utf8').split(
      '\n',
    )) {
      if (!line.startsWith('#')) {
        break;
      }
      const match = /alternatives:\s*(.+)$/.exec(line);
      if (match) {
        declared.set(
          file.slice(0, -'.sh'.length),
          match[1]
            .split('|')
            .map(alt => alt.trim().replace(/\s*\(current\)$/, '')),
        );
      }
    }
  }
  return declared;
}

function readItems(dir: string): readonly RuntimeItem[] {
  const alternatives = readAlternatives(dir);
  const defaults = new Map<string, string>();
  for (const [, item, alt] of readFileSync(
    join(dir, 'lib.sh'),
    'utf8',
  ).matchAll(/([a-z]+)\) echo ([a-z]+) ;;/g)) {
    defaults.set(item, alt);
  }
  const match = /^COMPS="(.+)"$/m.exec(
    readFileSync(join(dir, 'statusline.sh'), 'utf8'),
  );
  if (match === null) {
    throw new Error(`statusline.sh in ${dir} declares no COMPS order`);
  }
  return match[1].split(' ').map(item => {
    const alt = defaults.get(item);
    if (alt === undefined) {
      throw new Error(`lib.sh in ${dir} declares no default for '${item}'`);
    }
    return {
      alternatives: alternatives.get(item) ?? [],
      default: alt,
      item,
    };
  });
}

function readDefaultLayout(dir: string): string {
  const match = /^export DEFAULT_LAYOUT='(.*)'$/m.exec(
    readFileSync(join(dir, 'lib.sh'), 'utf8'),
  );
  if (match === null) {
    throw new Error(`lib.sh in ${dir} declares no DEFAULT_LAYOUT`);
  }
  return match[1];
}

export function resolveRuntime({ home }: { home: string }): ResolvedRuntime {
  const pluginDir = newestCacheDir(
    join(home, '.claude', 'plugins', 'cache', 'agentic', 'statusline'),
  );
  const dir = pluginDir === null ? null : join(pluginDir, 'runtime');
  if (dir === null || !existsSync(join(dir, 'statusline.sh'))) {
    throw new Error(
      `no statusline runtime under ${home} — install the plugin first: claude plugin install statusline@agentic`,
    );
  }
  return {
    defaultLayout: readDefaultLayout(dir),
    dir,
    items: readItems(dir),
  };
}
