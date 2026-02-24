import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto, UpdateIngredientDto, CreateInventoryLogDto } from './dto/create-ingredient.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { nameAr: 'asc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, restaurantId },
    });
    if (!ingredient) throw new NotFoundException('المكون غير موجود');
    return ingredient;
  }

  async create(restaurantId: string, dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit,
        currentStock: dto.currentStock || 0,
        minStock: dto.minStock || 0,
        restaurantId,
      },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateIngredientDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.ingredient.update({
      where: { id },
      data: dto,
    });
  }

  async createLog(id: string, restaurantId: string, dto: CreateInventoryLogDto) {
    const ingredient = await this.findOne(id, restaurantId);

    // Calculate new stock based on action type
    let stockChange = Number(dto.quantity);
    if (dto.type === 'CONSUMED' || dto.type === 'WASTED') {
      stockChange = -stockChange;
    } else if (dto.type === 'ADJUSTMENT') {
      // Adjustment sets absolute value: stockChange = target - current
      stockChange = dto.quantity - Number(ingredient.currentStock);
    }

    const [log] = await this.prisma.$transaction([
      this.prisma.inventoryLog.create({
        data: {
          ingredientId: id,
          branchId: dto.branchId,
          type: dto.type,
          quantity: dto.quantity,
          note: dto.note,
        },
        include: { branch: { select: { nameAr: true } } },
      }),
      this.prisma.ingredient.update({
        where: { id },
        data: { currentStock: { increment: stockChange } },
      }),
    ]);

    return log;
  }

  async getLogs(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.inventoryLog.findMany({
      where: { ingredientId: id },
      include: { branch: { select: { nameAr: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
