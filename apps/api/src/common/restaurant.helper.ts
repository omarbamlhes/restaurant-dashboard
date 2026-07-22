import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantHelper {
  constructor(private prisma: PrismaService) {}

  async getRestaurantId(user: { sub: string; role: string; restaurantId?: string }): Promise<string> {
    if (user.role === UserRole.OWNER) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: user.sub },
      });
      if (!restaurant) throw new UnauthorizedException('لا يوجد مطعم مرتبط بحسابك');
      return restaurant.id;
    }

    // MANAGER / STAFF — use restaurantId from JWT or look it up
    if (user.restaurantId) {
      return user.restaurantId;
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser?.restaurantId) {
      throw new UnauthorizedException('حسابك غير مرتبط بمطعم');
    }
    return dbUser.restaurantId;
  }
}
