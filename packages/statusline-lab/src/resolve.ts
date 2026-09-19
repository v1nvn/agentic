import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DATA_REL = join(
  '.claude',
  'plugins',
  'data',
  'statusline-lab-agentic',
);

export function mainScriptPath(home: string): string {
  return join(home, DATA_REL, 'statusline-command.sh');
}

export function subagentScriptPath(home: string): string {
  return join(home, DATA_REL, 'subagent-statusline.sh');
}

export function capturePath(home: string, surface: 'main' | 'tick'): string {
  return join(home, DATA_REL, 'captures', `${surface}.json`);
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

interface InstalledPluginsFile {
  readonly plugins?: Record<
    string,
    readonly { readonly installPath?: unknown }[]
  >;
}

function installPathFrom(file: string): null | string {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const installPath = (parsed as InstalledPluginsFile | null)?.plugins?.[
    'statusline-lab@agentic'
  ]?.[0]?.installPath;
  return typeof installPath === 'string' && installPath !== ''
    ? installPath
    : null;
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
  const installPath = installPathFrom(
    join(home, '.claude', 'plugins', 'installed_plugins.json'),
  );
  const pluginDir =
    installPath ??
    newestCacheDir(
      join(home, '.claude', 'plugins', 'cache', 'agentic', 'statusline-lab'),
    );
  const dir = pluginDir === null ? null : join(pluginDir, 'runtime');
  if (dir === null || !existsSync(join(dir, 'statusline.sh'))) {
    throw new Error(
      `no statusline-lab runtime under ${home} — install the plugin first: claude plugin install statusline-lab@agentic`,
    );
  }
  return {
    defaultLayout: readDefaultLayout(dir),
    dir,
    items: readItems(dir),
  };
}

export function readScriptConfig(home: string): ScriptConfig {
  const file = mainScriptPath(home);
  if (!existsSync(file)) {
    return { layout: null, values: {} };
  }
  const values: Record<string, string> = {};
  let layout: null | string = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const layoutMatch = /^export STATUSLINE_LAB_LAYOUT='(.*)'$/.exec(line);
    if (layoutMatch) {
      layout = layoutMatch[1];
      continue;
    }
    const valueMatch = /^export STATUSLINE_LAB_([A-Z][A-Z0-9_]*)=(.+)$/.exec(
      line,
    );
    if (valueMatch) {
      values[valueMatch[1].toLowerCase()] = valueMatch[2];
    }
  }
  return { layout, values };
}
