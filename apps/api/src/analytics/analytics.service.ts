import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const ANALYTICS_TTL = 60; // seconds — dashboards poll frequently; 60s is fresh enough

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // ── Cached public API ──────────────────────────────────────────────
  // Each report is cached per restaurant + branch (+ params) for a short TTL.

  getOverview(restaurantId: string, branchId?: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:overview:${branchId || 'all'}`,
      ANALYTICS_TTL,
      () => this._getOverview(restaurantId, branchId),
    );
  }

  getSales(restaurantId: string, period = 'daily', from?: string, to?: string, branchId?: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:sales:${branchId || 'all'}:${period}:${from || ''}:${to || ''}`,
      ANALYTICS_TTL,
      () => this._getSales(restaurantId, period, from, to, branchId),
    );
  }

  getProfitMargins(restaurantId: string, branchId?: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:profit:${branchId || 'all'}`,
      ANALYTICS_TTL,
      () => this._getProfitMargins(restaurantId, branchId),
    );
  }

  getBranchComparison(restaurantId: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:branch-comparison`,
      ANALYTICS_TTL,
      () => this._getBranchComparison(restaurantId),
    );
  }

  getPeakHours(restaurantId: string, branchId?: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:peak-hours:${branchId || 'all'}`,
      ANALYTICS_TTL,
      () => this._getPeakHours(restaurantId, branchId),
    );
  }

  getInsights(restaurantId: string, branchId?: string) {
    return this.cache.wrap(
      `analytics:${restaurantId}:insights:${branchId || 'all'}`,
      ANALYTICS_TTL,
      () => this._getInsights(restaurantId, branchId),
    );
  }

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true } });
    return branches.map((b) => b.id);
  }

  // Resolve which branches a report should cover. When a branchId is passed it is
  // validated against the restaurant (so one tenant can't read another's branch),
  // otherwise all of the restaurant's branches are included.
  private async resolveBranchIds(restaurantId: string, branchId?: string) {
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, restaurantId },
        select: { id: true },
      });
      return branch ? [branch.id] : [];
    }
    return this.getBranchIds(restaurantId);
  }

  private async _getOverview(restaurantId: string, branchId?: string) {
    const branchIds = await this.resolveBranchIds(restaurantId, branchId);
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    // Current week (Sat-Fri Saudi standard)
    const dayOfWeek = now.getDay();
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((dayOfWeek + 1) % 7));
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    // Current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Sales chart window (last 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Week/month totals are pure sums, so let the DB aggregate them instead of
    // pulling every row into memory. Today/yesterday still need item rows (for
    // cost, top items, order-type split). All queries run in a single round of
    // parallel requests, including recent orders and the 30-day chart.
    const sumWhere = (gte: Date, lt?: Date) => ({
      branchId: { in: branchIds },
      createdAt: lt ? { gte, lt } : { gte },
      status: { not: 'CANCELLED' as const },
    });

    const [
      todayOrders, yesterdayOrders,
      thisWeekAgg, prevWeekAgg, thisMonthAgg, prevMonthAgg,
      recentOrders, allOrders,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds }, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        include: { items: { include: { menuItem: { select: { name: true, nameAr: true, cost: true } } } } },
      }),
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds }, createdAt: { gte: yesterday, lt: today }, status: { not: 'CANCELLED' } },
        include: { items: { include: { menuItem: { select: { cost: true } } } } },
      }),
      this.prisma.order.aggregate({ where: sumWhere(weekStart), _sum: { total: true }, _count: true }),
      this.prisma.order.aggregate({ where: sumWhere(prevWeekStart, weekStart), _sum: { total: true }, _count: true }),
      this.prisma.order.aggregate({ where: sumWhere(monthStart), _sum: { total: true }, _count: true }),
      this.prisma.order.aggregate({ where: sumWhere(prevMonthStart, monthStart), _sum: { total: true }, _count: true }),
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, orderNumber: true, total: true, status: true, type: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { branchId: { in: branchIds }, createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
        select: { total: true, createdAt: true },
      }),
    ]);

    // Today calculations
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.total), 0);

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

    let yesterdayCost = 0;
    for (const order of yesterdayOrders) {
      for (const item of order.items) {
        yesterdayCost += Number(item.menuItem.cost || 0) * item.quantity;
      }
    }

    const todayProfit = todayRevenue - todayCost;
    const yesterdayProfit = yesterdayRevenue - yesterdayCost;
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const yesterdayAvg = yesterdayOrders.length > 0 ? yesterdayRevenue / yesterdayOrders.length : 0;

    const calcChange = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

    // Week & month summaries (DB-aggregated)
    const thisWeekRevenue = Number(thisWeekAgg._sum.total ?? 0);
    const prevWeekRevenue = Number(prevWeekAgg._sum.total ?? 0);
    const thisMonthRevenue = Number(thisMonthAgg._sum.total ?? 0);
    const prevMonthRevenue = Number(prevMonthAgg._sum.total ?? 0);
    const thisWeekOrdersCount = thisWeekAgg._count;
    const prevWeekOrdersCount = prevWeekAgg._count;
    const thisMonthOrdersCount = thisMonthAgg._count;
    const prevMonthOrdersCount = prevMonthAgg._count;

    // Top 5 items
    const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

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

    // Order type breakdown (today)
    const ordersByType = {
      DINE_IN: todayOrders.filter(o => o.type === 'DINE_IN').length,
      TAKEAWAY: todayOrders.filter(o => o.type === 'TAKEAWAY').length,
      DELIVERY: todayOrders.filter(o => o.type === 'DELIVERY').length,
    };

    return {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayOrders: todayOrders.length,
      todayProfit: Math.round(todayProfit * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      revenueChange: calcChange(todayRevenue, yesterdayRevenue),
      ordersChange: calcChange(todayOrders.length, yesterdayOrders.length),
      profitChange: calcChange(todayProfit, yesterdayProfit),
      avgChange: calcChange(avgOrderValue, yesterdayAvg),
      // Weekly & monthly
      thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
      thisWeekOrders: thisWeekOrdersCount,
      weekRevenueChange: calcChange(thisWeekRevenue, prevWeekRevenue),
      weekOrdersChange: calcChange(thisWeekOrdersCount, prevWeekOrdersCount),
      thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
      thisMonthOrders: thisMonthOrdersCount,
      monthRevenueChange: calcChange(thisMonthRevenue, prevMonthRevenue),
      monthOrdersChange: calcChange(thisMonthOrdersCount, prevMonthOrdersCount),
      // Breakdown
      ordersByType,
      topItems,
      recentOrders,
      salesChart,
    };
  }

  private async _getSales(restaurantId: string, period: string = 'daily', from?: string, to?: string, branchId?: string) {
    const branchIds = await this.resolveBranchIds(restaurantId, branchId);
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

  private async _getProfitMargins(restaurantId: string, branchId?: string) {
    const branchIds = await this.resolveBranchIds(restaurantId, branchId);
    const items = await this.prisma.menuItem.findMany({
      where: { restaurantId, isActive: true },
      include: {
        orderItems: {
          where: { order: { branchId: { in: branchIds } } },
          select: { quantity: true, totalPrice: true },
        },
        category: { select: { nameAr: true } },
      },
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

  // Side-by-side performance of every branch over the last 30 days.
  private async _getBranchComparison(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true, name: true, nameAr: true, isMain: true },
      orderBy: { isMain: 'desc' },
    });
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await Promise.all(
      branches.map(async (b) => {
        const orders = await this.prisma.order.findMany({
          where: { branchId: b.id, createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
          include: { items: { include: { menuItem: { select: { cost: true } } } } },
        });

        const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
        let cost = 0;
        for (const o of orders) {
          for (const item of o.items) {
            cost += Number(item.menuItem.cost || 0) * item.quantity;
          }
        }
        const profit = revenue - cost;

        return {
          id: b.id,
          name: b.name,
          nameAr: b.nameAr,
          isMain: b.isMain,
          revenue: Math.round(revenue * 100) / 100,
          orders: orders.length,
          profit: Math.round(profit * 100) / 100,
          avgOrder: orders.length > 0 ? Math.round((revenue / orders.length) * 100) / 100 : 0,
        };
      }),
    );

    return results.sort((a, b) => b.revenue - a.revenue);
  }

  private async _getPeakHours(restaurantId: string, branchId?: string) {
    const branchIds = await this.resolveBranchIds(restaurantId, branchId);
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

  // Derives natural-language, prioritized business insights from the existing
  // analytics — a deterministic engine (no external API) so it always works.
  private async _getInsights(restaurantId: string, branchId?: string) {
    const [overview, margins, peak, lowStock] = await Promise.all([
      this._getOverview(restaurantId, branchId),
      this._getProfitMargins(restaurantId, branchId),
      this._getPeakHours(restaurantId, branchId),
      this.prisma.ingredient.findMany({
        where: { restaurantId, minStock: { gt: 0 } },
        select: { nameAr: true, currentStock: true, minStock: true },
      }),
    ]);

    type Insight = {
      kind: 'positive' | 'warning' | 'info' | 'tip';
      title: string;
      message: string;
      priority: number; // higher = more important
    };
    const insights: Insight[] = [];

    // Revenue trend (today vs yesterday)
    if (overview.revenueChange > 5) {
      insights.push({
        kind: 'positive', priority: 90,
        title: 'مبيعات اليوم في ارتفاع',
        message: `إيرادات اليوم أعلى بنسبة ${overview.revenueChange}% مقارنة بالأمس. استمر على نفس الأداء!`,
      });
    } else if (overview.revenueChange < -5) {
      insights.push({
        kind: 'warning', priority: 95,
        title: 'انخفاض في مبيعات اليوم',
        message: `إيرادات اليوم أقل بنسبة ${Math.abs(overview.revenueChange)}% عن الأمس. راجع العروض أو ساعات الذروة.`,
      });
    }

    // Monthly trend
    if (overview.monthRevenueChange > 10) {
      insights.push({
        kind: 'positive', priority: 70,
        title: 'نمو شهري قوي',
        message: `مبيعات هذا الشهر أعلى بـ ${overview.monthRevenueChange}% عن الشهر الماضي.`,
      });
    }

    // Best seller today
    if (overview.topItems?.length) {
      const top = overview.topItems[0];
      insights.push({
        kind: 'info', priority: 60,
        title: 'الصنف الأكثر مبيعاً اليوم',
        message: `«${top.nameAr}» تصدّر المبيعات بـ ${top.quantity} طلب. فكّر في إبرازه أو عمل عرض عليه.`,
      });
    }

    // Peak hour
    const busiest = [...peak].sort((a, b) => b.orders - a.orders)[0];
    if (busiest && busiest.orders > 0) {
      const h = busiest.hour;
      const label = `${h % 12 || 12}${h >= 12 ? ' م' : ' ص'}`;
      insights.push({
        kind: 'tip', priority: 55,
        title: 'ساعة الذروة',
        message: `أكثر الأوقات ازدحاماً حوالي الساعة ${label}. تأكّد من جاهزية الطاقم والمخزون قبلها.`,
      });
    }

    // Low-margin item
    const sold = margins.filter((m) => m.totalSold > 0);
    const worst = sold.sort((a, b) => a.margin - b.margin)[0];
    if (worst && worst.margin < 30) {
      insights.push({
        kind: 'warning', priority: 80,
        title: 'هامش ربح منخفض',
        message: `«${worst.nameAr}» هامش ربحه ${worst.margin}% فقط. راجع سعره أو تكلفته.`,
      });
    }

    // High-margin star
    const best = sold.sort((a, b) => (b.margin * b.totalSold) - (a.margin * a.totalSold))[0];
    if (best && best.margin >= 50) {
      insights.push({
        kind: 'positive', priority: 50,
        title: 'نجم الأرباح',
        message: `«${best.nameAr}» يجمع بين هامش ربح ${best.margin}% ومبيعات جيدة — ركّز على الترويج له.`,
      });
    }

    // Low stock
    const low = lowStock.filter((i) => Number(i.currentStock) <= Number(i.minStock));
    if (low.length > 0) {
      insights.push({
        kind: 'warning', priority: 85,
        title: 'مخزون منخفض',
        message: `${low.length} مكوّن وصل للحد الأدنى${low.length <= 3 ? `: ${low.map((i) => i.nameAr).join('، ')}` : ''}. أعد الطلب لتجنّب النفاد.`,
      });
    }

    // Order type mix
    const t = overview.ordersByType;
    const totalTyped = t.DINE_IN + t.TAKEAWAY + t.DELIVERY;
    if (totalTyped >= 5) {
      const deliveryPct = Math.round((t.DELIVERY / totalTyped) * 100);
      if (deliveryPct >= 40) {
        insights.push({
          kind: 'info', priority: 40,
          title: 'التوصيل يقود الطلبات',
          message: `${deliveryPct}% من طلبات اليوم توصيل. تأكّد من كفاءة التوصيل وتغليف الطلبات.`,
        });
      }
    }

    // Fallback when there's little data
    if (insights.length === 0) {
      insights.push({
        kind: 'tip', priority: 10,
        title: 'ابدأ بجمع البيانات',
        message: 'سجّل المزيد من الطلبات وستظهر لك رؤى ذكية عن أداء مطعمك تلقائياً.',
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      insights: insights.sort((a, b) => b.priority - a.priority).map(({ priority, ...rest }) => rest),
    };
  }
}
