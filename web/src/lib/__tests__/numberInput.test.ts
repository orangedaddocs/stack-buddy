import { describe, it, expect } from 'vitest';
import { parseNumeric, clamp } from '../numberInput.js';

describe('parseNumeric', () => {
  it('parses bare integers and decimals', () => {
    expect(parseNumeric('1234')).toBe(1234);
    expect(parseNumeric('1234.56')).toBe(1234.56);
    expect(parseNumeric('0')).toBe(0);
  });

  it('parses negatives', () => {
    expect(parseNumeric('-5')).toBe(-5);
    expect(parseNumeric('-1234.5')).toBe(-1234.5);
  });

  it('strips thousands separators', () => {
    expect(parseNumeric('1,000')).toBe(1000);
    expect(parseNumeric('1,234,567.89')).toBe(1234567.89);
    expect(parseNumeric('1_000')).toBe(1000);
    expect(parseNumeric('1_000.50')).toBe(1000.5);
  });

  it('strips a leading dollar sign', () => {
    expect(parseNumeric('$2000')).toBe(2000);
    expect(parseNumeric('$1,234.56')).toBe(1234.56);
  });

  it('parses magnitude suffixes', () => {
    expect(parseNumeric('2K')).toBe(2000);
    expect(parseNumeric('2.5k')).toBe(2500);
    expect(parseNumeric('1M')).toBe(1_000_000);
    expect(parseNumeric('2.5m')).toBe(2_500_000);
    expect(parseNumeric('$2K')).toBe(2000);
    expect(parseNumeric('$1.5B')).toBe(1_500_000_000);
  });

  it('returns null for empty / partial input', () => {
    expect(parseNumeric('')).toBe(null);
    expect(parseNumeric('   ')).toBe(null);
    expect(parseNumeric('-')).toBe(null);
    expect(parseNumeric('.')).toBe(null);
    expect(parseNumeric('-.')).toBe(null);
  });

  it('returns null for ambiguous input', () => {
    expect(parseNumeric('abc')).toBe(null);
    expect(parseNumeric('1.2.3')).toBe(null);
    expect(parseNumeric('2KK')).toBe(null);
    expect(parseNumeric('K2')).toBe(null);
    expect(parseNumeric('5%')).toBe(null);
  });
});

describe('clamp', () => {
  it('returns the value unchanged when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0)).toBe(0);
    expect(clamp(-5)).toBe(-5);
  });

  it('clamps below min', () => {
    expect(clamp(-1, 0)).toBe(0);
    expect(clamp(50, 100, 200)).toBe(100);
  });

  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(101, undefined, 100)).toBe(100);
  });

  it('passes NaN through', () => {
    expect(Number.isNaN(clamp(NaN, 0, 100))).toBe(true);
  });

  it('handles only-min and only-max bounds', () => {
    expect(clamp(-5, 0)).toBe(0);
    expect(clamp(5, 0)).toBe(5);
    expect(clamp(150, undefined, 100)).toBe(100);
    expect(clamp(50, undefined, 100)).toBe(50);
  });
});
