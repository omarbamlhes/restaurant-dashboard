import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true } });
    return branches.map((b) => b.id);
  }

  async getOverview(restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const [todayOrders, yesterdayOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds }, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        include: { items: { include: { menuItem: { select: { name: true, nameAr: true, cost: true } } } } },
      }),
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds }, createdAt: { gte: yesterday, lt: today }, status: { not: 'CANCELLED' } },
      }),
    ]);

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.total), 0);

    // Calculate profit
    let todayCost = 0;
    const itemCounts: Record<string, { name: string; nameAr: string; quantity: number; revenue: number }> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        todayCost += Number(item.menuItem.cost || 0) * item.quantity;
        const key = item.menuItemId;
        if (!itemCounts[key]) {
          itemCounts[key] = { name: item.menuItem.name, nameAr: item.menuItem.nameAr, quantity: 0, revenue: 0 };
        }
        itemCounts[key].quantity += item.quantity;
        itemCounts[key].revenue += Number(item.totalPrice);
      }
    }

    const todayProfit = todayRevenue - todayCost;
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    const ordersChange = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : 0;

    // Top 5 items
    const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // Recent 10 orders
    const recentOrders = await this.prisma.order.findMany({
      where: { branchId: { in: branchIds } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, orderNumber: true, total: true, status: true, type: true, createdAt: true },
    });

    // Sales chart (last 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const allOrders = await this.prisma.order.findMany({
      where: { branchId: { in: branchIds }, createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const salesMap: Record<string, { revenue: number; orders: number }> = {};
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      salesMap[key] = { revenue: 0, orders: 0 };
    }
    for (const o of allOrders) {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (salesMap[key]) {
        salesMap[key].revenue += Number(o.total);
        salesMap[key].orders += 1;
      }
    }
    const salesChart = Object.entries(salesMap).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
      revenue: Math.round(val.revenue),
      orders: val.orders,
    }));

    return {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayOrders: todayOrders.length,
      todayProfit: Math.round(todayProfit * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      revenueChange: Math.round(revenueChange * 10) / 10,
      ordersChange: Math.round(ordersChange * 10) / 10,
      profitChange: 0,
      avgChange: 0,
      topItems,
      recentOrders,
      salesChart,
    };
  }

  async getSales(restaurantId: string, period: string = 'daily', from?: string, to?: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + 'T23:59:59') : new Date();

    const orders = await this.prisma.order.findMany({
      where: { branchId: { in: branchIds }, createdAt: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, { revenue: number; orders: number }> = {};
    for (const o of orders) {
      let key: string;
      const d = new Date(o.createdAt);
      if (period === 'weekly') {
        const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = d.toISOString().split('T')[0];
      }
      if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
      grouped[key].revenue += Number(o.total);
      grouped[key].orders += 1;
    }

    return Object.entries(grouped).map(([date, val]) => ({
      date,
      revenue: Math.round(val.revenue * 100) / 100,
      orders: val.orders,
      avgOrder: val.orders > 0 ? Math.round((val.revenue / val.orders) * 100) / 100 : 0,
    }));
  }

  async getProfitMargins(restaurantId: string) {
    const items = await this.prisma.menuItem.findMany({
      where: { restaurantId, isActive: true },
      include: { orderItems: { select: { quantity: true, totalPrice: true } }, category: { select: { nameAr: true } } },
    });

    return items.map((item) => {
      const totalSold = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
      const totalRevenue = item.orderItems.reduce((s, oi) => s + Number(oi.totalPrice), 0);
      const unitCost = Number(item.cost || 0);
      const unitPrice = Number(item.price);
      const profitPerItem = unitPrice - unitCost;
      const margin = unitPrice > 0 ? (profitPerItem / unitPrice) * 100 : 0;
      return {
        id: item.id, nameAr: item.nameAr, category: item.category.nameAr,
        unitPrice, unitCost, profitPerItem: Math.round(profitPerItem * 100) / 100,
        margin: Math.round(margin * 10) / 10, totalSold, totalRevenue: Math.round(totalRevenue * 100) / 100,
      };
    }).sort((a, b) => b.margin - a.margin);
  }

  async getPeakHours(restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: { branchId: { in: branchIds }, createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const hours: Record<number, { orders: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) hours[h] = { orders: 0, revenue: 0 };

    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      hours[h].orders += 1;
      hours[h].revenue += Number(o.total);
    }

    return Object.entries(hours).map(([hour, val]) => ({
      hour: parseInt(hour),
      label: `${hour}:00`,
      orders: val.orders,
      revenue: Math.round(val.revenue),
    }));
  }
}
