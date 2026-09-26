import { type ScriptConfig } from './resolve.js';
import { type ThemeName, THEMES } from './themes.js';

function sameAssignments(
  key: Readonly<Record<string, string>>,
  theme: Readonly<Record<string, string>>,
): boolean {
  return (
    Object.entries(key).every(([item, variant]) => theme[item] === variant) &&
    Object.entries(theme).every(([item, variant]) => key[item] === variant)
  );
}

export function liveTheme(key: ScriptConfig): ThemeName | undefined {
  for (const name of Object.keys(THEMES) as ThemeName[]) {
    const { layout, variants } = THEMES[name];
    if (key.layout === layout && sameAssignments(key.values, variants)) {
      return name;
    }
  }
  return undefined;
}
