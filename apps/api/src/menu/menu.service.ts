import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto, CreateCategoryDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string, categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isActive: true, ...(categoryId ? { categoryId } : {}) },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { nameAr: 'asc' }],
    });
  }

  async create(restaurantId: string, dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: { ...dto, restaurantId },
      include: { category: true },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
      include: {
        category: true,
        orderItems: { include: { order: { select: { createdAt: true, status: true } } } },
      },
    });
    if (!item) throw new NotFoundException('الصنف غير موجود');

    const totalSold = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    const totalRevenue = item.orderItems.reduce((s, oi) => s + Number(oi.totalPrice), 0);

    return { ...item, totalSold, totalRevenue, orderItems: undefined };
  }

  async update(id: string, restaurantId: string, dto: UpdateMenuItemDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.menuItem.update({ where: { id }, data: dto, include: { category: true } });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.menuItem.update({ where: { id }, data: { isActive: false } });
  }

  async getProfitAnalysis(id: string, restaurantId: string) {
    const item = await this.findOne(id, restaurantId);
    const price = Number(item.price);
    const cost = Number(item.cost || 0);
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    return { ...item, profit, margin: Math.round(margin * 10) / 10 };
  }

  async getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      include: { _count: { select: { menuItems: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, restaurantId } });
  }
}
