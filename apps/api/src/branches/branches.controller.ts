import { Controller, Get, Post, Put, Body, Param, Request } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { Roles } from '../common/roles.decorator';
import { Permission } from '../common/permission.decorator';
import { RestaurantHelper } from '../common/restaurant.helper';

@Controller('branches')
@Permission('branches')
export class BranchesController {
  constructor(
    private branchesService: BranchesService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('branches', 'pos', 'kitchen')
  async findAll(@Request() req) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.branchesService.findAll(rid);
  }

  @Post()
  @Roles(UserRole.OWNER)
  async create(@Request() req, @Body() dto: CreateBranchDto) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.branchesService.create(rid, dto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @Permission('branches', 'pos', 'kitchen')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.branchesService.findOne(id, rid);
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  async update(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateBranchDto>) {
    const rid = await this.restaurantHelper.getRestaurantId(req.user);
    return this.branchesService.update(id, rid, dto);
  }
}
