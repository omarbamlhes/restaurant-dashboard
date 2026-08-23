import { buildZatcaQR, isValidSaudiTaxNumber } from './zatca';
// The server's authoritative encoder — imported here so a single test proves
// the browser fallback stays byte-for-byte identical to it. If they ever
// diverge, a receipt printed from a stale API response would carry a
// different QR than a fresh one, and this test fails.
import { buildZatcaQR as buildZatcaQRServer } from '../../api/src/common/zatca';

/** Decode a Base64 ZATCA payload back into its {tag: value} TLV fields. */
function decodeTlv(base64: string): Record<number, string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decoder = new TextDecoder();
  const out: Record<number, string> = {};
  let i = 0;
  while (i < bytes.length) {
    const tag = bytes[i];
    const len = bytes[i + 1];
    out[tag] = decoder.decode(bytes.subarray(i + 2, i + 2 + len));
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

describe('buildZatcaQR (web)', () => {
  it('round-trips every field through TLV/Base64 decoding', () => {
    const fields = decodeTlv(buildZatcaQR(sample));
    expect(fields[1]).toBe('بيت الشاورما');
    expect(fields[2]).toBe('300000000000003');
    expect(fields[3]).toBe('2026-05-19T10:00:00.000Z');
    expect(fields[4]).toBe('115.00');
    expect(fields[5]).toBe('15.00');
  });

  it('emits tags in the spec order 1,2,3,4,5', () => {
    const bytes = Uint8Array.from(atob(buildZatcaQR(sample)), (c) => c.charCodeAt(0));
    const tags: number[] = [];
    let i = 0;
    while (i < bytes.length) {
      tags.push(bytes[i]);
      i += 2 + bytes[i + 1];
    }
    expect(tags).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the UTF-8 byte length (not char count) for a multi-byte name', () => {
    // 12 characters, 22 UTF-8 bytes.
    const bytes = Uint8Array.from(atob(buildZatcaQR(sample)), (c) => c.charCodeAt(0));
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe(new TextEncoder().encode('بيت الشاورما').length);
  });

  it('formats money to exactly two decimals', () => {
    const fields = decodeTlv(buildZatcaQR({ ...sample, totalWithVat: 7, vatAmount: 0.9 }));
    expect(fields[4]).toBe('7.00');
    expect(fields[5]).toBe('0.90');
  });

  it('normalises a Date timestamp to ISO-8601', () => {
    const fields = decodeTlv(
      buildZatcaQR({ ...sample, timestamp: new Date('2026-05-19T10:00:00Z') }),
    );
    expect(fields[3]).toBe('2026-05-19T10:00:00.000Z');
  });

  it('produces a byte-identical string to the server encoder', () => {
    // The core guarantee: client fallback === server output for the same input.
    expect(buildZatcaQR(sample)).toBe(buildZatcaQRServer(sample));
    expect(
      buildZatcaQR({ ...sample, sellerName: 'Cafe & Co ☕', totalWithVat: '230.5' }),
    ).toBe(
      buildZatcaQRServer({ ...sample, sellerName: 'Cafe & Co ☕', totalWithVat: '230.5' }),
    );
  });
});

describe('isValidSaudiTaxNumber (web)', () => {
  it('accepts a 15-digit number starting and ending with 3', () => {
    expect(isValidSaudiTaxNumber('300000000000003')).toBe(true);
  });

  it('rejects wrong length, wrong boundary digits, and non-digits', () => {
    expect(isValidSaudiTaxNumber('30000000000003')).toBe(false);
    expect(isValidSaudiTaxNumber('100000000000003')).toBe(false);
    expect(isValidSaudiTaxNumber('300000000000001')).toBe(false);
    expect(isValidSaudiTaxNumber('3000000000000A3')).toBe(false);
    expect(isValidSaudiTaxNumber('')).toBe(false);
  });
});
