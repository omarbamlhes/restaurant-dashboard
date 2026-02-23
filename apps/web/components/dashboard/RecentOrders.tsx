'use client';

import { cn, formatSAR } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  type: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'جديد', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  PREPARING: { label: 'تحضير', class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  READY: { label: 'جاهز', class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  COMPLETED: { label: 'مكتمل', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { label: 'ملغي', class: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
};

const typeMap: Record<string, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
};

export default function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">آخر الطلبات</h3>
      <div className="space-y-3">
        {orders.map((order) => {
          const status = statusMap[order.status] || statusMap.PENDING;
          return (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{order.orderNumber.slice(-4)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{typeMap[order.type] || order.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('text-xs px-2.5 py-1 rounded-lg font-medium', status.class)}>
                  {status.label}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatSAR(order.total)}</span>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">لا توجد طلبات بعد</p>
        )}
      </div>
    </div>
  );
}
