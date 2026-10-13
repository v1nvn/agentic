import { ITEM_IDS, specFor } from './render/index.ts';
import { resolvePaint } from './render/theme.ts';
import { readKeyConfig } from './resolve.ts';
import { THEMES } from './themes.ts';

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
  const block = Object.entries(THEMES).map(
    ([name, theme]) =>
      `${name}${key.theme === name ? '*' : ''}: ${theme.summary}`,
  );
  if (options.themes === true) {
    return block.join('\n');
  }
  const resolved = resolvePaint({
    layout: key.layout ?? undefined,
    picks: key.values,
    theme: key.theme,
  });
  const wanted = options.items ?? ITEM_IDS;
  const itemLines = wanted.map(item => {
    const entry = specFor(item);
    if (entry === undefined) {
      throw new Error(
        `unknown item '${item}' — valid items: ${ITEM_IDS.join(' ')}`,
      );
    }
    const current = resolved.picks[item] ?? entry.default;
    return `${item}: ${entry.alternatives
      .map(alt => (alt === current ? `${alt}*` : alt))
      .join(' | ')}`;
  });
  return [...block, '', ...itemLines].join('\n');
}
