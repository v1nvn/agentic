import type { Opt } from './schema.ts';

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

export function hueOf(k: string): string {
  return 'o-' + 'abcd'.charAt('abcdefghijklmnopqrstuvwxyz'.indexOf(k) % 4);
}

export function needsOf(o: Opt): string[] {
  return typeof o.needs === 'string' ? [o.needs] : (o.needs ?? []);
}
