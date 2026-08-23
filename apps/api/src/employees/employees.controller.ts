import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';
import { RequiresFeature } from '../common/subscription.decorator';

@RequiresFeature('employees')
@Controller('employees')
@Permission('employees')
export class EmployeesController {
  constructor(
    private employeesService: EmployeesService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findAll(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.findAll(rid, { branchId, role, isActive });
  }

  @Post()
  @Roles(UserRole.OWNER)
  async create(@Request() req, @Body() dto: CreateEmployeeDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.create(rid, dto);
  }

  @Get('attendance')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async attendance(@Request() req, @Query('date') date?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.getAttendance(rid, date);
  }

  @Post(':id/check-in')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async checkIn(@Request() req, @Param('id') id: string, @Body('note') note?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.checkIn(id, rid, note);
  }

  @Post(':id/check-out')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async checkOut(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.checkOut(id, rid);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.findOne(id, rid);
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.update(id, rid, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.employeesService.remove(id, rid);
  }
}
