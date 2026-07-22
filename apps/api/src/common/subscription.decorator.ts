import { SetMetadata } from '@nestjs/common';

export const REQUIRES_FEATURE_KEY = 'requires_feature';
export const CHECK_ORDER_LIMIT_KEY = 'check_order_limit';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(REQUIRES_FEATURE_KEY, features);

export const CheckOrderLimit = () =>
  SetMetadata(CHECK_ORDER_LIMIT_KEY, true);
