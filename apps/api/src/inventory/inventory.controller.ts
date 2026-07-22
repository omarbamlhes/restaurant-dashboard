import { Controller, Get, Post, Put, Body, Param, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, UpdateIngredientDto, CreateInventoryLogDto } from './dto/create-ingredient.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('inventory')
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Permission('inventory')
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  async findAll(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.inventoryService.findAll(rid);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateIngredientDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.inventoryService.create(rid, dto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.inventoryService.update(id, rid, dto);
  }

  @Post(':id/log')
  async createLog(@Request() req, @Param('id') id: string, @Body() dto: CreateInventoryLogDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.inventoryService.createLog(id, rid, dto);
  }

  @Get(':id/logs')
  async getLogs(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.inventoryService.getLogs(id, rid);
  }
}
