'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import toast from 'react-hot-toast';
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  direction: 'rtl' as const,
  fontFamily: 'IBM Plex Sans Arabic',
};

export default function AnalyticsPage() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [profits, setProfits] = useState<ProfitItem[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

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
      .catch(() => toast.error('فشل تحميل بيانات التحليلات'))
      .finally(() => setLoading(false));
  }, [period]);

  // Aggregate profit by category for pie chart
  const categoryProfits = profits.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { name: item.category, value: 0 };
    acc[item.category].value += item.totalRevenue;
    return acc;
  }, {});
  const categoryData = Object.values(categoryProfits).sort((a, b) => b.value - a.value);

  // Total stats
  const totalRevenue = sales.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = sales.reduce((s, d) => s + d.orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const peakHour = peakHours.reduce((max, h) => h.orders > max.orders ? h : max, peakHours[0] || { label: '—', orders: 0 });

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التحليلات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تحليل أداء المبيعات والأرباح</p>
        </div>
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
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                period === p.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 stagger-children">
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(totalRevenue)} <SARSymbol /></p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">إجمالي الطلبات</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(totalOrders)}</p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">متوسط الطلب</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSAR(avgOrder)} <SARSymbol /></p>
        </div>
        <div className="stat-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">ساعة الذروة</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{peakHour?.label || '—'}</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="glass-card p-6 animate-fade-in-up">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">اتجاه المبيعات</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={sales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#salesGrad)" />
            <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row: Peak Hours + Category Revenue */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="glass-card p-6 animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">ساعات الذروة</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={peakHours.filter(h => h.orders > 0)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="label" reversed tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#334155' }} />
              <YAxis orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'orders' ? `${value} طلب` : `${value.toLocaleString('ar-SA')} ريال`,
                  name === 'orders' ? 'الطلبات' : 'الإيرادات',
                ]}
              />
              <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Revenue Pie */}
        <div className="glass-card p-6 animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">الإيرادات حسب الفئة</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value.toLocaleString('ar-SA')} ريال`, 'الإيرادات']}
              />
              <Legend
                formatter={(value) => <span className="text-sm text-gray-400">{value}</span>}
                layout="vertical"
                align="left"
                verticalAlign="middle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Margins Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">هوامش الربح</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تحليل ربحية كل صنف</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-border">
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الصنف</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الفئة</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">السعر</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">التكلفة</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الربح/وحدة</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">الهامش</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">مبيعات</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 p-4">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {profits.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
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
                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
