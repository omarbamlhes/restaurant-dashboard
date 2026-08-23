import { normalizeSaudiPhone, isValidSaudiPhone } from './phone.util';

describe('normalizeSaudiPhone', () => {
  it('normalises every common Saudi shape to +9665XXXXXXXX', () => {
    const expected = '+966512345678';
    expect(normalizeSaudiPhone('0512345678')).toBe(expected);
    expect(normalizeSaudiPhone('512345678')).toBe(expected);
    expect(normalizeSaudiPhone('966512345678')).toBe(expected);
    expect(normalizeSaudiPhone('+966512345678')).toBe(expected);
    expect(normalizeSaudiPhone('00966512345678')).toBe(expected);
  });

  it('ignores spaces, dashes and parentheses', () => {
    expect(normalizeSaudiPhone('05 12 34 56 78')).toBe('+966512345678');
    expect(normalizeSaudiPhone('+966-51-234-5678')).toBe('+966512345678');
    expect(normalizeSaudiPhone(' (0512) 345678 ')).toBe('+966512345678');
  });

  it('rejects non-mobile / malformed numbers', () => {
    expect(normalizeSaudiPhone('0112345678')).toBeNull(); // landline (01)
    expect(normalizeSaudiPhone('05123')).toBeNull(); // too short
    expect(normalizeSaudiPhone('0512345678999')).toBeNull(); // too long
    expect(normalizeSaudiPhone('+14155552671')).toBeNull(); // non-Saudi
    expect(normalizeSaudiPhone('hello')).toBeNull();
  });

  it('handles empty / nullish input', () => {
    expect(normalizeSaudiPhone('')).toBeNull();
    expect(normalizeSaudiPhone(null)).toBeNull();
    expect(normalizeSaudiPhone(undefined)).toBeNull();
  });
});

describe('isValidSaudiPhone', () => {
  it('reflects normalisation success', () => {
    expect(isValidSaudiPhone('0512345678')).toBe(true);
    expect(isValidSaudiPhone('0112345678')).toBe(false);
  });
});
