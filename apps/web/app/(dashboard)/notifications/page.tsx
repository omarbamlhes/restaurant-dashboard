'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Package, TrendingUp, AlertTriangle, Bot, CreditCard, Settings, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

const NOTIFICATION_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'LOW_STOCK', label: 'مخزون', icon: Package, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'HIGH_WASTE', label: 'هدر', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'SALES_ALERT', label: 'مبيعات', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'DAILY_REPORT', label: 'تقارير', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'AI_RECOMMENDATION', label: 'ذكاء اصطناعي', icon: Bot, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { value: 'PAYMENT_DUE', label: 'دفع', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  { value: 'SYSTEM', label: 'نظام', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
];

function getTypeConfig(type: string) {
  return NOTIFICATION_TYPES.find((t) => t.value === type) || NOTIFICATION_TYPES[NOTIFICATION_TYPES.length - 1];
}

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  async function fetchNotifications() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      const { data } = await api.get('/notifications', { params });
      setNotifications(data);
    } catch {
      toast.error('فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  async function markAsRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error('فشل تحديث الإشعار');
    }
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('تم تحديد الكل كمقروء');
    } catch {
      toast.error('فشل تحديث الإشعارات');
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) return <TableSkeleton columns={3} rows={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الإشعارات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {NOTIFICATION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterType === t.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            icon={Bell}
            title="لا توجد إشعارات"
            description="ستظهر الإشعارات هنا عند وجود تنبيهات جديدة"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const typeConfig = getTypeConfig(notification.type);
            const IconComponent = typeConfig.icon || Bell;

            return (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
                className={cn(
                  'glass-card p-4 animate-fade-in-up transition-all duration-300 cursor-pointer hover:shadow-md',
                  !notification.isRead && 'border-r-4 border-primary-500 bg-primary-50/30 dark:bg-primary-900/10',
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', typeConfig.bg)}>
                    <IconComponent className={cn('w-5 h-5', typeConfig.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={cn(
                          'text-sm',
                          notification.isRead
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'font-bold text-gray-900 dark:text-white',
                        )}>
                          {notification.titleAr}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {notification.messageAr}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary-500" />
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                      </div>
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
