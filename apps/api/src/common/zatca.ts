/**
 * ZATCA Phase 1 (Generation) — Simplified Tax Invoice QR
 *
 * Spec: TLV-encoded then Base64. Tags:
 *   1 = Seller name (UTF-8)
 *   2 = VAT registration number
 *   3 = Invoice timestamp (ISO 8601 UTC, e.g. 2026-05-19T10:00:00Z)
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

function tlv(tag: number, value: string): Buffer {
  const valueBuf = Buffer.from(value, 'utf8');
  const header = Buffer.from([tag, valueBuf.length]);
  return Buffer.concat([header, valueBuf]);
}

function toMoney(n: number | string): string {
  return Number(n).toFixed(2);
}

export function buildZatcaQR(data: ZatcaInvoiceData): string {
  const ts = typeof data.timestamp === 'string'
    ? new Date(data.timestamp).toISOString()
    : data.timestamp.toISOString();

  const parts = [
    tlv(1, data.sellerName),
    tlv(2, data.taxNumber),
    tlv(3, ts),
    tlv(4, toMoney(data.totalWithVat)),
    tlv(5, toMoney(data.vatAmount)),
  ];

  return Buffer.concat(parts).toString('base64');
}

/**
 * ZATCA Saudi VAT registration number format:
 *   15 digits, must start with 3 and end with 3
 */
export function isValidSaudiTaxNumber(taxNumber: string): boolean {
  return /^3\d{13}3$/.test(taxNumber);
}
