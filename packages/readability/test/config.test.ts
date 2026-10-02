import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('keeps instructions within the 2048-char cut Claude Code applies', () => {
    expect(loadConfig({}).instructions.length).toBeLessThanOrEqual(2048);
  });
});
