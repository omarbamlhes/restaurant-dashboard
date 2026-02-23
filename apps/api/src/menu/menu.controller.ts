import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MenuService } from './menu.service';
import { CreateMenuItemDto, UpdateMenuItemDto, CreateCategoryDto } from './dto/create-menu-item.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('menu')
@UseGuards(AuthGuard('jwt'))
export class MenuController {
  constructor(
    private menuService: MenuService,
    private prisma: PrismaService,
  ) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get()
  async findAll(@Request() req, @Query('categoryId') categoryId?: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.findAll(rid, categoryId);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateMenuItemDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.create(rid, dto);
  }

  @Get('categories')
  async getCategories(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.getCategories(rid);
  }

  @Post('categories')
  async createCategory(@Request() req, @Body() dto: CreateCategoryDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.createCategory(rid, dto);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.findOne(id, rid);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.update(id, rid, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.remove(id, rid);
  }

  @Get(':id/profit')
  async getProfitAnalysis(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.menuService.getProfitAnalysis(id, rid);
  }
}
