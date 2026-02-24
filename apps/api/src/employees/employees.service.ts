import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }

  async findAll(restaurantId: string, filters: {
    branchId?: string; role?: string; isActive?: string;
  }) {
    const { branchId, role, isActive } = filters;
    const branchIds = branchId ? [branchId] : await this.getBranchIds(restaurantId);

    const where: any = { branchId: { in: branchIds } };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    return this.prisma.employee.findMany({
      where,
      include: { branch: { select: { nameAr: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const employee = await this.prisma.employee.findFirst({
      where: { id, branchId: { in: branchIds } },
      include: { branch: { select: { nameAr: true, name: true } }, shifts: { orderBy: { startTime: 'desc' }, take: 10 } },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  async create(restaurantId: string, dto: CreateEmployeeDto) {
    const branchIds = await this.getBranchIds(restaurantId);
    if (!branchIds.includes(dto.branchId)) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return this.prisma.employee.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        phone: dto.phone,
        role: dto.role,
        salary: dto.salary,
        branchId: dto.branchId,
      },
      include: { branch: { select: { nameAr: true } } },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateEmployeeDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.employee.update({
      where: { id },
      data: dto,
      include: { branch: { select: { nameAr: true } } },
    });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
