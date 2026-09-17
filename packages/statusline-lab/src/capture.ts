import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface CaptureOptions {
  readonly home: string;
  readonly stdin: string;
}

export type CaptureKind = 'main' | 'tick';

export interface CaptureResult {
  readonly bytes: string;
  readonly kind: CaptureKind;
  readonly path: string;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map(key => [key, canonical(record[key])]),
    );
  }
  return value;
}

export function capture({ home, stdin }: CaptureOptions): CaptureResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdin);
  } catch {
    throw new Error('stdin is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('stdin is not a JSON object');
  }
  const kind: CaptureKind = Array.isArray(
    (parsed as Record<string, unknown>).tasks,
  )
    ? 'tick'
    : 'main';
  const bytes = `${JSON.stringify(canonical(parsed), null, 2)}\n`;
  const path = join(
    home,
    '.claude',
    'plugins',
    'data',
    'statusline-agentic',
    kind === 'tick' ? 'ticks' : 'payloads',
    'latest.json',
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { bytes, kind, path };
}
