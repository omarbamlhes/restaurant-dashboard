import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionGuard } from './subscription.guard';
import {
  REQUIRES_FEATURE_KEY,
  CHECK_ORDER_LIMIT_KEY,
  SKIP_SUBSCRIPTION_KEY,
} from './subscription.decorator';

/**
 * Unit tests for the monetization guard. Deps (Reflector, Prisma, helper) are
 * mocked so these run without a DB. This is the path that decides whether a
 * restaurant can use paid features, so it's covered carefully.
 */
describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: any;
  let helper: { getRestaurantId: jest.Mock };

  const RID = 'rest_1';
  const user = { sub: 'u1', role: 'OWNER' };

  // Per-test control over what each reflector key returns.
  let meta: {
    skip?: boolean;
    features?: string[];
    checkOrderLimit?: boolean;
  };

  function context(): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    meta = {};
    reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === SKIP_SUBSCRIPTION_KEY) return meta.skip;
        if (key === REQUIRES_FEATURE_KEY) return meta.features;
        if (key === CHECK_ORDER_LIMIT_KEY) return meta.checkOrderLimit;
        return undefined;
      }),
    };
    prisma = {
      subscription: { findUnique: jest.fn() },
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 'b1' }]) },
      order: { count: jest.fn().mockResolvedValue(0) },
    };
    helper = { getRestaurantId: jest.fn().mockResolvedValue(RID) };
    guard = new SubscriptionGuard(reflector as any, prisma, helper as any);
  });

  const activeSub = (plan: string, extra: Record<string, unknown> = {}) => ({
    plan,
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
    ...extra,
  });

  it('skips the check when @SkipSubscriptionCheck is set', async () => {
    meta.skip = true;
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('allows requests with no authenticated user (other guards handle auth)', async () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({}), getClass: () => ({}),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('blocks when the restaurant has no subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks when the trial has expired', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: 'PRO', status: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 1000),
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    await expect(guard.canActivate(context())).rejects.toThrow(/التجريبية/);
  });

  it('allows an active trial', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: 'PRO', status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86_400_000),
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('blocks a PAST_DUE subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue(activeSub('PRO', { status: 'PAST_DUE' }));
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('feature gating', () => {
    it('blocks BASIC from a PRO-only feature (inventory)', async () => {
      meta.features = ['inventory'];
      prisma.subscription.findUnique.mockResolvedValue(activeSub('BASIC'));
      await expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows PRO to access inventory', async () => {
      meta.features = ['inventory'];
      prisma.subscription.findUnique.mockResolvedValue(activeSub('PRO'));
      await expect(guard.canActivate(context())).resolves.toBe(true);
    });

    it('allows ENTERPRISE (wildcard) any feature', async () => {
      meta.features = ['ai_analytics'];
      prisma.subscription.findUnique.mockResolvedValue(activeSub('ENTERPRISE'));
      await expect(guard.canActivate(context())).resolves.toBe(true);
    });

    it('allows BASIC on a feature it includes (pos)', async () => {
      meta.features = ['pos'];
      prisma.subscription.findUnique.mockResolvedValue(activeSub('BASIC'));
      await expect(guard.canActivate(context())).resolves.toBe(true);
    });
  });

  describe('order limit', () => {
    it('blocks when the monthly order limit is reached (BASIC = 500)', async () => {
      meta.checkOrderLimit = true;
      prisma.subscription.findUnique.mockResolvedValue(activeSub('BASIC'));
      prisma.order.count.mockResolvedValue(500);
      await expect(guard.canActivate(context())).rejects.toThrow(/الأقصى/);
    });

    it('allows when under the limit', async () => {
      meta.checkOrderLimit = true;
      prisma.subscription.findUnique.mockResolvedValue(activeSub('BASIC'));
      prisma.order.count.mockResolvedValue(499);
      await expect(guard.canActivate(context())).resolves.toBe(true);
    });

    it('never limits ENTERPRISE (unlimited orders)', async () => {
      meta.checkOrderLimit = true;
      prisma.subscription.findUnique.mockResolvedValue(activeSub('ENTERPRISE'));
      await expect(guard.canActivate(context())).resolves.toBe(true);
      expect(prisma.order.count).not.toHaveBeenCalled();
    });
  });
});
