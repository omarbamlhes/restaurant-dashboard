import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { PublicService } from './public.service';
import { CreatePublicOrderDto } from './dto/create-public-order.dto';

@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('menu/:branchId')
  getMenu(@Param('branchId') branchId: string, @Query('tableId') tableId?: string) {
    return this.publicService.getBranchMenu(branchId, tableId);
  }

  @Post('orders/:branchId/:tableId')
  createOrder(
    @Param('branchId') branchId: string,
    @Param('tableId') tableId: string,
    @Body() dto: CreatePublicOrderDto,
  ) {
    return this.publicService.createOrder(branchId, tableId, dto);
  }
}
