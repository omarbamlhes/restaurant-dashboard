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

    // Enrich with revenue and today's orders for each branch
    const enriched = await Promise.all(
      branches.map(async (branch) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [revenue, todayOrders, availableTables] = await Promise.all([
          this.prisma.order.aggregate({
            where: { branchId: branch.id, status: 'COMPLETED' },
            _sum: { total: true },
          }),
          this.prisma.order.count({
            where: { branchId: branch.id, createdAt: { gte: today } },
          }),
          this.prisma.table.count({
            where: { branchId: branch.id, status: 'AVAILABLE' },
          }),
        ]);

        return {
          ...branch,
          totalRevenue: revenue._sum.total || 0,
          todayOrders,
          availableTables,
        };
      }),
    );

    return enriched;
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
