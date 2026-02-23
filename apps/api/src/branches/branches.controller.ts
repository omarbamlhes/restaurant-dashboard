import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('branches')
@UseGuards(AuthGuard('jwt'))
export class BranchesController {
  constructor(private branchesService: BranchesService, private prisma: PrismaService) {}

  private async getRestaurantId(userId: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    return r!.id;
  }

  @Get()
  async findAll(@Request() req) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.branchesService.findAll(rid);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateBranchDto) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.branchesService.create(rid, dto);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.branchesService.findOne(id, rid);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateBranchDto>) {
    const rid = await this.getRestaurantId(req.user.sub);
    return this.branchesService.update(id, rid, dto);
  }
}
