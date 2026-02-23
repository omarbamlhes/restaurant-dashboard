import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.branch.findMany({
      where: { restaurantId },
      include: { _count: { select: { orders: true, employees: true } } },
      orderBy: { isMain: 'desc' },
    });
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
