import type { PreviewRender, PreviewSurfaces } from './payloads.js';

import { VERSION } from './cli.js';
import { configure, type ConfigureOptions, layoutItems } from './configure.js';
import { previewSources } from './payloads.js';
import { DEFAULT_PICKS, ITEM_IDS, specFor } from './render/items.js';
import { type ThemeName, THEMES } from './themes.js';

export interface WizardDeps {
  preview(bag: PreviewRender): PreviewSurfaces;
  readKeys(): AsyncGenerator<string>;
  render(frame: string): void;
}

export type WizardOutcome = 'cancelled' | 'save-failed' | 'saved';

export interface WizardOptions {
  readonly force?: boolean;
  readonly home: string;
  readonly now: string;
}

const WIDTHS: readonly number[] = [80, 120, 200];
type Pass = 'refine' | 'themes';
const THEME_KEYMAP = 'j/k focus · w width · enter pick · q cancel';
const REFINE_KEYMAP =
  'j/k move · h/l variant · s none · t themes · w width · enter save · q cancel';
// The one registry item no layout paints; its refine sample is the panel row.
const STYLE = 'style';

// index.ts routes its interactive branch through this predicate — the entry
// executes the CLI on import, so the gate's one door is a wizard export.
export function opensWizard(
  args: Pick<ConfigureOptions, 'layout' | 'theme' | 'variants'>,
  isTty: boolean,
): boolean {
  return (
    isTty &&
    args.layout === undefined &&
    args.theme === undefined &&
    args.variants === undefined
  );
}

export async function createWizard(
  options: WizardOptions,
  deps: WizardDeps,
): Promise<WizardOutcome> {
  const names = Object.keys(THEMES) as ThemeName[];
  const sources = previewSources(options.home, Number(options.now));
  const tickBase = JSON.parse(sources.tick) as Record<string, unknown>;

  let pass: Pass = 'themes';
  let themeAt = 0;
  let picked: ThemeName = names[0];
  let base: Readonly<Record<string, string>> = DEFAULT_PICKS;
  let offered: {
    readonly alternatives: readonly string[];
    readonly item: string;
  }[] = [];
  const overrides = new Map<string, string>();
  let focus = 0;
  let widthAt = 0;

  function bag(
    theme: string,
    layout?: string,
    values: Readonly<Record<string, string>> = {},
  ): PreviewRender {
    return {
      home: options.home,
      ...(layout === undefined ? {} : { layout }),
      main: sources.main,
      now: options.now,
      tick: `${JSON.stringify(
        { ...tickBase, columns: WIDTHS[widthAt] },
        null,
        2,
      )}\n`,
      theme,
      values,
      width: WIDTHS[widthAt],
    };
  }

  function enterRefine(name: ThemeName): void {
    picked = name;
    base = { ...DEFAULT_PICKS, ...THEMES[name].variants };
    const items = layoutItems(THEMES[name].layout, ITEM_IDS);
    offered = [...new Set([...items, STYLE])].flatMap(item => {
      const entry = specFor(item);
      return entry === undefined
        ? []
        : [{ alternatives: entry.alternatives, item }];
    });
    overrides.clear();
    focus = 0;
  }

  function effectivePick(item: string): string {
    return overrides.get(item) ?? base[item];
  }

  // An override lives only while it differs from the theme's own pick — the
  // save records the name plus true differences, never a resolved draft.
  function setPick(item: string, alt: string): void {
    if (alt === base[item]) {
      overrides.delete(item);
    } else {
      overrides.set(item, alt);
    }
  }

  function cycle(delta: number): void {
    const focused = offered.at(focus);
    if (focused === undefined || focused.alternatives.length === 0) {
      return;
    }
    const alts = focused.alternatives;
    const at = alts.indexOf(effectivePick(focused.item));
    setPick(focused.item, alts[(at + delta + alts.length) % alts.length]);
  }

  function step(key: string): Pass {
    const down = key === '\x1b[B' || key === 'j';
    const up = key === '\x1b[A' || key === 'k';
    if (key === 'w') {
      widthAt = (widthAt + 1) % WIDTHS.length;
    } else if (pass === 'themes') {
      if (down) {
        themeAt = (themeAt + 1) % names.length;
      } else if (up) {
        themeAt = (themeAt + names.length - 1) % names.length;
      }
    } else if (key === 't') {
      return 'themes';
    } else if (down) {
      focus = (focus + 1) % offered.length;
    } else if (up) {
      focus = (focus + offered.length - 1) % offered.length;
    } else if (key === '\x1b[C' || key === 'l') {
      cycle(1);
    } else if (key === '\x1b[D' || key === 'h') {
      cycle(-1);
    } else if (key === 's') {
      const focused = offered.at(focus);
      if (focused?.alternatives.includes('none')) {
        setPick(focused.item, 'none');
      }
    }
    return pass;
  }

  function drawThemes(): void {
    const rows: string[] = [];
    let panel = '';
    for (let at = 0; at < names.length; at += 1) {
      const name = names[at];
      const theme = THEMES[name];
      const surfaces = deps.preview(bag(name));
      const focused = at === themeAt;
      if (focused) {
        panel = surfaces.panel;
      }
      rows.push(`${focused ? '>' : ' '} ${name}: ${theme.summary}`);
      rows.push(`  ${surfaces.line}`);
    }
    deps.render(
      [
        `statusline configure · ${WIDTHS[widthAt]} columns (w cycles)`,
        '',
        ...rows,
        '',
        `panel ${panel}`,
        '',
        THEME_KEYMAP,
      ].join('\n'),
    );
  }

  function drawRefine(): void {
    const focused = offered.at(focus);
    if (focused === undefined) {
      return;
    }
    const values = Object.fromEntries(overrides);
    const samples = focused.alternatives.map(alt => {
      const surfaces = deps.preview(
        bag(picked, focused.item === STYLE ? undefined : `{${focused.item}}`, {
          ...values,
          [focused.item]: alt,
        }),
      );
      return focused.item === STYLE ? surfaces.panel : surfaces.line;
    });
    const full = deps.preview(bag(picked, undefined, values));
    const rows = offered.map(
      (entry, at) =>
        `${at === focus ? '>' : ' '} ${entry.item.padEnd(9)} ${effectivePick(entry.item)}`,
    );
    deps.render(
      [
        `statusline configure · ${WIDTHS[widthAt]} columns (w cycles)`,
        '',
        `  ${full.line}`,
        `  panel ${full.panel}`,
        '',
        `${focused.item}: ${focused.alternatives.join(' | ')}`,
        ...focused.alternatives.map(
          (alt, at) =>
            `  ${alt === effectivePick(focused.item) ? '*' : ' '} ${samples[at]}`,
        ),
        '',
        ...rows,
        '',
        REFINE_KEYMAP,
      ].join('\n'),
    );
  }

  function draw(): void {
    if (pass === 'themes') {
      drawThemes();
    } else {
      drawRefine();
    }
  }

  function finish(): WizardOutcome {
    try {
      configure({
        force: options.force,
        home: options.home,
        theme: picked,
        variants: Object.fromEntries(overrides),
      });
    } catch (e) {
      deps.render(
        `save failed: ${(e as Error).message}\nfix it and rerun: npx -y @v1nvn/statusline@${VERSION} configure\n`,
      );
      return 'save-failed';
    }
    deps.render('saved — live on the next paint\n');
    return 'saved';
  }

  try {
    const keys = deps.readKeys();
    draw();
    for await (const key of keys) {
      if (key === '\r') {
        if (pass === 'themes') {
          enterRefine(names[themeAt]);
          pass = 'refine';
          draw();
          continue;
        }
        return finish();
      }
      if (key === 'q' || key === '\x03') {
        break;
      }
      pass = step(key);
      draw();
    }
    deps.render('cancelled — nothing written\n');
    return 'cancelled';
  } finally {
    sources.cleanup();
  }
}
