'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: string;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  subscription: {
    plan: string;
    billingCycle: string;
  };
  planConfig: {
    name: string;
    nameAr: string;
    price: number;
  };
  seller: {
    name: string;
    nameAr: string;
    taxNumber: string;
    crNumber: string;
    address: string;
    phone: string;
    email: string;
  };
  buyer: {
    name: string;
    nameAr: string;
    taxNumber: string | null;
    phone: string | null;
    email: string | null;
  };
}

// ZATCA TLV encoding
function buildZatcaQR(data: {
  sellerName: string;
  taxNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatAmount: string;
}): string {
  function tlv(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  }

  const parts = [
    tlv(1, data.sellerName),
    tlv(2, data.taxNumber),
    tlv(3, data.timestamp),
    tlv(4, data.totalWithVat),
    tlv(5, data.vatAmount),
  ];

  const totalLength = parts.reduce((s, p) => s + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'مدفوعة',
  UNPAID: 'غير مدفوعة',
  DRAFT: 'مسودة',
  OVERDUE: 'متأخرة',
  REFUNDED: 'مستردة',
};

const InvoicePDF = forwardRef<HTMLDivElement, { invoice: InvoiceData }>(
  ({ invoice }, ref) => {
    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    const formatCurrency = (n: number) => `${Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س`;
    const cycleLabel = invoice.subscription.billingCycle === 'YEARLY' ? 'سنوي' : 'شهري';

    const qrData = buildZatcaQR({
      sellerName: invoice.seller.nameAr,
      taxNumber: invoice.seller.taxNumber,
      timestamp: new Date(invoice.createdAt).toISOString(),
      totalWithVat: String(invoice.totalAmount),
      vatAmount: String(invoice.tax),
    });

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 max-w-[210mm] mx-auto"
        style={{ fontFamily: 'IBM Plex Sans Arabic, Arial, sans-serif', direction: 'rtl' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700">فاتورة ضريبية مبسطة</h1>
            <p className="text-sm text-gray-500 mt-1">Simplified Tax Invoice</p>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold text-emerald-700">{invoice.seller.nameAr}</p>
            <p className="text-xs text-gray-500">{invoice.seller.name}</p>
          </div>
        </div>

        {/* Invoice Info + Status */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-28">رقم الفاتورة:</span>
              <span className="font-mono font-bold">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-28">تاريخ الإصدار:</span>
              <span>{formatDate(invoice.createdAt)}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-28">الحالة:</span>
              <span className={`font-bold ${invoice.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {STATUS_LABELS[invoice.status] || invoice.status}
              </span>
            </div>
            {invoice.paidAt && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-28">تاريخ الدفع:</span>
                <span>{formatDate(invoice.paidAt)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-28">فترة الاشتراك:</span>
              <span>{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</span>
            </div>
          </div>
        </div>

        {/* Seller & Buyer */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">بيانات المورد</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-gray-500">الاسم: </span>{invoice.seller.nameAr}</p>
              <p><span className="text-gray-500">السجل التجاري: </span>{invoice.seller.crNumber}</p>
              <p><span className="text-gray-500">الرقم الضريبي: </span>{invoice.seller.taxNumber}</p>
              <p><span className="text-gray-500">العنوان: </span>{invoice.seller.address}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">بيانات العميل</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-gray-500">الاسم: </span>{invoice.buyer.nameAr}</p>
              {invoice.buyer.taxNumber && (
                <p><span className="text-gray-500">الرقم الضريبي: </span>{invoice.buyer.taxNumber}</p>
              )}
              {invoice.buyer.phone && (
                <p><span className="text-gray-500">الهاتف: </span>{invoice.buyer.phone}</p>
              )}
              {invoice.buyer.email && (
                <p><span className="text-gray-500">البريد: </span>{invoice.buyer.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-700 text-white">
                <th className="py-2.5 px-4 text-right rounded-tr-lg">#</th>
                <th className="py-2.5 px-4 text-right">الوصف</th>
                <th className="py-2.5 px-4 text-center">الكمية</th>
                <th className="py-2.5 px-4 text-left">سعر الوحدة</th>
                <th className="py-2.5 px-4 text-left rounded-tl-lg">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4">1</td>
                <td className="py-3 px-4">
                  <p className="font-medium">اشتراك باقة {invoice.planConfig.nameAr} ({cycleLabel})</p>
                  <p className="text-xs text-gray-500">
                    {invoice.planConfig.name} Plan - {invoice.subscription.billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'} Subscription
                  </p>
                </td>
                <td className="py-3 px-4 text-center">1</td>
                <td className="py-3 px-4 text-left">{formatCurrency(invoice.amount)}</td>
                <td className="py-3 px-4 text-left">{formatCurrency(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-start mb-8">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المجموع قبل الضريبة:</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ضريبة القيمة المضافة (15%):</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t-2 border-emerald-600 pt-2">
              <span>الإجمالي شامل الضريبة:</span>
              <span className="text-emerald-700">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* QR Code + Footer */}
        <div className="flex justify-between items-end border-t border-gray-200 pt-6">
          <div className="space-y-2">
            <p className="text-xs text-gray-400">هذه فاتورة ضريبية مبسطة صادرة وفقاً لمتطلبات</p>
            <p className="text-xs text-gray-400">هيئة الزكاة والضريبة والجمارك (ZATCA)</p>
            <p className="text-xs text-gray-400 mt-4">
              Generated by {invoice.seller.name}
            </p>
          </div>
          <div className="text-center">
            <QRCodeSVG value={qrData} size={120} level="M" />
            <p className="text-[10px] text-gray-400 mt-1">ZATCA QR Code</p>
          </div>
        </div>
      </div>
    );
  },
);

InvoicePDF.displayName = 'InvoicePDF';

export default InvoicePDF;
