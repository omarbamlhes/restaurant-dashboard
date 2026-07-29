// Presentation config for loyalty tiers. The API is the source of truth for
// tier thresholds & names (see apps/api/src/customers/loyalty.config.ts); this
// only maps a tier key to its badge styling for the UI.

export type LoyaltyTierKey = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierStyle {
  nameAr: string;
  badgeClass: string; // pill bg + text (light & dark)
  ringClass: string; // avatar ring accent
  gradient: string; // hero card gradient
}

export const TIER_STYLES: Record<LoyaltyTierKey, TierStyle> = {
  BRONZE: {
    nameAr: 'برونزي',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    ringClass: 'ring-orange-300',
    gradient: 'from-orange-500/90 to-amber-700/90',
  },
  SILVER: {
    nameAr: 'فضي',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
    ringClass: 'ring-slate-300',
    gradient: 'from-slate-400/90 to-slate-600/90',
  },
  GOLD: {
    nameAr: 'ذهبي',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    ringClass: 'ring-amber-300',
    gradient: 'from-amber-400/90 to-yellow-600/90',
  },
  PLATINUM: {
    nameAr: 'بلاتيني',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    ringClass: 'ring-violet-300',
    gradient: 'from-violet-500/90 to-indigo-700/90',
  },
};

export function tierStyle(key: string): TierStyle {
  return TIER_STYLES[key as LoyaltyTierKey] ?? TIER_STYLES.BRONZE;
}

export interface LoyaltyTxn {
  id: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST';
  points: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export interface LoyaltySummary {
  points: number;
  lifetimePoints: number;
  tier: { key: string; nameAr: string; minPoints: number };
  nextTier: { key: string; nameAr: string; minPoints: number } | null;
  pointsToNextTier: number;
  redeemableValue: number;
  minRedeem: number;
  redeemValuePerPoint: number;
  history: LoyaltyTxn[];
}

export const TXN_TYPE_LABELS: Record<string, string> = {
  EARN: 'اكتساب',
  REDEEM: 'استبدال',
  ADJUST: 'تعديل',
};
