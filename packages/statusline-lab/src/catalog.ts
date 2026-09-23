import { readKeyConfig, resolveRuntime } from './resolve.js';

export interface CatalogOptions {
  readonly home: string;
  readonly items?: readonly string[];
}

export function catalog(options: CatalogOptions): string {
  const runtime = resolveRuntime({ home: options.home });
  const live = readKeyConfig(options.home).values;
  const byItem = new Map(runtime.items.map(item => [item.item, item]));
  const wanted = options.items ?? runtime.items.map(item => item.item);
  return wanted
    .map(item => {
      const entry = byItem.get(item);
      if (entry === undefined) {
        throw new Error(
          `unknown item '${item}' — valid items: ${[...byItem.keys()].join(' ')}`,
        );
      }
      const current = live[item] ?? entry.default;
      return `${item}: ${entry.alternatives
        .map(alt => (alt === current ? `${alt}*` : alt))
        .join(' | ')}`;
    })
    .join('\n');
}
