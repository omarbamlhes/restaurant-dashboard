'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Info, RefreshCw } from 'lucide-react';
import BranchFilter from '@/components/dashboard/BranchFilter';
import Reveal from '@/components/shared/Reveal';
import EmptyState from '@/components/shared/EmptyState';
import Skeleton from '@/components/shared/Skeleton';
import { useApi } from '@/hooks/useApi';

type Kind = 'positive' | 'warning' | 'info' | 'tip';
interface Insight { kind: Kind; title: string; message: string; }
interface InsightsData { generatedAt: string; insights: Insight[]; }

const KIND_STYLE: Record<Kind, { icon: typeof Sparkles; ring: string; iconBg: string; iconColor: string }> = {
  positive: { icon: TrendingUp, ring: 'border-emerald-200 dark:border-emerald-900/50', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  warning:  { icon: AlertTriangle, ring: 'border-amber-200 dark:border-amber-900/50', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  info:     { icon: Info, ring: 'border-blue-200 dark:border-blue-900/50', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  tip:      { icon: Lightbulb, ring: 'border-purple-200 dark:border-purple-900/50', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
};

export default function InsightsPage() {
  const [branchId, setBranchId] = useState('all');
  const branchQ = branchId !== 'all' ? `?branchId=${branchId}` : '';
  const { data, loading, isValidating, mutate } = useApi<InsightsData>(`/analytics/insights${branchQ}`);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-900 p-6 text-white">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" aria-hidden />
        <div className="absolute bottom-0 right-10 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">رؤى ذكية</h1>
              <p className="text-white/80 text-sm mt-0.5">تحليل تلقائي لأداء مطعمك مع توصيات عملية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BranchFilter value={branchId} onChange={setBranchId} className="[&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/20" />
            <button
              onClick={() => mutate()}
              className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
              aria-label="تحديث الرؤى"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 flex gap-4">
              <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.insights.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState icon={Sparkles} title="لا توجد رؤى بعد" description="سجّل المزيد من الطلبات وستظهر الرؤى تلقائياً." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.insights.map((ins, i) => {
              const s = KIND_STYLE[ins.kind];
              const Icon = s.icon;
              return (
                <Reveal key={i} delay={i * 70}>
                  <div className={`glass-card p-5 flex gap-4 h-full border ${s.ring}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                      <Icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{ins.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ins.message}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400">
            حُدّثت الرؤى: {new Date(data.generatedAt).toLocaleString('ar-SA')}
          </p>
        </>
      )}
    </div>
  );
}
