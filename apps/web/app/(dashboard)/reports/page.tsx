'use client';

import { useEffect, useState } from 'react';
import { FileText, Printer, TrendingUp, DollarSign, Clock, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { cn, formatSAR, formatNumber } from '@/lib/utils';

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

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  direction: 'rtl' as const,
  fontFamily: 'IBM Plex Sans Arabic',
};

type Tab = 'sales' | 'profit' | 'peak';

export default function ReportsPage() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [profits, setProfits] = useState<ProfitItem[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [tab, setTab] = useState<Tab>('sales');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/sales', { params: { period } }),
      api.get('/analytics/profit'),
      api.get('/analytics/peak-hours'),
    ])
      .then(([salesRes, profitRes, peakRes]) => {
        setSales(salesRes.data);
        setProfits(profitRes.data);
        setPeakHours(peakRes.data);
      })
      .catch(() => toast.error('فشل تحميل بيانات التقارير'))
      .finally(() => setLoading(false));
  }, [period]);

  const totalRevenue = sales.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = sales.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProfit = profits.reduce((s, p) => s + (p.profitPerItem * p.totalSold), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التقارير</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تقارير المبيعات والأرباح وساعات الذروة</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">تقرير المبيعات</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center print:hidden">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(totalRevenue)}</p>
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
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(avgOrder)}</p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center print:hidden">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الأرباح</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(totalProfit)}</p>
        </div>
      </div>

      {/* Tabs & Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex gap-2">
          {([
            { key: 'sales' as Tab, label: 'المبيعات', icon: TrendingUp },
            { key: 'profit' as Tab, label: 'الأرباح', icon: DollarSign },
            { key: 'peak' as Tab, label: 'ساعات الذروة', icon: Clock },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sales' && (
          <div className="flex gap-2">
            {[
              { key: 'daily', label: 'يومي' },
              { key: 'weekly', label: 'أسبوعي' },
              { key: 'monthly', label: 'شهري' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  period === p.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400',
                )}
              >
                {p.label}
              </button>
            ))}
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
                    `${value.toLocaleString('ar-SA')} ${name === 'revenue' ? 'ر.س' : 'طلب'}`,
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
                      <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatSAR(row.revenue)}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatNumber(row.orders)}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(row.avgOrder)}</td>
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
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(item.unitPrice)}</td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{formatSAR(item.unitCost)}</td>
                    <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatSAR(item.profitPerItem)}</td>
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
                    <td className="p-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatSAR(item.totalRevenue)}</td>
                    <td className="p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatSAR(item.profitPerItem * item.totalSold)}
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
                    name === 'orders' ? `${value} طلب` : `${value.toLocaleString('ar-SA')} ر.س`,
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
                      <td className="p-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatSAR(hour.revenue)}</td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                        {hour.orders > 0 ? formatSAR(hour.revenue / hour.orders) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
