import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreatePublicOrderDto } from './dto/create-public-order.dto';

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
  ) {}

  async getBranchMenu(branchId: string, tableId?: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        restaurant: {
          select: { id: true, name: true, nameAr: true, logo: true, currency: true },
        },
      },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    let table: { id: string; number: number; nameAr: string | null; name: string | null; capacity: number } | null = null;
    if (tableId) {
      table = await this.prisma.table.findFirst({
        where: { id: tableId, branchId },
        select: { id: true, number: true, nameAr: true, name: true, capacity: true },
      });
      if (!table) throw new NotFoundException('الطاولة غير موجودة');
    }

    const categories = await this.prisma.category.findMany({
      where: {
        restaurantId: branch.restaurant.id,
        menuItems: { some: { isActive: true } },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            nameAr: true,
            description: true,
            descriptionAr: true,
            image: true,
            price: true,
            preparationTime: true,
          },
          orderBy: { nameAr: 'asc' },
        },
      },
    });

    return {
      restaurant: branch.restaurant,
      branch: { id: branch.id, name: branch.name, nameAr: branch.nameAr },
      table,
      categories,
    };
  }

  async createOrder(branchId: string, tableId: string, dto: CreatePublicOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('السلة فارغة');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, restaurantId: true },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    const table = await this.prisma.table.findFirst({
      where: { id: tableId, branchId },
    });
    if (!table) throw new NotFoundException('الطاولة غير موجودة');

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: dto.items.map((i) => i.menuItemId) },
        restaurantId: branch.restaurantId,
        isActive: true,
      },
    });

    if (menuItems.length !== dto.items.length) {
      throw new BadRequestException('بعض الأصناف غير متوفرة');
    }

    const itemsData = dto.items.map((item) => {
      const mi = menuItems.find((m) => m.id === item.menuItemId)!;
      const unitPrice = Number(mi.price);
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * item.quantity * 100) / 100,
        notes: item.notes,
      };
    });

    const subtotal = Math.round(itemsData.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    let customerId: string | undefined;
    if (dto.customerPhone) {
      const customer = await this.prisma.customer.upsert({
        where: {
          restaurantId_phone: { restaurantId: branch.restaurantId, phone: dto.customerPhone },
        },
        create: {
          restaurantId: branch.restaurantId,
          phone: dto.customerPhone,
          name: dto.customerName || dto.customerPhone,
        },
        update: dto.customerName ? { name: dto.customerName } : {},
      });
      customerId = customer.id;
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `QR-${Date.now().toString(36).toUpperCase()}`,
        type: 'DINE_IN',
        status: 'PENDING',
        branchId,
        tableId,
        customerId,
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: 'CASH',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        items: { create: itemsData },
      },
      include: {
        branch: { select: { nameAr: true } },
        table: { select: { number: true, nameAr: true } },
        items: {
          include: {
            menuItem: {
              select: {
                nameAr: true,
                stationId: true,
                station: { select: { id: true, nameAr: true, color: true } },
              },
            },
          },
        },
      },
    });

    if (table.status !== 'OCCUPIED') {
      const updatedTable = await this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
        include: { branch: { select: { nameAr: true } } },
      });
      this.ordersGateway.emitTableStatusChanged(branch.restaurantId, updatedTable);
    }

    this.ordersGateway.emitNewOrder(branch.restaurantId, order);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
    };
  }
}
