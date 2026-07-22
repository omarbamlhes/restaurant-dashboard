import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantHelper } from './restaurant.helper';
import { REQUIRES_FEATURE_KEY, CHECK_ORDER_LIMIT_KEY } from './subscription.decorator';
import { PLAN_LIMITS } from '../subscriptions/plan-limits.constant';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private restaurantHelper: RestaurantHelper,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    let restaurantId: string;
    try {
      restaurantId = await this.restaurantHelper.getRestaurantId(user);
    } catch {
      return true;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new ForbiddenException('لا يوجد اشتراك فعال. يرجى الاشتراك أولاً');
    }

    // Check subscription status
    if (subscription.status === 'CANCELED') {
      if (new Date() > subscription.currentPeriodEnd) {
        throw new ForbiddenException('اشتراكك منتهي. يرجى تجديد الاشتراك');
      }
    } else if (subscription.status === 'TRIALING') {
      if (subscription.trialEndsAt && new Date() > subscription.trialEndsAt) {
        throw new ForbiddenException('انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة');
      }
    } else if (subscription.status === 'PAST_DUE') {
      throw new ForbiddenException('يوجد مبلغ مستحق. يرجى تحديث طريقة الدفع');
    } else if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('اشتراكك غير فعال. يرجى تجديد الاشتراك');
    }

    // Check feature access
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      REQUIRES_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredFeatures?.length) {
      const plan = PLAN_LIMITS[subscription.plan];
      if (!plan.features.includes('*')) {
        const hasAccess = requiredFeatures.some(f => plan.features.includes(f));
        if (!hasAccess) {
          throw new ForbiddenException(
            `هذه الميزة متاحة في الباقة الاحترافية أو أعلى. باقتك الحالية: ${plan.nameAr}`,
          );
        }
      }
    }

    // Check order limit
    const checkOrderLimit = this.reflector.getAllAndOverride<boolean>(
      CHECK_ORDER_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (checkOrderLimit) {
      const plan = PLAN_LIMITS[subscription.plan];
      if (plan.maxOrdersPerMonth !== -1) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const branches = await this.prisma.branch.findMany({
          where: { restaurantId },
          select: { id: true },
        });

        const orderCount = await this.prisma.order.count({
          where: {
            branchId: { in: branches.map(b => b.id) },
            createdAt: { gte: startOfMonth },
          },
        });

        if (orderCount >= plan.maxOrdersPerMonth) {
          throw new ForbiddenException(
            `وصلت للحد الأقصى من الطلبات (${plan.maxOrdersPerMonth} طلب/شهر). يرجى ترقية الباقة`,
          );
        }
      }
    }

    return true;
  }
}
