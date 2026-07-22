import { Controller, Get, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('analytics')
@Roles(UserRole.OWNER)
@Permission('analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get('overview')
  async getOverview(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getOverview(rid, branchId);
  }

  @Get('sales')
  async getSales(@Request() req, @Query('period') period?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getSales(rid, period, from, to, branchId);
  }

  @Get('profit')
  async getProfitMargins(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getProfitMargins(rid, branchId);
  }

  @Get('peak-hours')
  async getPeakHours(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getPeakHours(rid, branchId);
  }

  @Get('branches-comparison')
  async getBranchComparison(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getBranchComparison(rid);
  }
}
