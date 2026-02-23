export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type PlanType = 'BASIC' | 'PRO' | 'ENTERPRISE';

export type NotificationType =
  | 'LOW_STOCK'
  | 'HIGH_WASTE'
  | 'SALES_ALERT'
  | 'DAILY_REPORT'
  | 'AI_RECOMMENDATION'
  | 'PAYMENT_DUE'
  | 'SYSTEM';

export interface DashboardOverview {
  todayRevenue: number;
  todayOrders: number;
  todayProfit: number;
  avgOrderValue: number;
  revenueChange: number;
  ordersChange: number;
  topItems: { name: string; nameAr: string; quantity: number; revenue: number }[];
  recentOrders: { id: string; orderNumber: string; total: number; status: OrderStatus; createdAt: string }[];
  salesChart: { date: string; revenue: number; orders: number }[];
}
