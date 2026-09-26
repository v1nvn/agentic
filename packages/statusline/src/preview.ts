import { resolveSelection } from './configure.js';
import { previewSources, renderPreview } from './payloads.js';
import { resolveRuntime } from './resolve.js';

export interface PreviewOptions {
  readonly home: string;
  readonly layout?: string;
  readonly now: string;
  readonly plain?: boolean;
  readonly theme?: string;
  readonly variants?: Readonly<Record<string, string>>;
}

export function preview(options: PreviewOptions): string {
  const runtime = resolveRuntime({ home: options.home });
  const { layout, values } = resolveSelection(runtime, options);
  const sources = previewSources(options.home, Number(options.now));
  try {
    const { line, panel } = renderPreview({
      home: options.home,
      layout,
      main: sources.main,
      now: options.now,
      plain: options.plain ?? !process.stdout.isTTY,
      runtime,
      tick: sources.tick,
      values,
    });
    return `preview at 200 columns — nothing written\n${line}\npanel ${panel}\n`;
  } finally {
    sources.cleanup();
  }
}
