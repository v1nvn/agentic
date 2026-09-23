import { join } from 'node:path';

import type { RenderSpec } from './payloads.js';
import type { RuntimeItem } from './resolve.js';

import { VERSION } from './cli.js';
import { configure, layoutItems } from './configure.js';
import { firstPanelRow, previewSources } from './payloads.js';
import { readKeyConfig, resolveRuntime } from './resolve.js';

export interface WizardDeps {
  preview(spec: RenderSpec): string;
  readKeys(): AsyncGenerator<string>;
  render(frame: string): void;
}

export type WizardOutcome = 'cancelled' | 'save-failed' | 'saved';

export interface WizardOptions {
  readonly home: string;
  readonly now: string;
}

const WIDTHS: readonly number[] = [80, 120, 200];
const KEYMAP =
  'j/k move · h/l variant · s none · w width · enter save · q cancel';

export async function createWizard(
  options: WizardOptions,
  deps: WizardDeps,
): Promise<WizardOutcome> {
  const runtime = resolveRuntime({ home: options.home });
  const existing = readKeyConfig(options.home);
  const layout = existing.layout ?? runtime.defaultLayout;
  const byItem = new Map<string, RuntimeItem>(
    runtime.items.map(item => [item.item, item] as const),
  );
  const names = layoutItems(
    layout,
    runtime.items.map(item => item.item),
  );
  const offered: {
    readonly alternatives: readonly string[];
    readonly item: string;
  }[] = [];
  const draft = new Map<string, string>();
  for (const name of names) {
    const entry = byItem.get(name);
    if (entry === undefined) {
      continue;
    }
    offered.push({ alternatives: entry.alternatives, item: name });
    draft.set(
      name,
      name in existing.values &&
        entry.alternatives.includes(existing.values[name])
        ? existing.values[name]
        : entry.default,
    );
  }
  const sources = previewSources(options.home, Number(options.now));
  const mainBin = join(runtime.dir, 'statusline.sh');
  const panelBin = join(runtime.dir, 'subagent.sh');

  let focus = 0;
  let widthAt = 0;

  function variantEnv(): Record<string, string> {
    return Object.fromEntries(
      [...draft].map(([item, alt]) => [
        `STATUSLINE_LAB_${item.toUpperCase()}`,
        alt,
      ]),
    );
  }

  function env(): Record<string, string> {
    return {
      COLUMNS: String(WIDTHS[widthAt]),
      HOME: options.home,
      NOW: options.now,
      STATUSLINE_LAB_LAYOUT: layout,
      ...variantEnv(),
    };
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

  function step(key: string): void {
    if (key === '\x1b[B' || key === 'j') {
      focus = (focus + 1) % offered.length;
    } else if (key === '\x1b[A' || key === 'k') {
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
    } else if (key === 'w') {
      widthAt = (widthAt + 1) % WIDTHS.length;
    }
  }

  function draw(): void {
    const focused = offered.at(focus);
    if (focused === undefined) {
      return;
    }
    const samples = focused.alternatives.map(alt =>
      deps
        .preview({
          bin: mainBin,
          env: {
            ...env(),
            STATUSLINE_LAB_LAYOUT: `{${focused.item}}`,
            [`STATUSLINE_LAB_${focused.item.toUpperCase()}`]: alt,
          },
          stdin: sources.main,
        })
        .replace(/\n+$/, ''),
    );
    const line = deps
      .preview({ bin: mainBin, env: env(), stdin: sources.main })
      .replace(/\n+$/, '');
    // subagent.sh reads the width out of the tick itself, not COLUMNS.
    const tick = JSON.parse(sources.tick) as { columns?: number };
    tick.columns = WIDTHS[widthAt];
    const panel = deps
      .preview({
        bin: panelBin,
        env: {
          COLUMNS: String(WIDTHS[widthAt]),
          HOME: options.home,
          NOW: options.now,
        },
        stdin: `${JSON.stringify(tick, null, 2)}\n`,
      })
      .replace(/\n+$/, '');
    const rows = offered.map(
      (entry, at) =>
        `${at === focus ? '>' : ' '} ${entry.item.padEnd(9)} ${draft.get(entry.item)}`,
    );
    deps.render(
      [
        `statusline configure · ${WIDTHS[widthAt]} columns (w cycles)`,
        '',
        `  ${line}`,
        `  panel ${firstPanelRow(panel)}`,
        '',
        `${focused.item}: ${focused.alternatives.join(' | ')}`,
        ...focused.alternatives.map(
          (alt, at) =>
            `  ${alt === draft.get(focused.item) ? '*' : ' '} ${samples[at]}`,
        ),
        '',
        ...rows,
        '',
        KEYMAP,
      ].join('\n'),
    );
  }

  function finish(): WizardOutcome {
    try {
      configure({
        home: options.home,
        layout,
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
        return finish();
      }
      if (key === 'q' || key === '\x03') {
        break;
      }
      step(key);
      draw();
    }
    deps.render('cancelled — nothing written\n');
    return 'cancelled';
  } finally {
    sources.cleanup();
  }
}
