import { liveTheme } from './live-theme.js';
import { readKeyConfig, resolveRuntime } from './resolve.js';
import { themesFor } from './themes.js';

export interface CatalogOptions {
  readonly home: string;
  readonly items?: readonly string[];
  readonly themes?: boolean;
}

export function catalog(options: CatalogOptions): string {
  if (options.themes === true && options.items !== undefined) {
    throw new Error('--themes cannot combine with item flags');
  }
  const runtime = resolveRuntime({ home: options.home });
  const key = readKeyConfig(options.home);
  const live = liveTheme(key, runtime);
  const block = Object.entries(themesFor(runtime)).map(
    ([name, theme]) => `${name}${live === name ? '*' : ''}: ${theme.summary}`,
  );
  if (options.themes === true) {
    return block.join('\n');
  }
  const byItem = new Map(runtime.items.map(item => [item.item, item]));
  const wanted = options.items ?? runtime.items.map(item => item.item);
  const itemLines = wanted.map(item => {
    const entry = byItem.get(item);
    if (entry === undefined) {
      throw new Error(
        `unknown item '${item}' — valid items: ${[...byItem.keys()].join(' ')}`,
      );
    }
    const current = key.values[item] ?? entry.default;
    return `${item}: ${entry.alternatives
      .map(alt => (alt === current ? `${alt}*` : alt))
      .join(' | ')}`;
  });
  return [...block, '', ...itemLines].join('\n');
}
