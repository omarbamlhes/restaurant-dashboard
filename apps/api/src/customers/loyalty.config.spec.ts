import {
  getTier,
  getNextTier,
  pointsForOrder,
  pointsValue,
  buildLoyaltySummary,
  LOYALTY_MIN_REDEEM,
  LOYALTY_REDEEM_VALUE,
} from './loyalty.config';

describe('getTier', () => {
  it('returns BRONZE at zero and below the first threshold', () => {
    expect(getTier(0).key).toBe('BRONZE');
    expect(getTier(999).key).toBe('BRONZE');
  });

  it('promotes exactly at each threshold', () => {
    expect(getTier(1000).key).toBe('SILVER');
    expect(getTier(5000).key).toBe('GOLD');
    expect(getTier(15000).key).toBe('PLATINUM');
  });

  it('stays PLATINUM beyond the top threshold', () => {
    expect(getTier(999999).key).toBe('PLATINUM');
  });
});

describe('getNextTier', () => {
  it('points to the next tier up', () => {
    expect(getNextTier(0)?.key).toBe('SILVER');
    expect(getNextTier(1000)?.key).toBe('GOLD');
    expect(getNextTier(5000)?.key).toBe('PLATINUM');
  });

  it('returns null at the top tier', () => {
    expect(getNextTier(15000)).toBeNull();
    expect(getNextTier(20000)).toBeNull();
  });
});

describe('pointsForOrder', () => {
  it('earns 1 point per SAR, floored', () => {
    expect(pointsForOrder(100)).toBe(100);
    expect(pointsForOrder(99.9)).toBe(99);
  });

  it('never returns negative', () => {
    expect(pointsForOrder(-50)).toBe(0);
    expect(pointsForOrder(0)).toBe(0);
  });
});

describe('pointsValue', () => {
  it('values 100 points at 5 SAR', () => {
    expect(pointsValue(100)).toBe(5);
    expect(LOYALTY_REDEEM_VALUE).toBe(0.05);
  });

  it('rounds to 2 decimals', () => {
    expect(pointsValue(33)).toBe(1.65);
    expect(pointsValue(1)).toBe(0.05);
  });
});

describe('buildLoyaltySummary', () => {
  it('summarises balance, tier and progress', () => {
    const s = buildLoyaltySummary(250, 1200);
    expect(s.points).toBe(250);
    expect(s.lifetimePoints).toBe(1200);
    expect(s.tier.key).toBe('SILVER');
    expect(s.nextTier?.key).toBe('GOLD');
    expect(s.pointsToNextTier).toBe(5000 - 1200);
    expect(s.redeemableValue).toBe(pointsValue(250));
    expect(s.minRedeem).toBe(LOYALTY_MIN_REDEEM);
  });

  it('reports zero remaining at the top tier', () => {
    const s = buildLoyaltySummary(0, 20000);
    expect(s.tier.key).toBe('PLATINUM');
    expect(s.nextTier).toBeNull();
    expect(s.pointsToNextTier).toBe(0);
  });
});
