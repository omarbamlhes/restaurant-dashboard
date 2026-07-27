'use client';

import { useState } from 'react';
import { Printer, ChevronRight, ChevronLeft, CalendarClock, ReceiptText } from 'lucide-react';
import BranchFilter from '@/components/dashboard/BranchFilter';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import SARSymbol from '@/components/shared/SARSymbol';
import { useApi } from '@/hooks/useApi';
import { formatSAR } from '@/lib/utils';

interface ShiftReport {
  period: { from: string; to: string };
  totalOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscount: number;
  avgOrderValue: number;
  payment: {
    cash: { count: number; total: number };
    card: { count: number; total: number };
    split: { count: number };
    totalChange: number;
  };
  orderTypes: {
    dineIn: { count: number; total: number };
    takeaway: { count: number; total: number };
    delivery: { count: number; total: number };
  };
  topItems: { nameAr: string; quantity: number; revenue: number }[];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ShiftReportPage() {
  const [date, setDate] = useState(todayStr());
  const [branchId, setBranchId] = useState('all');

  const branchQ = branchId !== 'all' ? `&branchId=${branchId}` : '';
  const { data: report, loading } = useApi<ShiftReport>(
    `/orders/shift-report?from=${date}&to=${date}${branchQ}`,
  );

  function shiftDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-6">
      {/* Header + controls (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقرير نهاية اليوم</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">ملخّص المبيعات والمدفوعات (Z-Report)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BranchFilter value={branchId} onChange={setBranchId} />
          <div className="flex items-center gap-1">
            <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover" aria-label="اليوم التالي">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="input-field text-sm py-1.5"
              dir="ltr"
            />
            <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover" aria-label="اليوم السابق">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <button
            onClick={() => window.print()}
            disabled={!report || report.totalOrders === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {loading && !report ? (
        <DashboardSkeleton />
      ) : !report || (report.totalOrders === 0 && report.cancelledOrders === 0) ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={CalendarClock}
            title="لا توجد مبيعات في هذا اليوم"
            description={formatDateLabel(date)}
          />
        </div>
      ) : (
        <div id="shift-report-content" className="space-y-6">
          {/* Print header */}
          <div className="hidden print:flex items-center gap-3 mb-2">
            <ReceiptText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">تقرير نهاية اليوم (Z-Report)</h2>
              <p className="text-sm text-gray-600">{formatDateLabel(date)}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">الإيرادات</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatSAR(report.totalRevenue)} <SARSymbol /></p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
              <p className="text-xs text-blue-600 dark:text-blue-400">عدد الطلبات</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{report.totalOrders}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
              <p className="text-xs text-purple-600 dark:text-purple-400">متوسط الفاتورة</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">{formatSAR(report.avgOrderValue)} <SARSymbol /></p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <p className="text-xs text-rose-600 dark:text-rose-400">ملغية</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">{report.cancelledOrders}</p>
            </div>
          </div>

          {/* Financial summary */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الملخص المالي</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">المجموع الفرعي</span><span className="font-medium">{formatSAR(report.totalSubtotal)} <SARSymbol /></span></div>
              <div className="flex justify-between"><span className="text-gray-500">الضريبة (15%)</span><span className="font-medium">{formatSAR(report.totalTax)} <SARSymbol /></span></div>
              {report.totalDiscount > 0 && <div className="flex justify-between text-rose-600"><span>الخصومات</span><span className="font-medium">-{formatSAR(report.totalDiscount)} <SARSymbol /></span></div>}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-dark-border font-bold"><span>الإجمالي</span><span>{formatSAR(report.totalRevenue)} <SARSymbol /></span></div>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">حسب طريقة الدفع</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">نقدي ({report.payment.cash.count})</span><span className="font-medium">{formatSAR(report.payment.cash.total)} <SARSymbol /></span></div>
                <div className="flex justify-between"><span className="text-gray-500">بطاقة ({report.payment.card.count})</span><span className="font-medium">{formatSAR(report.payment.card.total)} <SARSymbol /></span></div>
                {report.payment.split.count > 0 && <div className="flex justify-between"><span className="text-gray-500">مقسّم ({report.payment.split.count})</span><span className="font-medium">-</span></div>}
                {report.payment.totalChange > 0 && <div className="flex justify-between text-amber-600"><span>الباقي المعاد</span><span className="font-medium">{formatSAR(report.payment.totalChange)} <SARSymbol /></span></div>}
              </div>
            </div>
            <div className="glass-card p-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">حسب نوع الطلب</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">محلي ({report.orderTypes.dineIn.count})</span><span className="font-medium">{formatSAR(report.orderTypes.dineIn.total)} <SARSymbol /></span></div>
                <div className="flex justify-between"><span className="text-gray-500">سفري ({report.orderTypes.takeaway.count})</span><span className="font-medium">{formatSAR(report.orderTypes.takeaway.total)} <SARSymbol /></span></div>
                <div className="flex justify-between"><span className="text-gray-500">توصيل ({report.orderTypes.delivery.count})</span><span className="font-medium">{formatSAR(report.orderTypes.delivery.total)} <SARSymbol /></span></div>
              </div>
            </div>
          </div>

          {/* Top items */}
          {report.topItems.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الأصناف الأكثر مبيعاً</h4>
              <div className="space-y-2">
                {report.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-gray-700 dark:text-gray-300">{item.nameAr}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-500">
                      <span>{item.quantity} قطعة</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatSAR(item.revenue)} <SARSymbol /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print footer */}
          <p className="hidden print:block text-center text-xs text-gray-500 pt-4">
            طُبع في {new Date().toLocaleString('ar-SA')} · مدعوم بواسطة رستق
          </p>
        </div>
      )}
    </div>
  );
}
