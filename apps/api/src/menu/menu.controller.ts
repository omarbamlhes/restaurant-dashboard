import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, CreateCategoryDto } from './dto/create-menu-item.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('menu')
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Permission('menu')
export class MenuController {
  constructor(
    private menuService: MenuService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('menu', 'pos')
  async findAll(@Request() req, @Query('categoryId') categoryId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.findAll(rid, categoryId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateMenuItemDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.create(rid, dto);
  }

  @Get('categories')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('menu', 'pos')
  async getCategories(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.getCategories(rid);
  }

  @Post('categories')
  async createCategory(@Request() req, @Body() dto: CreateCategoryDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.createCategory(rid, dto);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.findOne(id, rid);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.update(id, rid, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.remove(id, rid);
  }

  @Get(':id/profit')
  async getProfitAnalysis(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.menuService.getProfitAnalysis(id, rid);
  }
}
