import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('employees')
@UseGuards(AuthGuard('jwt'))
export class EmployeesController {
  constructor(
    private employeesService: EmployeesService,
    private prisma: PrismaService,
  ) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.employeesService.findAll(rid, { branchId, role, isActive });
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateEmployeeDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.employeesService.create(rid, dto);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.employeesService.findOne(id, rid);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.employeesService.update(id, rid, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.employeesService.remove(id, rid);
  }
}
