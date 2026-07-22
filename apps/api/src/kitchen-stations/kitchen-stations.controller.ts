import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { KitchenStationsService } from './kitchen-stations.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('kitchen-stations')
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Permission('menu')
export class KitchenStationsController {
  constructor(
    private service: KitchenStationsService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('menu', 'pos')
  async findAll(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.service.findAll(rid);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateKitchenStationDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.service.create(rid, dto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateKitchenStationDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.service.update(id, rid, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.service.remove(id, rid);
  }

  @Post(':id/assign')
  async assignItems(@Request() req, @Param('id') id: string, @Body() body: { menuItemIds: string[] }) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.service.assignItems(id, rid, body.menuItemIds);
  }
}
