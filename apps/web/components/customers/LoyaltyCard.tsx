'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crown, Gift, Plus, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn, formatSAR, formatNumber } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';
import {
  tierStyle,
  TXN_TYPE_LABELS,
  type LoyaltySummary,
} from '@/lib/loyalty';

interface LoyaltyCardProps {
  customerId: string;
  /** Called after points change so the parent can refresh customer totals. */
  onChanged?: () => void;
}

export default function LoyaltyCard({ customerId, onChanged }: LoyaltyCardProps) {
  const [data, setData] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<LoyaltySummary>(`/customers/${customerId}/loyalty`);
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    setLoading(true);
    setRedeemOpen(false);
    setRedeemInput('');
    load();
  }, [load]);

  async function redeem() {
    const points = parseInt(redeemInput, 10);
    if (!data) return;
    if (!points || points < data.minRedeem) {
      toast.error(`الحد الأدنى للاستبدال ${formatNumber(data.minRedeem)} نقطة`);
      return;
    }
    if (points > data.points) {
      toast.error('رصيد النقاط غير كافٍ');
      return;
    }
    setBusy(true);
    try {
      const { data: res } = await api.post(`/customers/${customerId}/loyalty/redeem`, { points });
      toast.success(`تم استبدال ${formatNumber(points)} نقطة مقابل ${formatSAR(res.value)} ر.س`);
      setRedeemOpen(false);
      setRedeemInput('');
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّر الاستبدال');
    } finally {
      setBusy(false);
    }
  }

  async function grant(points: number) {
    setBusy(true);
    try {
      await api.post(`/customers/${customerId}/loyalty/adjust`, { points, note: 'منح يدوي' });
      toast.success(`تمت إضافة ${formatNumber(points)} نقطة`);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذّر التعديل');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-50 dark:bg-dark-hover p-4 mb-5 flex items-center justify-center h-28">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const style = tierStyle(data.tier.key);
  // Progress within the current tier band toward the next tier.
  const progress = data.nextTier
    ? Math.min(
        100,
        Math.round(
          ((data.lifetimePoints - data.tier.minPoints) /
            (data.nextTier.minPoints - data.tier.minPoints)) *
            100,
        ),
      )
    : 100;

  return (
    <div className="mb-5">
      {/* Hero tier card */}
      <div className={cn('relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-l shadow-sm', style.gradient)}>
        <div className="absolute -left-4 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <Crown className="w-3.5 h-3.5" />
              عضو {style.nameAr}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{formatNumber(data.points)}</span>
              <span className="text-sm text-white/80">نقطة</span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              تعادل {formatSAR(data.redeemableValue)} <SARSymbol /> رصيد
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-white/70" />
        </div>

        {/* Progress to next tier */}
        <div className="relative mt-3">
          {data.nextTier ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-white/85 mb-1">
                <span>التقدّم إلى {data.nextTier.nameAr}</span>
                <span>باقٍ {formatNumber(data.pointsToNextTier)} نقطة</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white/90" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <p className="text-[11px] text-white/85">🏆 أعلى مستوى — شكراً لولائك!</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setRedeemOpen((v) => !v)}
          disabled={busy || data.points < data.minRedeem}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Gift className="w-4 h-4" />
          استبدال نقاط
        </button>
        <button
          onClick={() => grant(100)}
          disabled={busy}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border disabled:opacity-40 transition-colors"
          title="منح 100 نقطة"
        >
          <Plus className="w-4 h-4" />
          100
        </button>
      </div>

      {/* Redeem input */}
      {redeemOpen && (
        <div className="mt-2 flex items-center gap-2 animate-fade-in">
          <input
            type="number"
            value={redeemInput}
            onChange={(e) => setRedeemInput(e.target.value)}
            placeholder={`عدد النقاط (حد أدنى ${data.minRedeem})`}
            className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            dir="ltr"
            autoFocus
          />
          <button
            onClick={redeem}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد'}
          </button>
        </div>
      )}

      {/* History */}
      {data.history.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">سجل النقاط</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.history.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-dark-hover">
                <div className="min-w-0">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{TXN_TYPE_LABELS[t.type]}</span>
                  {t.note && <span className="text-gray-400 mr-1.5 truncate">· {t.note}</span>}
                </div>
                <span className={cn('font-bold tabular-nums shrink-0', t.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {t.points >= 0 ? '+' : ''}{formatNumber(t.points)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
