import { describe, it, expect } from 'vitest';
import { formatUSD, formatBTC, formatPct, formatDate } from '../format.js';

describe('formatUSD', () => {
  it.each([
    [248_300, '$248K'],
    [1_236_000, '$1.2M'],
    [995, '$995'],
    [1500, '$1,500'],
    [0, '$0'],
    [NaN, '—'],
    [Infinity, '—'],
  ])('formats %s as %s', (n, expected) => {
    expect(formatUSD(n)).toBe(expected);
  });
});

describe('formatBTC', () => {
  it('formats 0.7341 as "0.7341 BTC"', () => {
    expect(formatBTC(0.7341)).toBe('0.7341 BTC');
  });
  it('renders NaN as "— BTC"', () => {
    expect(formatBTC(NaN)).toBe('— BTC');
  });
});

describe('formatPct', () => {
  it.each([
    [0.055, '5.5%'],
    [0.6034, '60.3%'],
    [1, '100.0%'],
    [NaN, '—'],
  ])('formats %s as %s', (n, expected) => {
    expect(formatPct(n)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formats a Date as "Jul 1, 2027"', () => {
    expect(formatDate(new Date('2027-07-01T00:00:00Z'))).toBe('Jul 1, 2027');
  });
  it('formats an ISO string', () => {
    expect(formatDate('2027-07-01')).toBe('Jul 1, 2027');
  });
});
