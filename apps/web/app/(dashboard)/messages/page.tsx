'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  Package,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  RefreshCw,
  Filter,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type MessageStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

interface MessageLog {
  id: string;
  channel: string;
  event: string;
  toPhone: string;
  body: string;
  status: MessageStatus;
  provider: string;
  providerId: string | null;
  error: string | null;
  orderId: string | null;
  reservationId: string | null;
  createdAt: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ORDER_READY: {
    label: 'الطلب جاهز',
    icon: Package,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  RESERVATION_CONFIRMED: {
    label: 'تأكيد الحجز',
    icon: CalendarClock,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

function eventConfig(event: string) {
  return (
    EVENT_CONFIG[event] || {
      label: event,
      icon: MessageCircle,
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
    }
  );
}

const STATUS_CONFIG: Record<
  MessageStatus,
  { label: string; icon: any; className: string; dot: string }
> = {
  SENT: {
    label: 'مُرسلة',
    icon: CheckCircle2,
    className: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    label: 'قيد الإرسال',
    icon: Clock,
    className: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    dot: 'bg-amber-500',
  },
  FAILED: {
    label: 'فشلت',
    icon: XCircle,
    className: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    dot: 'bg-red-500',
  },
  SKIPPED: {
    label: 'تم التخطي',
    icon: MinusCircle,
    className: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    dot: 'bg-gray-400',
  },
};

const STATUS_FILTERS: { value: '' | MessageStatus; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'SENT', label: 'مُرسلة' },
  { value: 'FAILED', label: 'فشلت' },
  { value: 'PENDING', label: 'قيد الإرسال' },
  { value: 'SKIPPED', label: 'تم التخطي' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | MessageStatus>('');

  async function fetchMessages(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/messages', { params: { limit: 100 } });
      setMessages(data);
    } catch {
      toast.error('فشل تحميل سجل الرسائل');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, []);

  const counts = useMemo(() => {
    return messages.reduce(
      (acc, m) => {
        acc.total += 1;
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      },
      { total: 0, SENT: 0, FAILED: 0, PENDING: 0, SKIPPED: 0 } as Record<string, number>,
    );
  }, [messages]);

  const visible = useMemo(
    () => (statusFilter ? messages.filter((m) => m.status === statusFilter) : messages),
    [messages, statusFilter],
  );

  if (loading) return <TableSkeleton columns={3} rows={6} />;

  const summary: { key: MessageStatus | 'total'; label: string; value: number; className: string }[] = [
    { key: 'total', label: 'الإجمالي', value: counts.total, className: 'text-gray-900 dark:text-white' },
    { key: 'SENT', label: 'مُرسلة', value: counts.SENT, className: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'FAILED', label: 'فشلت', value: counts.FAILED, className: 'text-red-600 dark:text-red-400' },
    { key: 'SKIPPED', label: 'تم التخطي', value: counts.SKIPPED, className: 'text-gray-500 dark:text-gray-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سجل الرسائل</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            رسائل واتساب المرسلة للعملاء تلقائياً
          </p>
        </div>
        <button
          onClick={() => fetchMessages(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          تحديث
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div key={s.key} className="glass-card p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1 tabular-nums', s.className)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" aria-hidden />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={MessageCircle}
            title={statusFilter ? 'لا توجد رسائل بهذه الحالة' : 'لا توجد رسائل بعد'}
            description={
              statusFilter
                ? 'جرّب تغيير عامل التصفية لعرض رسائل أخرى'
                : 'تُرسَل الرسائل تلقائياً عند جاهزية الطلب أو تأكيد الحجز، وستظهر هنا'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const ev = eventConfig(m.event);
            const EvIcon = ev.icon;
            const st = STATUS_CONFIG[m.status] || STATUS_CONFIG.SKIPPED;
            const StIcon = st.icon;
            return (
              <div key={m.id} className="glass-card p-4 animate-fade-in-up transition-all duration-300 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', ev.bg)}>
                    <EvIcon className={cn('w-5 h-5', ev.color)} aria-hidden />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ev.label}</h4>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
                              st.className,
                            )}
                          >
                            <StIcon className="w-3 h-3" aria-hidden />
                            {st.label}
                          </span>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Phone className="w-3 h-3" aria-hidden />
                          <span dir="ltr" className="tabular-nums">{m.toPhone}</span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(m.createdAt)}</span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line bg-gray-50 dark:bg-dark-hover/50 rounded-lg p-3 border border-gray-100 dark:border-dark-border">
                      {m.body}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {m.provider}
                      </span>
                      {m.error && (
                        <span className="text-[11px] text-red-600 dark:text-red-400 truncate max-w-full">
                          {m.error}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
