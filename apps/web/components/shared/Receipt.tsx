'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';
import { paymentLabel } from '@/lib/payment-methods';

interface ReceiptItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  menuItem: { nameAr: string; name?: string };
}

interface ReceiptData {
  id: string;
  orderNumber: string;
  type: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  cashAmount: number;
  cardAmount: number;
  changeAmount: number;
  createdAt: string;
  items: ReceiptItem[];
  zatcaQR?: string | null;
  table?: { number: number; nameAr?: string } | null;
  branch: {
    nameAr: string;
    name: string;
    address?: string;
    restaurant: {
      nameAr: string;
      name: string;
      taxNumber?: string | null;
      phone?: string | null;
    };
  };
}

const typeLabels: Record<string, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
};

// ZATCA TLV encoding for simplified tax invoice QR
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

  // Base64 encode
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export default function Receipt({ order, onClose }: { order: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const restaurant = order.branch.restaurant;
  const hasVat = restaurant.taxNumber;

  // Prefer the server-generated QR (authoritative + ZATCA Phase 2-ready),
  // fall back to client-side generation for older API responses.
  const qrData = order.zatcaQR
    ?? (hasVat
      ? buildZatcaQR({
          sellerName: restaurant.nameAr,
          taxNumber: restaurant.taxNumber!,
          timestamp: new Date(order.createdAt).toISOString(),
          totalWithVat: Number(order.total).toFixed(2),
          vatAmount: Number(order.tax).toFixed(2),
        })
      : null);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm print:bg-white print:backdrop-blur-none" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:max-w-none print:mx-0" onClick={(e) => e.stopPropagation()}>
        {/* Action buttons - hidden in print */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 print:hidden">
          <h3 className="font-bold text-gray-900">الفاتورة</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Receipt content */}
        <div ref={receiptRef} id="receipt-content" className="p-6 text-center text-sm text-gray-900 receipt-thermal">
          {/* Restaurant Header */}
          <div className="mb-4">
            <h2 className="text-lg font-bold">{restaurant.nameAr}</h2>
            <p className="text-xs text-gray-500">{restaurant.name}</p>
            <p className="text-xs text-gray-500 mt-1">{order.branch.nameAr}</p>
            {order.branch.address && (
              <p className="text-xs text-gray-400">{order.branch.address}</p>
            )}
            {restaurant.phone && (
              <p className="text-xs text-gray-400" dir="ltr">{restaurant.phone}</p>
            )}
            {hasVat && (
              <p className="text-xs text-gray-500 mt-1">الرقم الضريبي: <span dir="ltr">{restaurant.taxNumber}</span></p>
            )}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Order Info */}
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>رقم الطلب</span>
            <span className="font-mono font-medium">#{order.orderNumber.slice(-6)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>التاريخ</span>
            <span dir="ltr">{new Date(order.createdAt).toLocaleString('ar-SA')}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>النوع</span>
            <span>{typeLabels[order.type] || order.type}</span>
          </div>
          {order.table && (
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>الطاولة</span>
              <span>{order.table.nameAr || `طاولة ${order.table.number}`}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Items */}
          <div className="text-right space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="flex-1 text-right">
                  {item.menuItem.nameAr} × {item.quantity}
                </span>
                <span className="font-mono mr-2">{formatSAR(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Totals */}
          <div className="space-y-1 text-xs receipt-totals">
            <div className="flex justify-between">
              <span>المجموع الفرعي</span>
              <span className="font-mono">{formatSAR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ضريبة القيمة المضافة (15%)</span>
              <span className="font-mono">{formatSAR(order.tax)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>خصم</span>
                <span className="font-mono">-{formatSAR(order.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 my-1" />
            <div className="flex justify-between text-base font-bold">
              <span>الإجمالي</span>
              <span className="font-mono">{formatSAR(order.total)} <SARSymbol /></span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Payment Info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>طريقة الدفع</span>
              <span>{paymentLabel(order.paymentMethod)}</span>
            </div>
            {order.paymentMethod === 'CASH' && (
              <>
                <div className="flex justify-between">
                  <span>المبلغ المدفوع</span>
                  <span className="font-mono">{formatSAR(order.paidAmount)}</span>
                </div>
                {Number(order.changeAmount) > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>الباقي</span>
                    <span className="font-mono">{formatSAR(order.changeAmount)}</span>
                  </div>
                )}
              </>
            )}
            {order.paymentMethod === 'SPLIT' && (
              <>
                <div className="flex justify-between">
                  <span>نقدي</span>
                  <span className="font-mono">{formatSAR(order.cashAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>بطاقة</span>
                  <span className="font-mono">{formatSAR(order.cardAmount)}</span>
                </div>
                {Number(order.changeAmount) > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>الباقي</span>
                    <span className="font-mono">{formatSAR(order.changeAmount)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ZATCA QR Code */}
          {qrData && (
            <div className="mt-4 flex flex-col items-center">
              <QRCodeSVG value={qrData} size={120} />
              <p className="text-[10px] text-gray-400 mt-1">فاتورة ضريبية مبسطة</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 text-xs text-gray-400">
            <p>شكراً لزيارتكم</p>
          </div>
        </div>
      </div>
    </div>
  );
}
