import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import {
  buildLoyaltySummary,
  pointsValue,
  LOYALTY_MIN_REDEEM,
} from './loyalty.config';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string, search?: string, page?: number, limit?: number) {
    const where: any = { restaurantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip,
        take,
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
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) };
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

  // ============ LOYALTY ============

  /**
   * Credit loyalty points to a customer and record a transaction. Reusable by
   * the order flow (EARN on purchase) and by manual staff actions. Runs inside
   * a transaction so the balance and the ledger row never diverge. Pass a
   * negative `points` for a deduction (REDEEM / ADJUST).
   */
  async applyPoints(
    customerId: string,
    points: number,
    type: 'EARN' | 'REDEEM' | 'ADJUST',
    opts: { orderId?: string; note?: string; tx?: Prisma.TransactionClient } = {},
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new NotFoundException('العميل غير موجود');

      const newBalance = customer.loyaltyPoints + points;
      if (newBalance < 0) throw new BadRequestException('رصيد النقاط غير كافٍ');

      // Lifetime only ever grows (used for tier), so redemptions don't demote.
      const lifetime =
        points > 0 ? customer.lifetimePoints + points : customer.lifetimePoints;

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance, lifetimePoints: lifetime },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          orderId: opts.orderId ?? null,
          type,
          points,
          balanceAfter: newBalance,
          note: opts.note ?? null,
        },
      });

      return updated;
    };

    return opts.tx ? run(opts.tx) : this.prisma.$transaction(run);
  }

  /** Loyalty summary + recent ledger for a customer. */
  async getLoyalty(id: string, restaurantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, restaurantId },
      include: {
        loyaltyTxns: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!customer) throw new NotFoundException('العميل غير موجود');

    return {
      ...buildLoyaltySummary(customer.loyaltyPoints, customer.lifetimePoints),
      history: customer.loyaltyTxns,
    };
  }

  /** Redeem points for in-store credit. Returns the SAR value unlocked. */
  async redeemPoints(id: string, restaurantId: string, points: number, note?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, restaurantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود');
    if (!Number.isInteger(points) || points <= 0) {
      throw new BadRequestException('عدد النقاط غير صالح');
    }
    if (points < LOYALTY_MIN_REDEEM) {
      throw new BadRequestException(`الحد الأدنى للاستبدال ${LOYALTY_MIN_REDEEM} نقطة`);
    }
    if (points > customer.loyaltyPoints) {
      throw new BadRequestException('رصيد النقاط غير كافٍ');
    }

    await this.applyPoints(id, -points, 'REDEEM', {
      note: note ?? `استبدال ${points} نقطة`,
    });
    return { redeemedPoints: points, value: pointsValue(points) };
  }

  /** Manual staff adjustment (+/-), e.g. goodwill or correction. */
  async adjustPoints(id: string, restaurantId: string, points: number, note?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, restaurantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود');
    if (!Number.isInteger(points) || points === 0) {
      throw new BadRequestException('عدد النقاط غير صالح');
    }
    await this.applyPoints(id, points, 'ADJUST', { note });
    return this.getLoyalty(id, restaurantId);
  }
}
