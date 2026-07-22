import { Controller, Get, Post, Put, Body, Param, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto/create-table.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('tables')
export class TablesController {
  constructor(
    private tablesService: TablesService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('pos', 'orders')
  async findAll(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.tablesService.findAll(rid, branchId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async create(@Request() req, @Body() dto: CreateTableDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.tablesService.create(rid, dto);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.tablesService.update(id, rid, dto);
  }

  @Put(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('pos', 'orders')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateTableStatusDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.tablesService.updateStatus(id, rid, dto);
  }
}
