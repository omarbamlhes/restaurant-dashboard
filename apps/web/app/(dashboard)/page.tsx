'use client';

import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Receipt } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import SalesChart from '@/components/charts/SalesChart';
import RecentOrders from '@/components/dashboard/RecentOrders';
import TopItems from '@/components/dashboard/TopItems';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { formatSAR } from '@/lib/utils';

interface OverviewData {
  todayRevenue: number;
  todayOrders: number;
  todayProfit: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  profitChange: number;
  avgChange: number;
  topItems: any[];
  recentOrders: any[];
  salesChart: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">ملخص أداء مطعمك اليوم</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إيرادات اليوم"
          value={formatSAR(data.todayRevenue)}
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
          value={formatSAR(data.todayProfit)}
          change={data.profitChange}
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          title="متوسط الطلب"
          value={formatSAR(data.avgOrderValue)}
          change={data.avgChange}
          icon={Receipt}
          color="amber"
        />
      </div>

      {/* Sales Chart */}
      <SalesChart data={data.salesChart} />

      {/* Bottom row: Top Items + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopItems items={data.topItems} />
        <RecentOrders orders={data.recentOrders} />
      </div>
    </div>
  );
}
