import { liveTheme } from './live-theme.js';
import { ITEMS } from './render/index.js';
import { readKeyConfig } from './resolve.js';
import { THEMES } from './themes.js';

export interface CatalogOptions {
  readonly home: string;
  readonly items?: readonly string[];
  readonly themes?: boolean;
}

export function catalog(options: CatalogOptions): string {
  if (options.themes === true && options.items !== undefined) {
    throw new Error('--themes cannot combine with item flags');
  }
  const key = readKeyConfig(options.home);
  const live = liveTheme(key);
  const block = Object.entries(THEMES).map(
    ([name, theme]) => `${name}${live === name ? '*' : ''}: ${theme.summary}`,
  );
  if (options.themes === true) {
    return block.join('\n');
  }
  const byItem = new Map(ITEMS.map(item => [item.item, item]));
  const wanted = options.items ?? ITEMS.map(item => item.item);
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
