// jq semantics the two payload parsers share — the line and the panel were
// separate jq pipelines in bash and must keep their exact behaviors, but the
// meaning of `//`, tostring, and @tsv is one thing, written once.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// jq's `//`: only null, false, and a missing member fall through.
export function orElse(value: unknown, fallback: unknown): unknown {
  return value === undefined || value === null || value === false
    ? fallback
    : value;
}

// jq's tostring: scalars as text, containers as JSON.
export function jqText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

// jq's @tsv: backslash, tab, newline, and carriage return survive as their
// two-character escapes.
export function tsvEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
