import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private prisma: PrismaService,
  ) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get('overview')
  async getOverview(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.analyticsService.getOverview(rid);
  }

  @Get('sales')
  async getSales(@Request() req, @Query('period') period?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.analyticsService.getSales(rid, period, from, to);
  }

  @Get('profit')
  async getProfitMargins(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.analyticsService.getProfitMargins(rid);
  }

  @Get('peak-hours')
  async getPeakHours(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.analyticsService.getPeakHours(rid);
  }
}
