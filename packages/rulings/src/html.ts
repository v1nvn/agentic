export interface Stage {
  body: string;
  cap: string;
}

export function esc(s: unknown): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}
