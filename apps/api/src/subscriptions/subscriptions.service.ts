import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanType, BillingCycle } from '@prisma/client';
import { CreateSubscriptionDto, UpgradeSubscriptionDto, InitiateCheckoutDto } from './dto/create-subscription.dto';
import { PLAN_LIMITS, VAT_RATE } from './plan-limits.constant';
import { MoyasarService } from './moyasar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private moyasar: MoyasarService,
    private notifications: NotificationsService,
  ) {}

  getPlans() {
    return Object.entries(PLAN_LIMITS).map(([key, plan]) => ({
      id: key,
      ...plan,
    }));
  }

  async getCurrentSubscription(restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        paymentMethods: true,
      },
    });

    if (!subscription) return null;

    const usage = await this.getUsage(restaurantId);
    const planConfig = PLAN_LIMITS[subscription.plan];

    return {
      ...subscription,
      usage,
      planConfig,
    };
  }

  async subscribe(restaurantId: string, dto: CreateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new BadRequestException('لديك اشتراك فعال بالفعل');
    }

    const plan = PLAN_LIMITS[dto.plan];
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const now = new Date();
    const periodEnd = new Date(now);

    if (billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);

    const price = billingCycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.price;
    const tax = Math.round(price * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((price + tax) * 100) / 100;

    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

    if (existing) {
      const subscription = await this.prisma.subscription.update({
        where: { restaurantId },
        data: {
          plan: dto.plan,
          status: 'TRIALING',
          billingCycle,
          trialEndsAt,
          canceledAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          invoices: {
            create: {
              invoiceNumber,
              amount: price,
              tax,
              totalAmount,
              status: 'DRAFT',
              periodStart: now,
              periodEnd: periodEnd,
            },
          },
        },
        include: { invoices: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return subscription;
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        restaurantId,
        plan: dto.plan,
        status: 'TRIALING',
        billingCycle,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        invoices: {
          create: {
            invoiceNumber,
            amount: price,
            tax,
            totalAmount,
            status: 'DRAFT',
            periodStart: now,
            periodEnd: periodEnd,
          },
        },
      },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return subscription;
  }

  async upgrade(restaurantId: string, dto: UpgradeSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new NotFoundException('لا يوجد اشتراك حالي');
    }

    if (subscription.status === 'CANCELED') {
      throw new BadRequestException('الاشتراك ملغي. يرجى إنشاء اشتراك جديد');
    }

    const planOrder = { BASIC: 0, PRO: 1, ENTERPRISE: 2 };
    if (planOrder[dto.plan] <= planOrder[subscription.plan]) {
      throw new BadRequestException('يمكنك الترقية لباقة أعلى فقط');
    }

    const newPlan = PLAN_LIMITS[dto.plan];
    const billingCycle = dto.billingCycle || subscription.billingCycle;
    const price = billingCycle === BillingCycle.YEARLY ? newPlan.yearlyPrice : newPlan.price;
    const tax = Math.round(price * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((price + tax) * 100) / 100;

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

    const updated = await this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        plan: dto.plan,
        billingCycle,
        invoices: {
          create: {
            invoiceNumber,
            amount: price,
            tax,
            totalAmount,
            status: 'DRAFT',
            periodStart: now,
            periodEnd: subscription.currentPeriodEnd,
          },
        },
      },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return updated;
  }

  async cancel(restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new NotFoundException('لا يوجد اشتراك حالي');
    }

    if (subscription.status === 'CANCELED') {
      throw new BadRequestException('الاشتراك ملغي بالفعل');
    }

    const updated = await this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    const endDateAr = updated.currentPeriodEnd.toLocaleDateString('ar-SA');
    await this.notifySubscriptionEvent(restaurantId, 'canceled', {
      endDate: updated.currentPeriodEnd.toISOString(),
      endDateAr,
    });

    return {
      ...updated,
      message: `سيتم إلغاء اشتراكك في ${endDateAr}`,
    };
  }

  async getInvoices(restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) return [];

    return this.prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUsage(restaurantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const branchIds = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });

    const [ordersThisMonth, totalBranches, totalUsers] = await Promise.all([
      this.prisma.order.count({
        where: {
          branchId: { in: branchIds.map(b => b.id) },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.branch.count({ where: { restaurantId } }),
      this.prisma.user.count({ where: { restaurantId } }),
    ]);

    // Add the owner
    const ownerCount = await this.prisma.user.count({
      where: { restaurant: { id: restaurantId } },
    });

    return {
      ordersThisMonth,
      totalBranches,
      totalUsers: totalUsers + ownerCount,
    };
  }

  async checkFeatureAccess(restaurantId: string, feature: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) return false;

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      return false;
    }

    if (subscription.status === 'TRIALING' && subscription.trialEndsAt) {
      if (new Date() > subscription.trialEndsAt) return false;
    }

    const plan = PLAN_LIMITS[subscription.plan];
    if (plan.features.includes('*')) return true;
    return plan.features.includes(feature);
  }

  async checkResourceLimit(restaurantId: string, resource: 'branch' | 'user' | 'order'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const plan = PLAN_LIMITS[subscription.plan];
    const usage = await this.getUsage(restaurantId);

    const limitMap = {
      branch: { current: usage.totalBranches, limit: plan.maxBranches },
      user: { current: usage.totalUsers, limit: plan.maxUsers },
      order: { current: usage.ordersThisMonth, limit: plan.maxOrdersPerMonth },
    };

    const { current, limit } = limitMap[resource];
    if (limit === -1) return { allowed: true, current, limit: -1 };

    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  // ============ MOYASAR PAYMENT INTEGRATION ============

  getCheckoutConfig() {
    return {
      publishableKey: this.moyasar.getPublishableKey(),
      callbackUrl: this.moyasar.getCallbackUrl(),
    };
  }

  async initiateCheckout(restaurantId: string, dto: InitiateCheckoutDto) {
    const plan = PLAN_LIMITS[dto.plan];
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const price = billingCycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.price;
    const tax = Math.round(price * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((price + tax) * 100) / 100;

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

    // Ensure subscription exists
    let subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          restaurantId,
          plan: dto.plan,
          status: 'TRIALING',
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Create DRAFT invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId: subscription.id,
        amount: price,
        tax,
        totalAmount,
        status: 'UNPAID',
        periodStart: now,
        periodEnd,
      },
    });

    const amountInHalalas = this.moyasar.sarToHalalas(totalAmount);
    const cycleLabel = billingCycle === BillingCycle.YEARLY ? 'سنوي' : 'شهري';
    const description = `اشتراك ${plan.nameAr} - ${cycleLabel}`;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      plan: dto.plan,
      planNameAr: plan.nameAr,
      billingCycle,
      amount: price,
      tax,
      totalAmount,
      amountInHalalas,
      description,
      metadata: {
        restaurantId,
        invoiceId: invoice.id,
        plan: dto.plan,
        billingCycle,
      },
    };
  }

  async confirmPayment(restaurantId: string, paymentId: string, invoiceId: string) {
    // Fetch invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    // Idempotency: already paid
    if (invoice.status === 'PAID') {
      this.logger.log(`Invoice ${invoiceId} already paid, skipping`);
      return this.getCurrentSubscription(restaurantId);
    }

    const isDevMode = !process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET_KEY.includes('YOUR_KEY');
    const isDevPayment = paymentId.startsWith('dev_');

    let payment: any = null;
    let cardType = 'MADA';

    if (!isDevMode && !isDevPayment) {
      // Production: Verify with Moyasar
      payment = await this.moyasar.fetchPayment(paymentId);

      if (payment.status !== 'paid') {
        throw new BadRequestException(`فشل الدفع: ${payment.source?.message || 'عملية غير ناجحة'}`);
      }

      const expectedHalalas = this.moyasar.sarToHalalas(Number(invoice.totalAmount));
      if (payment.amount !== expectedHalalas) {
        this.logger.error(`Amount mismatch: expected ${expectedHalalas}, got ${payment.amount}`);
        throw new BadRequestException('المبلغ المدفوع لا يطابق الفاتورة');
      }

      const companyToCardType: Record<string, string> = {
        mada: 'MADA',
        visa: 'VISA',
        mastercard: 'MASTERCARD',
        master: 'MASTERCARD',
      };
      cardType = companyToCardType[payment.source?.company?.toLowerCase()] || 'VISA';
    } else {
      this.logger.log(`Dev mode payment for invoice ${invoiceId}`);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (invoice.subscription.billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Atomic update: invoice + subscription + payment method
    await this.prisma.$transaction(async (tx) => {
      // Mark invoice as PAID
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: now },
      });

      // Activate subscription
      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: 'ACTIVE',
          paymentGateway: isDevPayment ? null : 'MOYASAR',
          gatewayCustomerId: isDevPayment ? null : paymentId,
          plan: payment?.metadata?.plan as any || invoice.subscription.plan,
          canceledAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // Save payment method if card info available
      const cardNumber = payment?.source?.number;
      if (cardNumber) {
        const last4 = cardNumber.slice(-4);
        const existing = await tx.subPaymentMethod.findFirst({
          where: { subscriptionId: invoice.subscriptionId, last4 },
        });

        if (!existing) {
          await tx.subPaymentMethod.updateMany({
            where: { subscriptionId: invoice.subscriptionId },
            data: { isDefault: false },
          });

          await tx.subPaymentMethod.create({
            data: {
              subscriptionId: invoice.subscriptionId,
              type: cardType as any,
              last4,
              expiry: '',
              isDefault: true,
              gatewayTokenId: payment.source.token || paymentId,
            },
          });
        }
      }
    });

    this.logger.log(`Payment confirmed for invoice ${invoiceId}, subscription activated`);

    const planConfig = PLAN_LIMITS[invoice.subscription.plan];
    await this.notifySubscriptionEvent(restaurantId, 'payment_success', {
      planName: planConfig.name,
      planNameAr: planConfig.nameAr,
    });

    return this.getCurrentSubscription(restaurantId);
  }

  async handleWebhook(webhookData: any) {
    const paymentId = webhookData?.data?.id || webhookData?.id;
    if (!paymentId) {
      this.logger.warn('Webhook received without payment ID');
      return { received: true };
    }

    try {
      const payment = await this.moyasar.fetchPayment(paymentId);

      if (payment.status !== 'paid') {
        this.logger.log(`Webhook for payment ${paymentId}: status=${payment.status}, skipping`);
        return { received: true };
      }

      const invoiceId = payment.metadata?.invoiceId;
      const restaurantId = payment.metadata?.restaurantId;

      if (!invoiceId || !restaurantId) {
        this.logger.warn(`Webhook payment ${paymentId} missing metadata`);
        return { received: true };
      }

      await this.confirmPayment(restaurantId, paymentId, invoiceId);
    } catch (error: any) {
      this.logger.error(`Webhook processing error: ${error.message}`);
    }

    return { received: true };
  }

  // ============ INVOICE DETAILS ============

  async getInvoiceDetails(invoiceId: string, restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new NotFoundException('لا يوجد اشتراك');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, subscriptionId: subscription.id },
      include: {
        subscription: {
          include: {
            restaurant: {
              select: {
                name: true,
                nameAr: true,
                phone: true,
                email: true,
                taxNumber: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    const planConfig = PLAN_LIMITS[invoice.subscription.plan];

    return {
      ...invoice,
      planConfig,
      seller: {
        name: 'Rustaq Restaurant Management',
        nameAr: 'رستق لإدارة المطاعم',
        taxNumber: '300000000000003',
        crNumber: '1010000000',
        address: 'الرياض، المملكة العربية السعودية',
        phone: '+966 11 000 0000',
        email: 'billing@rustaq.sa',
      },
      buyer: {
        name: invoice.subscription.restaurant.name,
        nameAr: invoice.subscription.restaurant.nameAr,
        taxNumber: invoice.subscription.restaurant.taxNumber,
        phone: invoice.subscription.restaurant.phone,
        email: invoice.subscription.restaurant.email,
      },
    };
  }

  // ============ SUBSCRIPTION NOTIFICATIONS ============

  private async notifySubscriptionEvent(
    restaurantId: string,
    event: 'payment_success' | 'canceled' | 'trial_ending',
    extraData?: Record<string, any>,
  ) {
    const messages = {
      payment_success: {
        title: 'Subscription Activated',
        titleAr: 'تم تفعيل الاشتراك',
        message: `Your subscription to the ${extraData?.planName || ''} plan has been activated successfully.`,
        messageAr: `تم تفعيل اشتراكك في باقة ${extraData?.planNameAr || ''} بنجاح.`,
      },
      canceled: {
        title: 'Subscription Canceled',
        titleAr: 'تم إلغاء الاشتراك',
        message: `Your subscription has been canceled. Service continues until ${extraData?.endDate || ''}.`,
        messageAr: `تم إلغاء اشتراكك. ستبقى الخدمة فعالة حتى ${extraData?.endDateAr || ''}.`,
      },
      trial_ending: {
        title: 'Trial Ending Soon',
        titleAr: 'التجربة تنتهي قريباً',
        message: `Your free trial ends in ${extraData?.daysLeft || 3} days. Subscribe now to continue.`,
        messageAr: `تجربتك المجانية تنتهي خلال ${extraData?.daysLeft || 3} أيام. اشترك الآن للمتابعة.`,
      },
    };

    const msg = messages[event];
    try {
      await this.notifications.createForRestaurantOwner(restaurantId, {
        ...msg,
        type: 'PAYMENT_DUE',
        data: extraData,
      });
    } catch (error: any) {
      this.logger.error(`Failed to create notification: ${error.message}`);
    }
  }
}
