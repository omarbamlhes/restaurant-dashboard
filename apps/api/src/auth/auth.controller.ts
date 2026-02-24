import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req) {
    return this.authService.validateUser(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(@Request() req, @Body() body: { name?: string; email?: string; phone?: string }) {
    return this.authService.updateProfile(req.user.sub, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('password')
  async changePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('restaurant')
  async updateRestaurant(@Request() req, @Body() body: { name?: string; nameAr?: string; phone?: string; email?: string }) {
    return this.authService.updateRestaurant(req.user.sub, body);
  }
}
