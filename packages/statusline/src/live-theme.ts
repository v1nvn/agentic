import { type ResolvedRuntime, type ScriptConfig } from './resolve.js';
import { type ThemeName, themesFor } from './themes.js';

function sameAssignments(
  key: Readonly<Record<string, string>>,
  theme: Readonly<Record<string, string>>,
): boolean {
  return (
    Object.entries(key).every(([item, variant]) => theme[item] === variant) &&
    Object.entries(theme).every(([item, variant]) => key[item] === variant)
  );
}

export function liveTheme(
  key: ScriptConfig,
  runtime: ResolvedRuntime,
): ThemeName | undefined {
  const themes = themesFor(runtime);
  for (const name of Object.keys(themes) as ThemeName[]) {
    const { layout, variants } = themes[name];
    if (key.layout === layout && sameAssignments(key.values, variants)) {
      return name;
    }
  }
  return undefined;
}
