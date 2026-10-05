import { describe, expect, it } from 'vitest';
import { slugify, titleOf } from '../src/send.js';

describe('titleOf', () => {
  it('takes the first Markdown heading, stripped of hashes and leading space', () => {
    expect(titleOf('intro\n\n## A heading here\nbody')).toBe('A heading here');
    expect(titleOf('#Only')).toBe('Only');
  });

  it('falls back to a timestamp for heading-less markdown', () => {
    expect(titleOf('no heading at all', new Date(2026, 8, 1, 9, 5))).toBe(
      'Claude reply 2026-09-01 09:05',
    );
  });

  it('falls back when the heading strips to nothing', () => {
    expect(titleOf('#', new Date(2026, 8, 1, 9, 5))).toBe('Claude reply 2026-09-01 09:05');
  });
});

describe('slugify', () => {
  it('replaces runs of non-alphanumerics with a single underscore', () => {
    expect(slugify('Hello World! #2')).toBe('Hello_World_2');
    expect(slugify('  padded  ')).toBe('_padded_');
  });

  it('caps the filename at 60 characters', () => {
    expect(slugify('a'.repeat(80)).length).toBe(60);
  });
});
