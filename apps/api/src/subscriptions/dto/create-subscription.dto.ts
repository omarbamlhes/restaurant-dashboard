import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlanType, BillingCycle } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;
}

export class UpgradeSubscriptionDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class InitiateCheckoutDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;
}

export class VerifyPaymentDto {
  @IsString()
  paymentId: string;

  @IsString()
  invoiceId: string;
}
