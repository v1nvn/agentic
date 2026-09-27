import { describe, expect, it } from 'vitest';

// The argv door implemented in src/render/argv.ts (r2: the grammar of the
// render.mjs entry, node:util parseArgs — never commander, never
// @v1nvn/agentic-core; the entry shares only the registry data with the CLI):
//   parseArgv(argv: readonly string[]): {
//     mode: 'line' | 'panel';      // the `panel` positional, else line
//     picks: Record<string, string>; // accepted --<item>=<alt> overrides
//     warnings: string[];          // the entry prints these to stderr
//     theme?: string;              // --theme=<name>, passed through unresolved
//     layout?: string;             // --layout=<items>, passed through unresolved
//     now?: number;                // --now=<epoch> (the test/preview NOW pin)
//   }
// Grammar only, not resolution: theme/layout values survive whatever they
// are (the theme resolver lands in a later unit). Item names and their
// alternatives validate against the render registry (ITEMS from
// src/render/index.js): a non-registry --name is an unknown flag (warning +
// ignored), a registry item with an unregistered alternative warns and drops
// the override — the item's default applies downstream (the check_config
// rule). Non-numeric --now, a valueless flag, and an unknown positional
// warn and are ignored. Warning texts are unpinned; these tests assert the
// count and that a warning names its flag.
import { parseArgv } from '../src/render/argv.js';

describe('parseArgv known grammar', () => {
  it('empty argv is line mode with no decisions', () => {
    expect(parseArgv([])).toEqual({
      mode: 'line',
      picks: {},
      warnings: [],
    });
  });

  it('--theme=<name> survives as a value even though themes land later', () => {
    expect(parseArgv(['--theme=lean'])).toEqual({
      mode: 'line',
      picks: {},
      warnings: [],
      theme: 'lean',
    });
  });

  it('--layout=<items> passes through unresolved', () => {
    expect(parseArgv(['--layout={cwd branch}'])).toEqual({
      mode: 'line',
      picks: {},
      warnings: [],
      layout: '{cwd branch}',
    });
  });

  it('--now=<epoch> parses as a number', () => {
    expect(parseArgv(['--now=1788870000']).now).toBe(1788870000);
  });

  it('--<item>=<alt> registers picks for arbitrary item names', () => {
    expect(parseArgv(['--bar=gauge', '--style=dots']).picks).toEqual({
      bar: 'gauge',
      style: 'dots',
    });
  });

  it('the panel positional selects panel mode and keeps flags', () => {
    expect(parseArgv(['panel'])).toEqual({
      mode: 'panel',
      picks: {},
      warnings: [],
    });
    expect(parseArgv(['panel', '--theme=lean', '--bar=gauge'])).toEqual({
      mode: 'panel',
      picks: { bar: 'gauge' },
      warnings: [],
      theme: 'lean',
    });
  });
});

describe('parseArgv unknown names and values', () => {
  it('an unknown flag name warns and is ignored', () => {
    const out = parseArgv(['--verbose=x', '--theme=lean']);
    expect(out.theme).toBe('lean');
    expect(out.picks).toEqual({});
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]).toContain('verbose');
  });

  it('an unknown value for a known item warns and drops the override', () => {
    const out = parseArgv(['--bar=nope', '--style=dots']);
    expect(out.picks).toEqual({ style: 'dots' });
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]).toContain('bar');
    expect(out.warnings[0]).toContain('nope');
  });

  it('a non-numeric --now warns and is ignored', () => {
    const out = parseArgv(['--now=yesterday']);
    expect('now' in out).toBe(false);
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]).toContain('now');
  });

  it('a valueless flag warns and is ignored', () => {
    const out = parseArgv(['--theme']);
    expect('theme' in out).toBe(false);
    expect(out.mode).toBe('line');
    expect(out.warnings).toHaveLength(1);
  });

  it('an unknown positional warns and stays line mode', () => {
    const out = parseArgv(['wibble']);
    expect(out.mode).toBe('line');
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0]).toContain('wibble');
  });
});
