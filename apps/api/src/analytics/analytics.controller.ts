import { Controller, Get, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';
import { RequiresFeature } from '../common/subscription.decorator';

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
  @RequiresFeature('reports_advanced')
  async getProfitMargins(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getProfitMargins(rid, branchId);
  }

  @Get('peak-hours')
  @RequiresFeature('reports_advanced')
  async getPeakHours(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getPeakHours(rid, branchId);
  }

  @Get('branches-comparison')
  @RequiresFeature('reports_advanced')
  async getBranchComparison(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getBranchComparison(rid);
  }

  @Get('insights')
  @RequiresFeature('reports_advanced')
  async getInsights(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getInsights(rid, branchId);
  }

  @Get('prayer-gap')
  @RequiresFeature('reports_advanced')
  async getPrayerGap(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.analyticsService.getPrayerGap(rid, branchId);
  }
}
