// Loyalty program rules. Kept as constants here so they are easy to tune; a
// future iteration can lift these onto a per-restaurant settings record.

/** Points earned per 1 SAR of order total. */
export const LOYALTY_EARN_RATE = 1;

/** SAR value of a single point when redeemed (100 pts = 5 SAR). */
export const LOYALTY_REDEEM_VALUE = 0.05;

/** Minimum points that can be redeemed in one go. */
export const LOYALTY_MIN_REDEEM = 100;

export interface LoyaltyTier {
  key: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  nameAr: string;
  minPoints: number; // lifetime-points threshold to reach this tier
}

// Ordered ascending by threshold.
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { key: 'BRONZE', nameAr: 'برونزي', minPoints: 0 },
  { key: 'SILVER', nameAr: 'فضي', minPoints: 1000 },
  { key: 'GOLD', nameAr: 'ذهبي', minPoints: 5000 },
  { key: 'PLATINUM', nameAr: 'بلاتيني', minPoints: 15000 },
];

/** Current tier for a lifetime-points total. */
export function getTier(lifetimePoints: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (lifetimePoints >= tier.minPoints) current = tier;
  }
  return current;
}

/** Next tier up, or null if already at the top. */
export function getNextTier(lifetimePoints: number): LoyaltyTier | null {
  return LOYALTY_TIERS.find((t) => t.minPoints > lifetimePoints) ?? null;
}

/** Points awarded for an order of the given total (floored). */
export function pointsForOrder(total: number): number {
  return Math.max(0, Math.floor(total * LOYALTY_EARN_RATE));
}

/** SAR value of a points balance. */
export function pointsValue(points: number): number {
  return Math.round(points * LOYALTY_REDEEM_VALUE * 100) / 100;
}

/** Build the loyalty summary shape returned to clients. */
export function buildLoyaltySummary(loyaltyPoints: number, lifetimePoints: number) {
  const tier = getTier(lifetimePoints);
  const nextTier = getNextTier(lifetimePoints);
  return {
    points: loyaltyPoints,
    lifetimePoints,
    tier,
    nextTier,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - lifetimePoints) : 0,
    redeemableValue: pointsValue(loyaltyPoints),
    minRedeem: LOYALTY_MIN_REDEEM,
    redeemValuePerPoint: LOYALTY_REDEEM_VALUE,
  };
}
