import { readFileSync } from 'node:fs';

import type { FromHtmlInput } from './schemas.ts';

export function readHtmlFile(localPath: string): string {
  const raw = readFileSync(localPath, 'utf8');
  const trimmed = raw.trim();
  // A top-level JSON string scalar is a chrome-devtools capture (its JSON-encoded
  // return value written to disk), not raw markup — unwrap it before parsing.
  if (trimmed.length < 2 || trimmed.at(0) !== '"' || trimmed.at(-1) !== '"') {
    return raw;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

export function fromLocalPath<T extends { localPath: string }>(
  input: T,
): FromHtmlInput<T> {
  const { localPath, ...rest } = input;
  return { ...rest, html: readHtmlFile(localPath) };
}

export function withSchemaDefaults<
  T extends { localPath: string },
  I extends FromHtmlInput<T>,
>(schema: { parse(raw: unknown): T }, input: I): I & T {
  return { ...schema.parse({ localPath: '' }), ...input };
}
