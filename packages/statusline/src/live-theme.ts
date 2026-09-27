import { DEFAULT_LAYOUT, ITEMS } from './render/items.js';
import { type ScriptConfig } from './resolve.js';
import { type ThemeName, themesFor } from './themes.js';

// A key records only picks that differ from the registry defaults, so both
// sides fill absent items with the default before comparing: a theme matches
// when the key's effective picks and layout are exactly its own.
function effectivePicks(
  picks: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries([
    ...ITEMS.map(({ default: def, item }): [string, string] => [item, def]),
    ...Object.entries(picks),
  ]);
}

function effectiveLayout(layout: string): null | string {
  return layout === DEFAULT_LAYOUT ? null : layout;
}

export function liveTheme(key: ScriptConfig): ThemeName | undefined {
  if (key.layout === null) {
    return undefined;
  }
  const layout = effectiveLayout(key.layout);
  const values = effectivePicks(key.values);
  const themes = themesFor();
  for (const name of Object.keys(themes) as ThemeName[]) {
    const theme = themes[name];
    const picks = effectivePicks(theme.variants);
    if (
      layout === effectiveLayout(theme.layout) &&
      Object.entries(values).every(([item, variant]) => picks[item] === variant)
    ) {
      return name;
    }
  }
  return undefined;
}
