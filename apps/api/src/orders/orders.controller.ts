import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get()
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
    const rid = await this.getRestaurantId(req.user.sub);
    return this.ordersService.findAll(rid, { page, limit, branchId, status, type, from, to });
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateOrderDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.ordersService.create(rid, dto);
  }

  @Get('stats')
  async getStats(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.ordersService.getStats(rid);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.ordersService.findOne(id, rid);
  }

  @Put(':id/status')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.ordersService.updateStatus(id, rid, dto);
  }
}
