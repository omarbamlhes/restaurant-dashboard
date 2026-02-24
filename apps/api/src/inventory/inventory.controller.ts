import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, UpdateIngredientDto, CreateInventoryLogDto } from './dto/create-ingredient.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private prisma: PrismaService,
  ) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get()
  async findAll(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.inventoryService.findAll(rid);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateIngredientDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.inventoryService.create(rid, dto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.inventoryService.update(id, rid, dto);
  }

  @Post(':id/log')
  async createLog(@Request() req, @Param('id') id: string, @Body() dto: CreateInventoryLogDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.inventoryService.createLog(id, rid, dto);
  }

  @Get(':id/logs')
  async getLogs(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.inventoryService.getLogs(id, rid);
  }
}
