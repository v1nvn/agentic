import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const DATA_DIR = join(
  '.claude',
  'plugins',
  'data',
  'statusline-agentic',
);

// The capture tee: the raw stdin bytes tee to the data dir, written to a temp
// name and renamed so a reader never sees a half-written payload.
export function capturePayload(
  home: string,
  surface: 'main' | 'tick',
  payload: string,
): void {
  const dest = join(home, DATA_DIR, 'captures', `${surface}.json`);
  try {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(`${dest}.tmp`, payload);
    renameSync(`${dest}.tmp`, dest);
  } catch {
    // The tee is debug telemetry; a failed write must not kill the paint.
  }
}
