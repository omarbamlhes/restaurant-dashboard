'use client';

import { Moon, TrendingDown, Info } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { cn, formatNumber } from '@/lib/utils';

interface PrayerGap {
  prayer: string;
  label: string;
  ordersInWindow: number;
  revenueInWindow: number;
  windowRatePerHour: number;
  baselineRatePerHour: number;
  dipPercent: number;
  estLostOrders: number;
}
interface PrayerGapData {
  days: number;
  prayers: PrayerGap[];
  summary: {
    avgDipPercent: number;
    totalEstLostOrders: number;
    biggestDipPrayer: string | null;
    biggestDipPercent: number;
  };
}

export default function PrayerGapCard({ branchId }: { branchId?: string }) {
  const q = branchId && branchId !== 'all' ? `?branchId=${branchId}` : '';
  const { data, loading } = useApi<PrayerGapData>(`/analytics/prayer-gap${q}`);

  if (loading && !data) {
    return <div className="glass-card p-6 h-64 animate-pulse bg-gray-50 dark:bg-dark-hover" />;
  }
  if (!data) return null;

  const maxDip = Math.max(10, ...data.prayers.map((p) => p.dipPercent));
  const hasData = data.prayers.some((p) => p.ordersInWindow > 0 || p.baselineRatePerHour > 0);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Moon className="w-5 h-5 text-emerald-500" />
          فجوة الصلاة
        </h3>
        <span className="text-xs text-gray-400">آخر {formatNumber(data.days)} يوم نشط</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        انخفاض الطلبات خلال وقت كل صلاة مقارنةً بالدقائق المحيطة
      </p>

      {!hasData ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Info className="w-4 h-4" />
          لا توجد بيانات كافية بعد
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3">
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
                أكبر انخفاض
              </div>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">
                {data.summary.biggestDipPrayer
                  ? `${data.summary.biggestDipPrayer} · ${data.summary.biggestDipPercent}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
              <div className="text-xs text-amber-600 dark:text-amber-400">طلبات مقدّرة فائتة</div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-1">
                ≈ {formatNumber(data.summary.totalEstLostOrders)}
              </p>
            </div>
          </div>

          {/* Per-prayer dip bars */}
          <div className="space-y-2.5">
            {data.prayers.map((p) => {
              const noData = p.ordersInWindow === 0 && p.baselineRatePerHour === 0;
              return (
                <div key={p.prayer} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-gray-600 dark:text-gray-300 shrink-0">{p.label}</span>
                  <div className="flex-1 h-6 rounded-lg bg-gray-100 dark:bg-dark-hover overflow-hidden relative">
                    {!noData && p.dipPercent > 0 && (
                      <div
                        className="h-full rounded-lg bg-gradient-to-l from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600 transition-all"
                        style={{ width: `${(p.dipPercent / maxDip) * 100}%` }}
                      />
                    )}
                    <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                      {noData
                        ? 'لا بيانات'
                        : p.dipPercent > 0
                          ? `انخفاض ${p.dipPercent}%`
                          : 'لا يوجد انخفاض'}
                    </span>
                  </div>
                  <span className="w-16 text-left text-xs text-gray-400 shrink-0">
                    {p.ordersInWindow} طلب
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5">
            <Info className="w-3 h-3 shrink-0" />
            الأوقات محسوبة بطريقة أم القرى حسب موقع الفرع
          </p>
        </>
      )}
    </div>
  );
}
