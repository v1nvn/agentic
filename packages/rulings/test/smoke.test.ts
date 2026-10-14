import { describe, expect, it } from 'vitest';

import { main } from '../src/cli.ts';

describe('rulings CLI', () => {
  it('exits red — nothing to build yet', () => {
    expect(main(['some/page-dir'])).toBe(1);
  });

  it('requires a page directory', () => {
    expect(main([])).toBe(1);
  });
});
