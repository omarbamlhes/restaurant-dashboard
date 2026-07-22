'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, TrendingUp, DollarSign, Clock, BarChart3, Download, FileSpreadsheet, Building2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import BranchFilter, { type Branch } from '@/components/dashboard/BranchFilter';
import api from '@/lib/api';
import { cn, formatSAR, formatNumber } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  avgOrder: number;
}

interface ProfitItem {
  id: string;
  nameAr: string;
  category: string;
  unitPrice: number;
  unitCost: number;
  profitPerItem: number;
  margin: number;
  totalSold: number;
  totalRevenue: number;
}

interface PeakHour {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

interface BranchCompare {
  id: string;
  name: string;
  nameAr: string;
  isMain: boolean;
  revenue: number;
  orders: number;
  profit: number;
  avgOrder: number;
}

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  direction: 'rtl' as const,
  fontFamily: 'IBM Plex Sans Arabic',
};

type Tab = 'sales' | 'profit' | 'peak' | 'compare';

export default function ReportsPage() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [profits, setProfits] = useState<ProfitItem[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [comparison, setComparison] = useState<BranchCompare[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [tab, setTab] = useState<Tab>('sales');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setLoading(true);
    const branchParams = branchId !== 'all' ? { branchId } : {};
    const rangeParams = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
    Promise.all([
      api.get('/analytics/sales', { params: { period, ...branchParams, ...rangeParams } }),
      api.get('/analytics/profit', { params: branchParams }),
      api.get('/analytics/peak-hours', { params: branchParams }),
    ])
      .then(([salesRes, profitRes, peakRes]) => {
        setSales(salesRes.data);
        setProfits(profitRes.data);
        setPeakHours(peakRes.data);
      })
      .catch(() => toast.error('فشل تحميل بيانات التقارير'))
      .finally(() => setLoading(false));
  }, [period, branchId, from, to]);

  // Branch comparison is independent of the branch/period filters — load once.
  useEffect(() => {
    api.get('/analytics/branches-comparison')
      .then((res) => setComparison(res.data))
      .catch(() => {/* comparison tab will show empty state */});
  }, []);

  const selectedBranchName =
    branchId === 'all' ? 'كل الفروع' : branches.find((b) => b.id === branchId)?.nameAr ?? '';

  const totalRevenue = sales.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = sales.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProfit = profits.reduce((s, p) => s + (p.profitPerItem * p.totalSold), 0);

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const tabName = tab === 'sales' ? 'المبيعات' : tab === 'profit' ? 'الأرباح' : tab === 'peak' ? 'ساعات-الذروة' : 'مقارنة-الفروع';
      const date = new Date().toISOString().split('T')[0];
      const branchPart = branchId === 'all' ? '' : `-${selectedBranchName}`;
      pdf.save(`تقرير-${tabName}${branchPart}-${date}.pdf`);
      toast.success('تم تصدير التقرير بنجاح');
    } catch {
      toast.error('فشل تصدير التقرير');
    } finally {
      setExporting(false);
    }
  }

  // Export the active tab's table as a CSV that Excel opens with correct Arabic
  // (UTF-8 BOM + quoted cells). One file per report type.
  function exportCSV() {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let tabName = '';

    if (tab === 'sales') {
      tabName = 'المبيعات';
      headers = ['التاريخ', 'الإيرادات', 'الطلبات', 'متوسط الطلب'];
      rows = sales.map((r) => [r.date, r.revenue, r.orders, r.avgOrder]);
    } else if (tab === 'profit') {
      tabName = 'الأرباح';
      headers = ['الصنف', 'الفئة', 'السعر', 'التكلفة', 'الربح/وحدة', 'الهامش %', 'مبيعات', 'إجمالي الإيرادات', 'إجمالي الربح'];
      rows = profits.map((p) => [
        p.nameAr, p.category, p.unitPrice, p.unitCost, p.profitPerItem, p.margin, p.totalSold, p.totalRevenue,
        Math.round(p.profitPerItem * p.totalSold * 100) / 100,
      ]);
    } else if (tab === 'peak') {
      tabName = 'ساعات-الذروة';
      headers = ['الساعة', 'عدد الطلبات', 'الإيرادات', 'متوسط الطلب'];
      rows = peakHours.filter((h) => h.orders > 0).map((h) => [
        h.label, h.orders, h.revenue, h.orders > 0 ? Math.round((h.revenue / h.orders) * 100) / 100 : 0,
      ]);
    } else {
      tabName = 'مقارنة-الفروع';
      headers = ['الفرع', 'الإيرادات', 'الطلبات', 'الأرباح', 'متوسط الطلب'];
      rows = comparison.map((b) => [b.nameAr, b.revenue, b.orders, b.profit, b.avgOrder]);
    }

    if (rows.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const branchPart = branchId === 'all' ? '' : `-${selectedBranchName}`;
    link.href = url;
    link.download = `تقرير-${tabName}${branchPart}-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير ملف Excel');
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التقارير</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تقارير المبيعات والأرباح وساعات الذروة</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <BranchFilter value={branchId} onChange={setBranchId} onBranchesChange={setBranches} />
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">تقرير المبيعات</h1>
        <p className="text-sm font-medium">{selectedBranchName}</p>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div ref={reportRef}>

      {/* PDF Header (hidden on screen, shown in PDF) */}
      {exporting && (
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {tab === 'sales' ? 'تقرير المبيعات' : tab === 'profit' ? 'تقرير الأرباح' : tab === 'peak' ? 'تقرير ساعات الذروة' : 'تقرير مقارنة الفروع'}
          </h1>
          <p className="text-base font-semibold text-gray-700 mt-1">{selectedBranchName}</p>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center print:hidden">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(totalRevenue)} <SARSymbol /></p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center print:hidden">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الطلبات</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(totalOrders)}</p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center print:hidden">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">متوسط الطلب</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(avgOrder)} <SARSymbol /></p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center print:hidden">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الأرباح</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(totalProfit)} <SARSymbol /></p>
        </div>
      </div>

      {/* Tabs & Period Selector */}
      <div className="glass-card p-2 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex gap-1">
          {([
            { key: 'sales' as Tab, label: 'المبيعات', icon: TrendingUp },
            { key: 'profit' as Tab, label: 'الأرباح', icon: DollarSign },
            { key: 'peak' as Tab, label: 'ساعات الذروة', icon: Clock },
            { key: 'compare' as Tab, label: 'مقارنة الفروع', icon: Building2 },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sales' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range */}
            <div className="flex items-center gap-1.5 text-sm">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-hover text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="من تاريخ"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-hover text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="إلى تاريخ"
              />
              {(from || to) && (
                <button
                  onClick={() => { setFrom(''); setTo(''); }}
                  className="text-xs text-gray-500 hover:text-rose-500 px-2 py-1"
                >
                  مسح
                </button>
              )}
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-hover rounded-lg p-1">
              {[
                { key: 'daily', label: 'يومي' },
                { key: 'weekly', label: 'أسبوعي' },
                { key: 'monthly', label: 'شهري' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    period === p.key
                      ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sales Report */}
      {tab === 'sales' && (
        <>
          {/* Chart */}
          <div className="glass-card p-6 animate-fade-in-up print:shadow-none print:border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">اتجاه المبيعات</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={sales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" reversed tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                <YAxis orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('ar-SA')} ${name === 'revenue' ? 'ريال' : 'طلب'}`,
                    name === 'revenue' ? 'الإيرادات' : 'الطلبات',
                  ]}
                />
                <Legend formatter={(value) => <span className="text-sm text-gray-400">{value === 'revenue' ? 'الإيرادات' : 'الطلبات'}</span>} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
                <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Table */}
          <div className="glass-card overflow-hidden animate-fade-in-up print:shadow-none print:border">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل المبيعات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border">
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">التاريخ</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الإيرادات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الطلبات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">{row.date}</td>
                      <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatSAR(row.revenue)} <SARSymbol /></td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatNumber(row.orders)}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(row.avgOrder)} <SARSymbol /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Profit Report */}
      {tab === 'profit' && (
        <div className="glass-card overflow-hidden animate-fade-in-up print:shadow-none print:border">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">تقرير الأرباح حسب الصنف</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تحليل ربحية كل صنف في القائمة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">#</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الصنف</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الفئة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">السعر</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">التكلفة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الربح/وحدة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الهامش</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">مبيعات</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجمالي الإيرادات</th>
                  <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجمالي الربح</th>
                </tr>
              </thead>
              <tbody>
                {profits.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                    <td className="p-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">{item.nameAr}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(item.unitPrice)} <SARSymbol /></td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(item.unitCost)} <SARSymbol /></td>
                    <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatSAR(item.profitPerItem)} <SARSymbol /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden print:hidden">
                          <div
                            className={cn('h-full rounded-full', item.margin >= 50 ? 'bg-emerald-500' : item.margin >= 30 ? 'bg-amber-500' : 'bg-rose-500')}
                            style={{ width: `${Math.min(item.margin, 100)}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-medium', item.margin >= 50 ? 'text-emerald-600' : item.margin >= 30 ? 'text-amber-600' : 'text-rose-600')}>
                          {item.margin}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatNumber(item.totalSold)}</td>
                    <td className="p-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatSAR(item.totalRevenue)} <SARSymbol /></td>
                    <td className="p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatSAR(item.profitPerItem * item.totalSold)} <SARSymbol />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Peak Hours Report */}
      {tab === 'peak' && (
        <>
          {/* Chart */}
          <div className="glass-card p-6 animate-fade-in-up print:shadow-none print:border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">ساعات الذروة</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={peakHours.filter((h) => h.orders > 0)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="label" reversed tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#334155' }} />
                <YAxis orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} yAxisId="left" />
                <YAxis orientation="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} yAxisId="right" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    name === 'orders' ? `${value} طلب` : `${value.toLocaleString('ar-SA')} ريال`,
                    name === 'orders' ? 'الطلبات' : 'الإيرادات',
                  ]}
                />
                <Legend formatter={(value) => <span className="text-sm text-gray-400">{value === 'orders' ? 'الطلبات' : 'الإيرادات'}</span>} />
                <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} yAxisId="left" />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} yAxisId="right" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours Table */}
          <div className="glass-card overflow-hidden animate-fade-in-up print:shadow-none print:border">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل ساعات الذروة</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border">
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الساعة</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">عدد الطلبات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الإيرادات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {peakHours.filter((h) => h.orders > 0).map((hour) => (
                    <tr key={hour.hour} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">{hour.label}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatNumber(hour.orders)}</td>
                      <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatSAR(hour.revenue)} <SARSymbol /></td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                        {hour.orders > 0 ? <>{formatSAR(hour.revenue / hour.orders)} <SARSymbol /></> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Branch Comparison Report */}
      {tab === 'compare' && (
        <>
          {/* Chart */}
          <div className="glass-card p-6 animate-fade-in-up print:shadow-none print:border">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">مقارنة الفروع</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">أداء كل فرع خلال آخر 30 يوماً</p>
            {comparison.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">لا توجد بيانات للفروع</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={comparison} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="nameAr" reversed tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                  <YAxis orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString('ar-SA')} ${name === 'orders' ? 'طلب' : 'ريال'}`,
                      name === 'revenue' ? 'الإيرادات' : name === 'profit' ? 'الأرباح' : 'الطلبات',
                    ]}
                  />
                  <Legend formatter={(value) => <span className="text-sm text-gray-400">{value === 'revenue' ? 'الإيرادات' : value === 'profit' ? 'الأرباح' : 'الطلبات'}</span>} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Comparison Table */}
          <div className="glass-card overflow-hidden animate-fade-in-up print:shadow-none print:border">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل الفروع</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border">
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">#</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الفرع</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الإيرادات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الطلبات</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الأرباح</th>
                    <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((b, i) => (
                    <tr key={b.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                      <td className="p-4 text-sm text-gray-400">{i === 0 ? '🏆' : i + 1}</td>
                      <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {b.nameAr}
                        {b.isMain && <span className="text-xs px-2 py-0.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mr-2">رئيسي</span>}
                      </td>
                      <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{formatSAR(b.revenue)} <SARSymbol /></td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatNumber(b.orders)}</td>
                      <td className="p-4 text-sm text-purple-600 dark:text-purple-400 font-medium">{formatSAR(b.profit)} <SARSymbol /></td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(b.avgOrder)} <SARSymbol /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      </div>{/* end reportRef */}
    </div>
  );
}
