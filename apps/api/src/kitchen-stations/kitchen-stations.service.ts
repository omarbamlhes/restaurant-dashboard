import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto/create-kitchen-station.dto';

@Injectable()
export class KitchenStationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId: string) {
    return this.prisma.kitchenStation.findMany({
      where: { restaurantId },
      include: { _count: { select: { menuItems: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(restaurantId: string, dto: CreateKitchenStationDto) {
    return this.prisma.kitchenStation.create({
      data: { ...dto, restaurantId },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateKitchenStationDto) {
    const station = await this.prisma.kitchenStation.findFirst({
      where: { id, restaurantId },
    });
    if (!station) throw new NotFoundException('المحطة غير موجودة');
    return this.prisma.kitchenStation.update({ where: { id }, data: dto });
  }

  async remove(id: string, restaurantId: string) {
    const station = await this.prisma.kitchenStation.findFirst({
      where: { id, restaurantId },
    });
    if (!station) throw new NotFoundException('المحطة غير موجودة');

    // Unlink menu items from this station
    await this.prisma.menuItem.updateMany({
      where: { stationId: id },
      data: { stationId: null },
    });

    return this.prisma.kitchenStation.delete({ where: { id } });
  }

  // Assign menu items to a station
  async assignItems(id: string, restaurantId: string, menuItemIds: string[]) {
    const station = await this.prisma.kitchenStation.findFirst({
      where: { id, restaurantId },
    });
    if (!station) throw new NotFoundException('المحطة غير موجودة');

    await this.prisma.menuItem.updateMany({
      where: { id: { in: menuItemIds }, restaurantId },
      data: { stationId: id },
    });

    return this.findAll(restaurantId);
  }
}
