import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { ReservationsService } from './reservations.service';

@Controller('reservations/public')
export class PublicReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get(':restaurantId')
  async getPublicInfo(@Param('restaurantId') restaurantId: string) {
    return this.reservationsService.getPublicRestaurant(restaurantId);
  }

  @Public()
  @Get(':restaurantId/tables')
  async getPublicTables(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('partySize') partySize: string,
  ) {
    return this.reservationsService.getPublicAvailableTables(branchId, date, time, parseInt(partySize) || 2);
  }

  @Public()
  @Post(':restaurantId')
  async createPublic(
    @Body() body: { branchId: string; tableId: string; customerName: string; customerPhone: string; partySize: number; date: string; time: string; notes?: string },
  ) {
    return this.reservationsService.createPublic(body.branchId, body);
  }
}
