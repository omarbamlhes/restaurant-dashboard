import { buildZatcaQR, isValidSaudiTaxNumber } from './zatca';

/**
 * Unit tests for the ZATCA Phase-1 simplified-tax-invoice QR encoder.
 *
 * This code is legally load-bearing: the string it emits is what a ZATCA
 * auditor's scanner decodes off the customer's receipt, so the byte layout
 * (TLV → Base64) and the field formatting are pinned here exactly. A silent
 * change to any of it would make every printed invoice non-compliant.
 */

/** Decode a Base64 ZATCA payload back into its {tag: value} TLV fields. */
function decodeTlv(base64: string): Record<number, string> {
  const buf = Buffer.from(base64, 'base64');
  const out: Record<number, string> = {};
  let i = 0;
  while (i < buf.length) {
    const tag = buf[i];
    const len = buf[i + 1];
    out[tag] = buf.subarray(i + 2, i + 2 + len).toString('utf8');
    i += 2 + len;
  }
  return out;
}

const sample = {
  sellerName: 'بيت الشاورما',
  taxNumber: '300000000000003',
  timestamp: '2026-05-19T10:00:00.000Z',
  totalWithVat: 115,
  vatAmount: 15,
};

describe('buildZatcaQR', () => {
  it('round-trips every field through TLV/Base64 decoding', () => {
    const fields = decodeTlv(buildZatcaQR(sample));
    expect(fields[1]).toBe('بيت الشاورما');
    expect(fields[2]).toBe('300000000000003');
    expect(fields[3]).toBe('2026-05-19T10:00:00.000Z');
    expect(fields[4]).toBe('115.00');
    expect(fields[5]).toBe('15.00');
  });

  it('emits tags in the spec order 1,2,3,4,5', () => {
    const buf = Buffer.from(buildZatcaQR(sample), 'base64');
    const tags: number[] = [];
    let i = 0;
    while (i < buf.length) {
      tags.push(buf[i]);
      i += 2 + buf[i + 1];
    }
    expect(tags).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the UTF-8 byte length (not char count) in the TLV header', () => {
    // "بيت الشاورما" is 12 characters but 22 bytes in UTF-8. The length byte
    // that precedes the seller name must be the byte count, or the decoder
    // reads the wrong field boundary.
    const buf = Buffer.from(buildZatcaQR(sample), 'base64');
    expect(buf[0]).toBe(1); // tag
    expect(buf[1]).toBe(Buffer.byteLength('بيت الشاورما', 'utf8')); // = 22
  });

  it('formats money to exactly two decimals', () => {
    const fields = decodeTlv(
      buildZatcaQR({ ...sample, totalWithVat: 7, vatAmount: 0.9 }),
    );
    expect(fields[4]).toBe('7.00');
    expect(fields[5]).toBe('0.90');
  });

  it('accepts money as strings as well as numbers', () => {
    const fields = decodeTlv(
      buildZatcaQR({ ...sample, totalWithVat: '230.5', vatAmount: '30.07' }),
    );
    expect(fields[4]).toBe('230.50');
    expect(fields[5]).toBe('30.07');
  });

  it('normalises a Date timestamp to ISO-8601', () => {
    const fields = decodeTlv(
      buildZatcaQR({ ...sample, timestamp: new Date('2026-05-19T10:00:00Z') }),
    );
    expect(fields[3]).toBe('2026-05-19T10:00:00.000Z');
  });

  it('is deterministic for identical input', () => {
    expect(buildZatcaQR(sample)).toBe(buildZatcaQR(sample));
  });
});

describe('isValidSaudiTaxNumber', () => {
  it('accepts a 15-digit number starting and ending with 3', () => {
    expect(isValidSaudiTaxNumber('300000000000003')).toBe(true);
    expect(isValidSaudiTaxNumber('312345678901233')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidSaudiTaxNumber('30000000000003')).toBe(false); // 14
    expect(isValidSaudiTaxNumber('3000000000000003')).toBe(false); // 16
  });

  it('rejects numbers not starting/ending with 3', () => {
    expect(isValidSaudiTaxNumber('100000000000003')).toBe(false);
    expect(isValidSaudiTaxNumber('300000000000001')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidSaudiTaxNumber('3000000000000A3')).toBe(false);
    expect(isValidSaudiTaxNumber('3 0000000000003')).toBe(false);
    expect(isValidSaudiTaxNumber('')).toBe(false);
  });
});
