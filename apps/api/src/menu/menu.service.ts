import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto, CreateCategoryDto } from './dto/create-menu-item.dto';
import { computeItemCosting } from './recipe-cost';

/** Prisma include that pulls a menu item's recipe lines with their unit costs. */
const RECIPE_INCLUDE = {
  ingredients: {
    include: {
      ingredient: { select: { id: true, nameAr: true, unit: true, costPerUnit: true } },
    },
  },
} as const;

/**
 * Attach recipe-derived costing (cost, margin, food-cost %) to a menu item and
 * flatten its recipe into a compact breakdown the UI can render directly.
 */
function withCosting<T extends {
  price: any;
  cost: any;
  ingredients: { quantity: any; ingredient: { id: string; nameAr: string; unit: string; costPerUnit: any } }[];
}>(item: T) {
  const recipe = item.ingredients.map((mi) => ({
    ingredientId: mi.ingredient.id,
    nameAr: mi.ingredient.nameAr,
    unit: mi.ingredient.unit,
    quantity: Number(mi.quantity),
    costPerUnit: Number(mi.ingredient.costPerUnit),
    lineCost: Math.round(Number(mi.quantity) * Number(mi.ingredient.costPerUnit) * 100) / 100,
  }));
  const costing = computeItemCosting({ price: item.price, cost: item.cost, recipe });
  const { ingredients, ...rest } = item;
  return { ...rest, recipe, ...costing };
}

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string, categoryId?: string) {
    const items = await this.prisma.menuItem.findMany({
      where: { restaurantId, isActive: true, ...(categoryId ? { categoryId } : {}) },
      include: {
        category: true,
        station: { select: { id: true, nameAr: true, color: true } },
        ...RECIPE_INCLUDE,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { nameAr: 'asc' }],
    });
    return items.map(withCosting);
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
        ...RECIPE_INCLUDE,
        orderItems: { include: { order: { select: { createdAt: true, status: true } } } },
      },
    });
    if (!item) throw new NotFoundException('الصنف غير موجود');

    const totalSold = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    const totalRevenue = item.orderItems.reduce((s, oi) => s + Number(oi.totalPrice), 0);

    const { orderItems, ...withoutOrders } = item;
    return { ...withCosting(withoutOrders), totalSold, totalRevenue };
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
    // Prefer the recipe-derived cost; fall back to the hand-entered one.
    const price = Number(item.price);
    const cost = item.effectiveCost ?? Number(item.cost || 0);
    const profit = Math.round((price - cost) * 100) / 100;
    return { ...item, cost, profit, margin: item.margin ?? 0 };
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
