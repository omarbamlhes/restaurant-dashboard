import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PLAN_LIMITS } from '../subscriptions/plan-limits.constant';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-pw'),
  compare: jest.fn(),
}));

/**
 * register() must provision a PRO trial subscription for every new restaurant —
 * without it the (global) SubscriptionGuard would lock out brand-new signups.
 */
describe('AuthService.register', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: { sign: jest.Mock };

  const dto = {
    email: 'new@rest.com',
    password: 'secret123',
    name: 'Owner',
    phone: '0500000000',
    restaurantName: 'R',
    restaurantNameAr: 'مطعم',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'u1', email: dto.email, name: dto.name, role: 'OWNER',
          password: 'hashed-pw', restaurant: { id: 'r1', name: 'R' },
        }),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    service = new AuthService(prisma, jwt as any);
  });

  it('rejects a duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.register(dto as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates the user with a nested PRO TRIALING subscription', async () => {
    await service.register(dto as any);
    const data = prisma.user.create.mock.calls[0][0].data;
    const sub = data.restaurant.create.subscription.create;
    expect(sub.plan).toBe('PRO');
    expect(sub.status).toBe('TRIALING');
    // trialEndsAt should be ~PRO.trialDays in the future
    const days = Math.round((sub.trialEndsAt.getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(PLAN_LIMITS.PRO.trialDays);
  });

  it('returns a token and strips the password from the user', async () => {
    const result = await service.register(dto as any);
    expect(result.token).toBe('jwt-token');
    expect((result.user as any).password).toBeUndefined();
    expect(result.restaurant).toEqual({ id: 'r1', name: 'R' });
  });
});
