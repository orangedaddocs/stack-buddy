import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My 6 BTC Plan')).toBe('my-6-btc-plan');
  });
  it('strips diacritics and punctuation', () => {
    expect(slugify('Café & Déjà Vu!')).toBe('cafe-deja-vu');
  });
  it('collapses repeated separators', () => {
    expect(slugify('  hello   world  ')).toBe('hello-world');
  });
});
