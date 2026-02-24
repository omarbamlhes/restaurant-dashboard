import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد مسجل مسبقا');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        restaurant: {
          create: {
            name: dto.restaurantName,
            nameAr: dto.restaurantNameAr,
            branches: {
              create: { name: 'Main Branch', nameAr: 'الفرع الرئيسي', isMain: true },
            },
          },
        },
      },
      include: { restaurant: true },
    });

    const { password, ...userWithout } = user;
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: userWithout, restaurant: user.restaurant };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { restaurant: true },
    });
    if (!user) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const { password, ...userWithout } = user;
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: userWithout, restaurant: user.restaurant };
  }

  async validateUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    if (!user) throw new UnauthorizedException();
    const { password, ...userWithout } = user;
    return { user: userWithout, restaurant: user.restaurant };
  }

  async updateProfile(id: string, data: { name?: string; email?: string; phone?: string }) {
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existing) throw new ConflictException('البريد مستخدم بالفعل');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { restaurant: true },
    });
    const { password, ...userWithout } = user;
    return { user: userWithout, restaurant: user.restaurant };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  async updateRestaurant(userId: string, data: { name?: string; nameAr?: string; phone?: string; email?: string }) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    if (!restaurant) throw new UnauthorizedException();

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data,
    });
    return updated;
  }
}
