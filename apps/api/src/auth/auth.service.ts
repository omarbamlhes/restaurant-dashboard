import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { isValidSaudiTaxNumber } from '../common/zatca';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

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
      include: { restaurant: true, managedRestaurant: true },
    });
    if (!user) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const restaurant = user.restaurant || user.managedRestaurant;
    const { password, ...userWithout } = user;
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      permissions: user.permissions,
    });
    return { token, user: userWithout, restaurant };
  }

  async validateUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true, managedRestaurant: true },
    });
    if (!user) throw new UnauthorizedException();
    const restaurant = user.restaurant || user.managedRestaurant;
    const { password, ...userWithout } = user;
    return { user: userWithout, restaurant };
  }

  async createStaff(ownerId: string, dto: CreateStaffDto) {
    // Find the owner's restaurant
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new ForbiddenException('لا يوجد مطعم مرتبط بحسابك');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد مسجل مسبقا');

    if (dto.role === UserRole.OWNER) {
      throw new ForbiddenException('لا يمكن إنشاء حساب مالك');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        permissions: dto.permissions || [],
        restaurantId: restaurant.id,
      },
    });

    const { password, ...userWithout } = user;
    return userWithout;
  }

  async getStaffAccounts(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new ForbiddenException('لا يوجد مطعم مرتبط بحسابك');

    const staff = await this.prisma.user.findMany({
      where: { restaurantId: restaurant.id },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return staff;
  }

  async updateStaffPermissions(ownerId: string, staffId: string, permissions: string[]) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new ForbiddenException('لا يوجد مطعم مرتبط بحسابك');

    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.restaurantId !== restaurant.id) {
      throw new ForbiddenException('هذا المستخدم لا ينتمي لمطعمك');
    }

    const user = await this.prisma.user.update({
      where: { id: staffId },
      data: { permissions },
    });

    const { password, ...userWithout } = user;
    return userWithout;
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
      include: { restaurant: true, managedRestaurant: true },
    });
    const restaurant = user.restaurant || user.managedRestaurant;
    const { password, ...userWithout } = user;
    return { user: userWithout, restaurant };
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

  async updateRestaurant(userId: string, data: { name?: string; nameAr?: string; phone?: string; email?: string; taxNumber?: string }) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId: userId } });
    if (!restaurant) throw new UnauthorizedException();

    if (data.taxNumber && data.taxNumber.trim() && !isValidSaudiTaxNumber(data.taxNumber.trim())) {
      throw new BadRequestException('الرقم الضريبي غير صحيح. يجب أن يكون 15 رقمًا يبدأ وينتهي بالرقم 3.');
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data,
    });
    return updated;
  }
}
