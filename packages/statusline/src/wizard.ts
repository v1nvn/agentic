import type { PreviewRender, PreviewSurfaces } from './payloads.js';
import type { RuntimeItem } from './resolve.js';

import { VERSION } from './cli.js';
import { configure, type ConfigureOptions, layoutItems } from './configure.js';
import { previewSources } from './payloads.js';
import { resolveRuntime } from './resolve.js';
import { type ThemeName, themesFor } from './themes.js';

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
  const runtime = resolveRuntime({ home: options.home });
  const themes = themesFor(runtime);
  const names = Object.keys(themes) as ThemeName[];
  const byItem = new Map<string, RuntimeItem>(
    runtime.items.map(item => [item.item, item] as const),
  );
  const sources = previewSources(options.home, Number(options.now));
  const tickBase = JSON.parse(sources.tick) as Record<string, unknown>;

  let pass: Pass = 'themes';
  let themeAt = 0;
  let draftLayout = '';
  let offered: {
    readonly alternatives: readonly string[];
    readonly item: string;
  }[] = [];
  const draft = new Map<string, string>();
  let focus = 0;
  let widthAt = 0;

  function bag(
    layout: string,
    values: Readonly<Record<string, string>>,
  ): PreviewRender {
    return {
      home: options.home,
      layout,
      main: sources.main,
      now: options.now,
      runtime,
      tick: `${JSON.stringify(
        { ...tickBase, columns: WIDTHS[widthAt] },
        null,
        2,
      )}\n`,
      values,
      width: WIDTHS[widthAt],
    };
  }

  function enterRefine(name: ThemeName): void {
    const theme = themes[name];
    draftLayout = theme.layout;
    offered = layoutItems(
      theme.layout,
      runtime.items.map(item => item.item),
    ).flatMap(item => {
      const entry = byItem.get(item);
      return entry === undefined
        ? []
        : [{ alternatives: entry.alternatives, item }];
    });
    draft.clear();
    for (const [item, alt] of Object.entries(theme.variants)) {
      draft.set(item, alt);
    }
    focus = 0;
  }

  function cycle(delta: number): void {
    const focused = offered.at(focus);
    if (focused === undefined || focused.alternatives.length === 0) {
      return;
    }
    const alts = focused.alternatives;
    const at = alts.indexOf(draft.get(focused.item) ?? '');
    draft.set(focused.item, alts[(at + delta + alts.length) % alts.length]);
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
        draft.set(focused.item, 'none');
      }
    }
    return pass;
  }

  function drawThemes(): void {
    const rows: string[] = [];
    let panel = '';
    for (let at = 0; at < names.length; at += 1) {
      const name = names[at];
      const theme = themes[name];
      const surfaces = deps.preview(bag(theme.layout, theme.variants));
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
    const values = Object.fromEntries(draft);
    const samples = focused.alternatives.map(
      alt =>
        deps.preview(
          bag(`{${focused.item}}`, { ...values, [focused.item]: alt }),
        ).line,
    );
    const full = deps.preview(bag(draftLayout, values));
    const rows = offered.map(
      (entry, at) =>
        `${at === focus ? '>' : ' '} ${entry.item.padEnd(9)} ${draft.get(entry.item)}`,
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
            `  ${alt === draft.get(focused.item) ? '*' : ' '} ${samples[at]}`,
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
        layout: draftLayout,
        variants: Object.fromEntries(draft),
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
