import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }

  async findAll(restaurantId: string, filters: {
    page?: number; limit?: number; branchId?: string;
    status?: string; type?: string; from?: string; to?: string;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const { branchId, status, type, from, to } = filters;
    const branchIds = branchId ? [branchId] : await this.getBranchIds(restaurantId);

    const where: any = { branchId: { in: branchIds } };
    if (status) where.status = status;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { branch: { select: { nameAr: true } }, items: { include: { menuItem: { select: { nameAr: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(restaurantId: string, dto: CreateOrderDto) {
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.items.map((i) => i.menuItemId) } },
    });

    const itemsData = dto.items.map((item) => {
      const mi = menuItems.find((m) => m.id === item.menuItemId);
      const unitPrice = Number(mi?.price || 0);
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        notes: item.notes,
      };
    });

    const subtotal = itemsData.reduce((s, i) => s + i.totalPrice, 0);
    const tax = Math.round(subtotal * 0.15 * 100) / 100; // 15% VAT
    const discount = dto.discount || 0;
    const total = subtotal + tax - discount;

    return this.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        type: dto.type,
        branchId: dto.branchId,
        subtotal,
        tax,
        discount,
        total,
        items: { create: itemsData },
      },
      include: { items: { include: { menuItem: { select: { nameAr: true } } } } },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const order = await this.prisma.order.findFirst({
      where: { id, branchId: { in: branchIds } },
      include: { branch: true, items: { include: { menuItem: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateStatusDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.order.update({ where: { id }, data: { status: dto.status } });
  }

  async getStats(restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todayOrders, yesterdayOrders] = await Promise.all([
      this.prisma.order.findMany({ where: { branchId: { in: branchIds }, createdAt: { gte: today } } }),
      this.prisma.order.findMany({ where: { branchId: { in: branchIds }, createdAt: { gte: yesterday, lt: today } } }),
    ]);

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.total), 0);
    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    const ordersChange = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : 0;

    return {
      todayOrders: todayOrders.length,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      avgOrderValue: todayOrders.length > 0 ? Math.round((todayRevenue / todayOrders.length) * 100) / 100 : 0,
      revenueChange: Math.round(revenueChange * 10) / 10,
      ordersChange: Math.round(ordersChange * 10) / 10,
    };
  }
}
