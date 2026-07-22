import { Controller, Get, Post, Put, Body, Param, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('orders')
@Permission('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'kitchen')
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.findAll(rid, { page, limit, branchId, status, type, from, to });
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'pos')
  async create(@Request() req, @Body() dto: CreateOrderDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.create(rid, dto);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getStats(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.getStats(rid);
  }

  @Get('shift-report')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'pos')
  async getShiftReport(
    @Request() req,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.getShiftReport(rid, { from, to, branchId });
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.findOne(id, rid);
  }

  @Get(':id/receipt')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'pos')
  async getReceipt(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.findOneForReceipt(id, rid);
  }

  @Put(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'pos', 'kitchen')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.updateStatus(id, rid, dto);
  }

  @Put(':orderId/items/:itemId/station-status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('orders', 'kitchen')
  async updateItemStationStatus(
    @Request() req,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: { status: string },
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.ordersService.updateItemStationStatus(orderId, itemId, rid, body.status);
  }
}
