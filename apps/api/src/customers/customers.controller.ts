import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('customers')
@Roles(UserRole.OWNER, UserRole.MANAGER)
@Permission('customers')
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  async findAll(@Request() req, @Query('search') search?: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.findAll(rid, search);
  }

  @Get('stats')
  async getStats(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.getStats(rid);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.findOne(id, rid);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCustomerDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.create(rid, dto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.update(id, rid, dto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.customersService.delete(id, rid);
  }
}
