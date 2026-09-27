import { type Theme, THEMES } from '../themes.js';
import { warn } from './engine.js';
import { DEFAULT_LAYOUT } from './items.js';

// One resolver, two doors: the render entry resolves here at paint, and the
// CLI's catalog/status/wizard import the same function for display — there is
// no second resolution path. Precedence: item flags beat the theme, --layout
// beats the theme's layout, no theme leaves the registry defaults.

interface PaintInput {
  readonly layout?: string;
  readonly picks?: Readonly<Record<string, string>>;
  readonly theme?: string;
}

interface PaintSelection {
  readonly layout: string;
  readonly picks: Readonly<Record<string, string>>;
}

export function resolvePaint(input: PaintInput): PaintSelection {
  const name = input.theme;
  const theme =
    name === undefined
      ? undefined
      : (THEMES as Readonly<Record<string, Theme | undefined>>)[name];
  if (name !== undefined && theme === undefined) {
    warn(`statusline: theme=${name} is not a known theme, ignored`);
  }
  return {
    layout: input.layout ?? theme?.layout ?? DEFAULT_LAYOUT,
    picks: { ...(theme?.variants ?? {}), ...input.picks },
  };
}
