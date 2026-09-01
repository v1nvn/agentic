import { describe, expect, it } from 'vitest';
import { barField, fmtNum, fmtTokens, meter, padL, padR } from '../src/text-format.js';

describe('fmtTokens', () => {
  it('renders missing values as an em dash', () => {
    expect(fmtTokens(null)).toBe('—');
    expect(fmtTokens(undefined)).toBe('—');
    expect(fmtTokens(Number.NaN)).toBe('—');
  });

  it('compacts with one decimal from 1K up', () => {
    expect(fmtTokens(999)).toBe('999');
    expect(fmtTokens(1234)).toBe('1.2K');
    expect(fmtTokens(351564651)).toBe('351.6M');
    expect(fmtTokens(1.5e9)).toBe('1.5B');
  });
});

describe('fmtNum', () => {
  it('groups thousands in en-US', () => {
    expect(fmtNum(3748)).toBe('3,748');
    expect(fmtNum(0)).toBe('0');
  });
});

describe('padR / padL', () => {
  it('pads to width and passes overlong strings through', () => {
    expect(padR('ab', 5)).toBe('ab   ');
    expect(padR('abcdef', 3)).toBe('abcdef');
    expect(padL('7', 3)).toBe('  7');
    expect(padL('abcdef', 3)).toBe('abcdef');
  });
});

describe('barField', () => {
  it('is blank for zero or missing values', () => {
    expect(barField(0, 100, 10)).toBe(' '.repeat(10));
    expect(barField(50, 0, 10)).toBe(' '.repeat(10));
  });

  it('draws full blocks and trailing spaces at a simple fraction', () => {
    expect(barField(50, 100, 10)).toBe('█████     ');
  });

  it('keeps an eighth-block sliver for any nonzero value', () => {
    expect(barField(0.001, 100, 10)).toBe('▏         ');
  });

  it('rounds a fractional cell up into a full block', () => {
    // 1.94 cells → 0.94 of a cell → round(7.52) = 8 eighths → two full blocks.
    expect(barField(19.4, 100, 10)).toBe('██        ');
  });
});

describe('meter', () => {
  it('fills by percentage of width', () => {
    expect(meter(50, 10)).toBe('█████░░░░░');
  });

  it('clamps out-of-range percentages', () => {
    expect(meter(120, 4)).toBe('████');
    expect(meter(-10, 4)).toBe('░░░░');
    expect(meter(undefined, 4)).toBe('░░░░');
  });
});
