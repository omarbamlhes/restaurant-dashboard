'use client';

import { formatSAR } from '@/lib/utils';
import SARSymbol from '@/components/shared/SARSymbol';

interface TopItem {
  name: string;
  nameAr: string;
  quantity: number;
  revenue: number;
}

export default function TopItems({ items }: { items: TopItem[] }) {
  const maxQty = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">الأصناف الأكثر مبيعا</h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.nameAr}</span>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatSAR(item.revenue)} <SARSymbol /></span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">{item.quantity} طلب</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-card rounded-full h-2">
              <div
                className="bg-gradient-to-l from-primary-400 to-primary-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.quantity / maxQty) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">لا توجد بيانات</p>
        )}
      </div>
    </div>
  );
}
