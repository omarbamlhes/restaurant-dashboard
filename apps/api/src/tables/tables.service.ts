import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
  ) {}

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }

  async findAll(restaurantId: string, branchId?: string) {
    const branchIds = branchId ? [branchId] : await this.getBranchIds(restaurantId);

    return this.prisma.table.findMany({
      where: { branchId: { in: branchIds } },
      include: {
        branch: { select: { id: true, nameAr: true, name: true } },
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async create(restaurantId: string, dto: CreateTableDto) {
    // Verify branch belongs to restaurant
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, restaurantId },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    // Check unique number
    const existing = await this.prisma.table.findUnique({
      where: { branchId_number: { branchId: dto.branchId, number: dto.number } },
    });
    if (existing) throw new ConflictException('رقم الطاولة موجود مسبقاً في هذا الفرع');

    return this.prisma.table.create({
      data: {
        number: dto.number,
        name: dto.name,
        nameAr: dto.nameAr,
        capacity: dto.capacity || 4,
        branchId: dto.branchId,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateTableDto) {
    const table = await this.findOneOrFail(id, restaurantId);

    if (dto.number && dto.number !== table.number) {
      const existing = await this.prisma.table.findUnique({
        where: { branchId_number: { branchId: table.branchId, number: dto.number } },
      });
      if (existing) throw new ConflictException('رقم الطاولة موجود مسبقاً في هذا الفرع');
    }

    return this.prisma.table.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateTableStatusDto) {
    await this.findOneOrFail(id, restaurantId);
    const updated = await this.prisma.table.update({
      where: { id },
      data: { status: dto.status },
      include: { branch: { select: { nameAr: true } } },
    });
    this.ordersGateway.emitTableStatusChanged(restaurantId, updated);
    return updated;
  }

  private async findOneOrFail(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const table = await this.prisma.table.findFirst({
      where: { id, branchId: { in: branchIds } },
    });
    if (!table) throw new NotFoundException('الطاولة غير موجودة');
    return table;
  }
}
