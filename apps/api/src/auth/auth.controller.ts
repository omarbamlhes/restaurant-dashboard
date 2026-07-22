import { Controller, Post, Get, Put, Param, Body, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateStaffDto, UpdatePermissionsDto } from './dto/create-staff.dto';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  async me(@Request() req) {
    return this.authService.validateUser(req.user.sub);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() body: { name?: string; email?: string; phone?: string }) {
    return this.authService.updateProfile(req.user.sub, body);
  }

  @Put('password')
  async changePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Roles(UserRole.OWNER)
  @Put('restaurant')
  async updateRestaurant(@Request() req, @Body() body: { name?: string; nameAr?: string; phone?: string; email?: string; taxNumber?: string }) {
    return this.authService.updateRestaurant(req.user.sub, body);
  }

  @Roles(UserRole.OWNER)
  @Get('staff')
  async getStaffAccounts(@Request() req) {
    return this.authService.getStaffAccounts(req.user.sub);
  }

  @Roles(UserRole.OWNER)
  @Post('create-staff')
  async createStaff(@Request() req, @Body() dto: CreateStaffDto) {
    return this.authService.createStaff(req.user.sub, dto);
  }

  @Roles(UserRole.OWNER)
  @Put('staff/:id/permissions')
  async updateStaffPermissions(
    @Request() req,
    @Param('id') staffId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.authService.updateStaffPermissions(req.user.sub, staffId, dto.permissions);
  }
}
