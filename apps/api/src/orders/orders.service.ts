import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';
import { OrdersGateway } from './orders.gateway';
import { CacheService } from '../cache/cache.service';
import { buildZatcaQR } from '../common/zatca';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
    private cache: CacheService,
  ) {}

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
        include: {
          branch: { select: { nameAr: true } },
          table: { select: { number: true, nameAr: true } },
          items: { include: { menuItem: { select: { nameAr: true, stationId: true, station: { select: { id: true, nameAr: true, color: true } } } } } },
        },
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
    const total = Math.round((subtotal + tax - discount) * 100) / 100;

    // Payment validation
    const paidAmount = dto.paidAmount;
    if (paidAmount < total) {
      throw new BadRequestException('المبلغ المدفوع لا يغطي الإجمالي');
    }

    let cashAmount = 0;
    let cardAmount = 0;
    let changeAmount = 0;

    if (dto.paymentMethod === 'CASH') {
      cashAmount = paidAmount;
      changeAmount = Math.round((paidAmount - total) * 100) / 100;
    } else if (dto.paymentMethod === 'CARD') {
      cardAmount = total;
    } else if (dto.paymentMethod === 'SPLIT') {
      cashAmount = dto.cashAmount || 0;
      cardAmount = dto.cardAmount || 0;
      if (Math.round((cashAmount + cardAmount) * 100) < Math.round(total * 100)) {
        throw new BadRequestException('مجموع الدفع المقسم لا يغطي الإجمالي');
      }
      changeAmount = Math.round((cashAmount + cardAmount - total) * 100) / 100;
    }

    // Table validation for dine-in
    if (dto.type === 'DINE_IN' && dto.tableId) {
      const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new BadRequestException('الطاولة غير موجودة');
      if (table.status === 'OCCUPIED') throw new BadRequestException('الطاولة مشغولة');
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        type: dto.type,
        branchId: dto.branchId,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: dto.paymentMethod,
        paymentStatus: 'PAID',
        paidAmount,
        cashAmount,
        cardAmount,
        changeAmount,
        tableId: dto.type === 'DINE_IN' ? dto.tableId : null,
        items: { create: itemsData },
      },
      include: {
        branch: { select: { nameAr: true } },
        table: { select: { number: true, nameAr: true } },
        items: { include: { menuItem: { select: { nameAr: true, stationId: true, station: { select: { id: true, nameAr: true, color: true } } } } } },
      },
    });

    // Mark table as occupied and emit real-time update
    if (dto.type === 'DINE_IN' && dto.tableId) {
      const updatedTable = await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
        include: { branch: { select: { nameAr: true } } },
      });
      this.ordersGateway.emitTableStatusChanged(restaurantId, updatedTable);
    }

    this.ordersGateway.emitNewOrder(restaurantId, order);
    this.cache.invalidate(`analytics:${restaurantId}:*`);

    return order;
  }

  async findOne(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const order = await this.prisma.order.findFirst({
      where: { id, branchId: { in: branchIds } },
      include: { branch: true, table: true, items: { include: { menuItem: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateStatusDto) {
    await this.findOne(id, restaurantId);
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        branch: { select: { nameAr: true } },
        table: { select: { number: true, nameAr: true } },
        items: { include: { menuItem: { select: { nameAr: true, stationId: true, station: { select: { id: true, nameAr: true, color: true } } } } } },
      },
    });

    // Sync item station statuses when order status is manually set
    if (dto.status === 'READY' || dto.status === 'COMPLETED') {
      await this.prisma.orderItem.updateMany({
        where: { orderId: id, stationStatus: { not: 'DONE' } },
        data: { stationStatus: 'DONE' },
      });
    }

    // Release table if completed/cancelled
    if ((dto.status === 'COMPLETED' || dto.status === 'CANCELLED') && order.tableId) {
      // Check if table has other active orders
      const activeOrders = await this.prisma.order.count({
        where: {
          tableId: order.tableId,
          id: { not: id },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });
      if (activeOrders === 0) {
        const updatedTable = await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
          include: { branch: { select: { nameAr: true } } },
        });
        this.ordersGateway.emitTableStatusChanged(restaurantId, updatedTable);
      }
    }

    this.ordersGateway.emitOrderStatusChanged(restaurantId, order);
    // A cancelled/uncancelled order changes revenue, so drop cached analytics.
    this.cache.invalidate(`analytics:${restaurantId}:*`);

    return order;
  }

  async findOneForReceipt(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const order = await this.prisma.order.findFirst({
      where: { id, branchId: { in: branchIds } },
      include: {
        branch: { include: { restaurant: true } },
        table: true,
        items: { include: { menuItem: { select: { nameAr: true, name: true } } } },
      },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    const taxNumber = order.branch.restaurant.taxNumber;
    const zatcaQR = taxNumber
      ? buildZatcaQR({
          sellerName: order.branch.restaurant.nameAr,
          taxNumber,
          timestamp: order.createdAt,
          totalWithVat: Number(order.total),
          vatAmount: Number(order.tax),
        })
      : null;

    return { ...order, zatcaQR };
  }

  async getShiftReport(restaurantId: string, filters: { from: string; to: string; branchId?: string }) {
    const branchIds = filters.branchId
      ? [filters.branchId]
      : await this.getBranchIds(restaurantId);

    const from = new Date(filters.from);
    const to = new Date(filters.to + 'T23:59:59');

    const orders = await this.prisma.order.findMany({
      where: {
        branchId: { in: branchIds },
        createdAt: { gte: from, lte: to },
      },
      include: { items: { include: { menuItem: { select: { nameAr: true } } } } },
    });

    const completed = orders.filter((o) => o.status !== 'CANCELLED');
    const cancelled = orders.filter((o) => o.status === 'CANCELLED');

    const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
    const totalSubtotal = completed.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalTax = completed.reduce((s, o) => s + Number(o.tax), 0);
    const totalDiscount = completed.reduce((s, o) => s + Number(o.discount), 0);
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Payment breakdown
    const cashOrders = completed.filter((o) => o.paymentMethod === 'CASH');
    const cardOrders = completed.filter((o) => o.paymentMethod === 'CARD');
    const splitOrders = completed.filter((o) => o.paymentMethod === 'SPLIT');

    const totalCash = completed.reduce((s, o) => s + Number(o.cashAmount), 0);
    const totalCard = completed.reduce((s, o) => s + Number(o.cardAmount), 0);
    const totalChange = completed.reduce((s, o) => s + Number(o.changeAmount), 0);

    // Type breakdown
    const dineIn = completed.filter((o) => o.type === 'DINE_IN');
    const takeaway = completed.filter((o) => o.type === 'TAKEAWAY');
    const delivery = completed.filter((o) => o.type === 'DELIVERY');

    // Top items
    const itemCounts: Record<string, { nameAr: string; quantity: number; revenue: number }> = {};
    completed.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.menuItemId;
        if (!itemCounts[key]) {
          itemCounts[key] = { nameAr: item.menuItem.nameAr, quantity: 0, revenue: 0 };
        }
        itemCounts[key].quantity += item.quantity;
        itemCounts[key].revenue += Number(item.totalPrice);
      });
    });
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      period: { from: filters.from, to: filters.to },
      totalOrders: completed.length,
      cancelledOrders: cancelled.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSubtotal: Math.round(totalSubtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      payment: {
        cash: { count: cashOrders.length, total: Math.round(totalCash * 100) / 100 },
        card: { count: cardOrders.length, total: Math.round(totalCard * 100) / 100 },
        split: { count: splitOrders.length },
        totalChange: Math.round(totalChange * 100) / 100,
      },
      orderTypes: {
        dineIn: { count: dineIn.length, total: Math.round(dineIn.reduce((s, o) => s + Number(o.total), 0) * 100) / 100 },
        takeaway: { count: takeaway.length, total: Math.round(takeaway.reduce((s, o) => s + Number(o.total), 0) * 100) / 100 },
        delivery: { count: delivery.length, total: Math.round(delivery.reduce((s, o) => s + Number(o.total), 0) * 100) / 100 },
      },
      topItems,
    };
  }

  async updateItemStationStatus(orderId: string, itemId: string, restaurantId: string, status: string) {
    const order = await this.findOne(orderId, restaurantId);

    const item = order.items.find((i: any) => i.id === itemId);
    if (!item) throw new NotFoundException('الصنف غير موجود في الطلب');

    // Update this item's station status
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { stationStatus: status as any },
    });

    // Check if all items in the order are DONE
    const allItems = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { id: true, stationStatus: true },
    });

    // Update the item we just changed in our local copy
    const updatedItems = allItems.map(i => i.id === itemId ? { ...i, stationStatus: status } : i);
    const allDone = updatedItems.every(i => i.stationStatus === 'DONE');

    // If first item starts preparing, move order to PREPARING
    const anyPreparing = updatedItems.some(i => i.stationStatus === 'PREPARING' || i.stationStatus === 'DONE');
    if (anyPreparing && order.status === 'PENDING') {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'PREPARING' } });
    }

    // If all items done, auto-promote to READY
    if (allDone && order.status !== 'READY' && order.status !== 'COMPLETED') {
      const readyOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'READY' },
        include: {
          branch: { select: { nameAr: true } },
          table: { select: { number: true, nameAr: true } },
          items: { include: { menuItem: { select: { nameAr: true, stationId: true, station: { select: { id: true, nameAr: true, color: true } } } } } },
        },
      });
      this.ordersGateway.emitOrderStatusChanged(restaurantId, readyOrder);
    } else if (anyPreparing && order.status === 'PENDING') {
      // Emit the status change to PREPARING
      const preparingOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          branch: { select: { nameAr: true } },
          table: { select: { number: true, nameAr: true } },
          items: { include: { menuItem: { select: { nameAr: true, stationId: true, station: { select: { id: true, nameAr: true, color: true } } } } } },
        },
      });
      this.ordersGateway.emitOrderStatusChanged(restaurantId, preparingOrder);
    }

    // Emit item-level event
    this.ordersGateway.emitItemStationStatusChanged(restaurantId, {
      orderId,
      itemId,
      stationStatus: status,
      stationId: (item as any).menuItem?.stationId,
    });

    return { orderId, itemId, stationStatus: status, allDone };
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
