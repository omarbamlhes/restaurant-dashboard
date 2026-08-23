/**
 * ZATCA Phase 1 (Generation) — Simplified Tax Invoice QR (browser side).
 *
 * The API generates the authoritative QR and returns it as `order.zatcaQR`;
 * this module is the client-side fallback for older API responses and must
 * produce a byte-identical string for the same input (see zatca.spec.ts).
 *
 * Spec: TLV-encoded then Base64. Tags:
 *   1 = Seller name (UTF-8)
 *   2 = VAT registration number
 *   3 = Invoice timestamp (ISO 8601)
 *   4 = Invoice total (with VAT) — string, 2 decimals
 *   5 = VAT total — string, 2 decimals
 *
 * Reference: ZATCA E-invoicing Detailed Technical Guideline §3.1.1
 */
export interface ZatcaInvoiceData {
  sellerName: string;
  taxNumber: string;
  timestamp: Date | string;
  totalWithVat: number | string;
  vatAmount: number | string;
}

function tlv(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  const result = new Uint8Array(2 + valueBytes.length);
  result[0] = tag;
  result[1] = valueBytes.length;
  result.set(valueBytes, 2);
  return result;
}

function toMoney(n: number | string): string {
  return Number(n).toFixed(2);
}

/** Base64-encode raw bytes without relying on Node's Buffer (browser-safe). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // `btoa` exists in browsers; fall back to Buffer under Node (tests/SSR).
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

export function buildZatcaQR(data: ZatcaInvoiceData): string {
  const ts =
    typeof data.timestamp === 'string'
      ? new Date(data.timestamp).toISOString()
      : data.timestamp.toISOString();

  const parts = [
    tlv(1, data.sellerName),
    tlv(2, data.taxNumber),
    tlv(3, ts),
    tlv(4, toMoney(data.totalWithVat)),
    tlv(5, toMoney(data.vatAmount)),
  ];

  const totalLength = parts.reduce((s, p) => s + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return bytesToBase64(combined);
}

/**
 * ZATCA Saudi VAT registration number format:
 *   15 digits, must start with 3 and end with 3.
 */
export function isValidSaudiTaxNumber(taxNumber: string): boolean {
  return /^3\d{13}3$/.test(taxNumber);
}
