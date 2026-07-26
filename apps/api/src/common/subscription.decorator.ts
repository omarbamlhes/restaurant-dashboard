import { SetMetadata } from '@nestjs/common';

export const REQUIRES_FEATURE_KEY = 'requires_feature';
export const CHECK_ORDER_LIMIT_KEY = 'check_order_limit';
export const SKIP_SUBSCRIPTION_KEY = 'skip_subscription';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(REQUIRES_FEATURE_KEY, features);

export const CheckOrderLimit = () =>
  SetMetadata(CHECK_ORDER_LIMIT_KEY, true);

/**
 * Exempt a route from the subscription check.
 *
 * Required on anything a locked-out user still needs to reach — most
 * importantly the billing endpoints themselves, otherwise an expired
 * subscription can never be renewed.
 */
export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_KEY, true);
