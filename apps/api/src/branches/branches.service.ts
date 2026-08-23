import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      include: {
        _count: { select: { orders: true, employees: true, tables: true } },
      },
      orderBy: { isMain: 'desc' },
    });

    if (branches.length === 0) return [];

    // Enrich with revenue and today's orders. Aggregate every branch in three
    // grouped queries instead of three per branch (was 3N+1 round-trips).
    const branchIds = branches.map((b) => b.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [revenueByBranch, todayOrdersByBranch, availableTablesByBranch] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds }, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds }, createdAt: { gte: today } },
        _count: { _all: true },
      }),
      this.prisma.table.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds }, status: 'AVAILABLE' },
        _count: { _all: true },
      }),
    ]);

    const revenueMap = new Map(revenueByBranch.map((r) => [r.branchId, Number(r._sum.total || 0)]));
    const todayOrdersMap = new Map(todayOrdersByBranch.map((r) => [r.branchId, r._count._all]));
    const availableTablesMap = new Map(availableTablesByBranch.map((r) => [r.branchId, r._count._all]));

    return branches.map((branch) => ({
      ...branch,
      totalRevenue: revenueMap.get(branch.id) || 0,
      todayOrders: todayOrdersMap.get(branch.id) || 0,
      availableTables: availableTablesMap.get(branch.id) || 0,
    }));
  }

  async create(restaurantId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { ...dto, restaurantId } });
  }

  async findOne(id: string, restaurantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, restaurantId },
      include: { _count: { select: { orders: true, employees: true } } },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');
    return branch;
  }

  async update(id: string, restaurantId: string, dto: Partial<CreateBranchDto>) {
    await this.findOne(id, restaurantId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
