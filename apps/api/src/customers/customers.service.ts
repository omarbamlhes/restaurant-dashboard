import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string, search?: string) {
    const where: any = { restaurantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { totalSpent: 'desc' },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            type: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true } },
      },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, restaurantId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('العميل غير موجود');
    return customer;
  }

  async create(restaurantId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
    });
    if (existing) throw new ConflictException('رقم الجوال مسجل مسبقاً');

    return this.prisma.customer.create({
      data: { ...dto, restaurantId },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id, restaurantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود');

    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findUnique({
        where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
      });
      if (existing) throw new ConflictException('رقم الجوال مسجل مسبقاً');
    }

    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async delete(id: string, restaurantId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, restaurantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود');

    // Unlink orders instead of deleting them
    await this.prisma.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
    return this.prisma.customer.delete({ where: { id } });
  }

  async getStats(restaurantId: string) {
    const [totalCustomers, customers] = await Promise.all([
      this.prisma.customer.count({ where: { restaurantId } }),
      this.prisma.customer.findMany({
        where: { restaurantId },
        select: { totalSpent: true, totalOrders: true, lastOrderAt: true },
      }),
    ]);

    const totalSpent = customers.reduce((s, c) => s + Number(c.totalSpent), 0);
    const avgSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

    // Active customers (ordered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCustomers = customers.filter(c => c.lastOrderAt && new Date(c.lastOrderAt) >= thirtyDaysAgo).length;

    return {
      totalCustomers,
      activeCustomers,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgSpent: Math.round(avgSpent * 100) / 100,
    };
  }
}
