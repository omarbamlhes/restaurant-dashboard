'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { DollarSign, ShoppingBag, TrendingUp, Receipt, CalendarDays, CalendarRange, UtensilsCrossed, ShoppingCart, Truck, Moon } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';

// Defer recharts (~100 kB) until after the dashboard shell + stat cards paint.
// The chart sits below the fold, so its bundle shouldn't block first render.
const SalesChart = dynamic(() => import('@/components/charts/SalesChart'), {
  ssr: false,
  loading: () => (
    <div className="glass-card p-6 animate-fade-in-up">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">المبيعات — آخر ٣٠ يوم</h3>
      <div className="h-80 rounded-xl bg-gray-100 dark:bg-dark-hover animate-pulse" />
    </div>
  ),
});
import RecentOrders from '@/components/dashboard/RecentOrders';
import TopItems from '@/components/dashboard/TopItems';
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import BranchFilter from '@/components/dashboard/BranchFilter';
import RamadanBanner from '@/components/dashboard/RamadanBanner';
import { useApi } from '@/hooks/useApi';
import { isRamadan } from '@/lib/hijri';
import { cn, formatSAR, formatNumber } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface OverviewData {
  todayRevenue: number;
  todayOrders: number;
  todayProfit: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  profitChange: number;
  avgChange: number;
  thisWeekRevenue: number;
  thisWeekOrders: number;
  weekRevenueChange: number;
  weekOrdersChange: number;
  thisMonthRevenue: number;
  thisMonthOrders: number;
  monthRevenueChange: number;
  monthOrdersChange: number;
  ordersByType: { DINE_IN: number; TAKEAWAY: number; DELIVERY: number };
  topItems: any[];
  recentOrders: any[];
  salesChart: any[];
}

export default function DashboardPage() {
  const [branchId, setBranchId] = useState('all');
  // Ramadan visuals turn on automatically during Ramadan; this lets staff
  // preview the theme year-round from the dashboard.
  const [previewRamadan, setPreviewRamadan] = useState(false);
  const ramadanActive = previewRamadan || isRamadan();

  // SWR caches per branch, dedupes, and revalidates in the background — so
  // switching branches back and forth is instant instead of refetching.
  const { data, loading } = useApi<OverviewData>(
    `/analytics/overview${branchId !== 'all' ? `?branchId=${branchId}` : ''}`,
  );

  // Only show the full skeleton on first load; on branch switches keep the
  // current view (and the filter) visible while fresh data loads.
  if (loading && !data) return <DashboardSkeleton />;
  if (!data) return null;

  const totalTypeOrders = data.ordersByType.DINE_IN + data.ordersByType.TAKEAWAY + data.ordersByType.DELIVERY;
  const typePercent = (val: number) => totalTypeOrders > 0 ? Math.round((val / totalTypeOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">ملخص أداء مطعمك اليوم</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <BranchFilter value={branchId} onChange={setBranchId} />
          {!isRamadan() && (
            <button
              type="button"
              onClick={() => setPreviewRamadan((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                previewRamadan
                  ? 'border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700 dark:border-dark-border dark:text-gray-400',
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              {previewRamadan ? 'إيقاف معاينة رمضان' : 'معاينة وضع رمضان'}
            </button>
          )}
        </div>
      </div>

      {/* Hijri date + prayer times — flips to a festive iftar/suhoor countdown in Ramadan */}
      <RamadanBanner forcePreview={ramadanActive} />

      {/* Today Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatsCard
          title="إيرادات اليوم"
          value={<>{formatSAR(data.todayRevenue)} <SARSymbol /></>}
          change={data.revenueChange}
          icon={DollarSign}
          color="emerald"
        />
        <StatsCard
          title="طلبات اليوم"
          value={String(data.todayOrders)}
          change={data.ordersChange}
          icon={ShoppingBag}
          color="blue"
        />
        <StatsCard
          title="صافي الربح"
          value={<>{formatSAR(data.todayProfit)} <SARSymbol /></>}
          change={data.profitChange}
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          title="متوسط الطلب"
          value={<>{formatSAR(data.avgOrderValue)} <SARSymbol /></>}
          change={data.avgChange}
          icon={Receipt}
          color="amber"
        />
      </div>

      {/* Week & Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {/* Weekly */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">ملخص الأسبوع</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">مقارنة بالأسبوع الماضي</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الإيرادات</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatSAR(data.thisWeekRevenue)} <SARSymbol /></p>
              <ChangeIndicator value={data.weekRevenueChange} />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الطلبات</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatNumber(data.thisWeekOrders)}</p>
              <ChangeIndicator value={data.weekOrdersChange} />
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CalendarRange className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">ملخص الشهر</h3>
              <p className="text-xs text-gray-400">مقارنة بالشهر الماضي</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الإيرادات</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatSAR(data.thisMonthRevenue)} <SARSymbol /></p>
              <ChangeIndicator value={data.monthRevenueChange} />
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الطلبات</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatNumber(data.thisMonthOrders)}</p>
              <ChangeIndicator value={data.monthOrdersChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart + Order Types */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={data.salesChart} />
        </div>

        {/* Order Types Breakdown */}
        <div className="glass-card p-6 animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">توزيع الطلبات</h3>
          <div className="space-y-5">
            <OrderTypeBar
              icon={UtensilsCrossed}
              label="محلي"
              count={data.ordersByType.DINE_IN}
              percent={typePercent(data.ordersByType.DINE_IN)}
              color="emerald"
            />
            <OrderTypeBar
              icon={ShoppingCart}
              label="سفري"
              count={data.ordersByType.TAKEAWAY}
              percent={typePercent(data.ordersByType.TAKEAWAY)}
              color="blue"
            />
            <OrderTypeBar
              icon={Truck}
              label="توصيل"
              count={data.ordersByType.DELIVERY}
              percent={typePercent(data.ordersByType.DELIVERY)}
              color="amber"
            />
          </div>
          {totalTypeOrders === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">لا توجد طلبات اليوم</p>
          )}
          {totalTypeOrders > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border/50 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalTypeOrders)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي طلبات اليوم</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Top Items + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopItems items={data.topItems} />
        <RecentOrders orders={data.recentOrders} />
      </div>
    </div>
  );
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400">— بدون تغيير</span>;
  return (
    <span className={cn(
      'text-xs font-semibold',
      value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
    )}>
      {value > 0 ? '\u25B2' : '\u25BC'} {Math.abs(value).toFixed(1)}%
      <span className="font-normal text-gray-400 mr-1">
        {value > 0 ? 'ارتفاع' : 'انخفاض'}
      </span>
    </span>
  );
}

const typeColors = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
};

function OrderTypeBar({ icon: Icon, label, count, percent, color }: {
  icon: any; label: string; count: number; percent: number; color: 'emerald' | 'blue' | 'amber';
}) {
  const c = typeColors[color];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
            <Icon className={cn('w-4 h-4', c.icon)} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        <div className="text-left">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(count)}</span>
          <span className="text-xs text-gray-400 mr-1">({percent}%)</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 dark:bg-dark-card rounded-full h-2">
        <div
          className={cn('h-full rounded-full transition-all duration-700', c.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
