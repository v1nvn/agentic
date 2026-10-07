import { describe, expect, it } from 'vitest';
import { barField, dotMeter, fmtTokens, padL, padR } from '../src/text.js';

describe('text degenerate values', () => {
  it('renders missing values as an em dash', () => {
    expect(fmtTokens(null)).toBe('—');
    expect(fmtTokens(undefined)).toBe('—');
    expect(fmtTokens(Number.NaN)).toBe('—');
  });

  it('passes overlong strings through the pads', () => {
    expect(padR('abcdef', 3)).toBe('abcdef');
    expect(padL('abcdef', 3)).toBe('abcdef');
  });

  it('is blank for zero or missing values', () => {
    expect(barField(0, 100, 10)).toBe(' '.repeat(10));
    expect(barField(50, 0, 10)).toBe(' '.repeat(10));
  });

  it('keeps an eighth-block sliver for any nonzero value', () => {
    expect(barField(0.001, 100, 10)).toBe('▏         ');
  });

  it('rounds a fractional cell up into a full block', () => {
    // 1.94 cells → 0.94 of a cell → round(7.52) = 8 eighths → two full blocks.
    expect(barField(19.4, 100, 10)).toBe('██        ');
  });

  it('clamps out-of-range percentages', () => {
    expect(dotMeter(120, 4)).toBe('████');
    expect(dotMeter(-10, 4)).toBe('····');
    expect(dotMeter(undefined, 4)).toBe('····');
  });
});
