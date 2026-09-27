import { validateSelection } from './configure.js';
import { previewSources, renderPreview } from './payloads.js';
import { resolvePaint } from './render/theme.js';

export interface PreviewOptions {
  readonly home: string;
  readonly layout?: string;
  readonly now: string;
  readonly plain?: boolean;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export function preview(options: PreviewOptions): string {
  validateSelection(options);
  const { layout, picks } = resolvePaint({
    layout: options.layout,
    picks: options.variants,
    theme: options.theme,
  });
  const sources = previewSources(options.home, Number(options.now));
  try {
    const { line, panel } = renderPreview({
      home: options.home,
      layout,
      main: sources.main,
      now: options.now,
      plain: options.plain ?? !process.stdout.isTTY,
      tick: sources.tick,
      values: picks,
    });
    return `preview at 200 columns — nothing written\n${line}\npanel ${panel}\n`;
  } finally {
    sources.cleanup();
  }
}
