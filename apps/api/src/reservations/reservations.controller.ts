import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { UserRole } from '@prisma/client';
import { RestaurantHelper } from '../common/restaurant.helper';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/create-reservation.dto';

@Controller('reservations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('tables', 'pos')
  async findAll(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.reservationsService.findAll(rid, { branchId, date, status });
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('tables', 'pos')
  async getStats(@Request() req, @Query('branchId') branchId?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.reservationsService.getStats(rid, branchId);
  }

  @Get('available-tables')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('tables', 'pos')
  async getAvailableTables(
    @Request() req,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('partySize') partySize: string,
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.reservationsService.getAvailableTables(rid, branchId, date, time, parseInt(partySize) || 2);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('tables', 'pos')
  async create(@Request() req, @Body() dto: CreateReservationDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.reservationsService.create(rid, dto);
  }

  @Put(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('tables', 'pos')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.reservationsService.updateStatus(id, rid, dto);
  }

}
